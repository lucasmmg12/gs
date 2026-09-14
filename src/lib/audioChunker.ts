import { createStore, set, values, del } from 'idb-keyval';
import { supabase } from './supabase';

export interface AudioChunkRecord {
  id: string; // `client_${clientId}_session_${sessionId}_chunk_${chunkIndex}`
  clientId: string; // ID único e inmutable del cliente (id_cliente)
  sessionId: string;
  chunkIndex: number;
  timestamp: number;
  activeQuestionId?: string | number;
  activeQuestionTitle?: string;
  blob: Blob;
  sizeBytes: number;
  uploaded: boolean;
  storagePath?: string;
  transcribed?: boolean;
  transcription?: string;
  error?: string;
}

// Dedicated IndexedDB store for audio chunks to avoid data loss during >1h meetings
const audioDbStore = createStore('gs_recording_db', 'interview_chunks');

/**
 * Persists a 30s chunk to IndexedDB immediately, strictly indexed by clientId.
 * Guaranteed against browser crashes or network loss.
 */
export async function saveLocalChunk(
  clientId: string,
  sessionId: string,
  chunkIndex: number,
  blob: Blob,
  activeQuestionId?: string | number,
  activeQuestionTitle?: string
): Promise<AudioChunkRecord> {
  const record: AudioChunkRecord = {
    id: `client_${clientId}_session_${sessionId}_chunk_${chunkIndex}`,
    clientId,
    sessionId,
    chunkIndex,
    timestamp: Date.now(),
    activeQuestionId,
    activeQuestionTitle,
    blob,
    sizeBytes: blob.size,
    uploaded: false
  };

  await set(record.id, record, audioDbStore);
  return record;
}

/**
 * Uploads a chunk to Supabase Storage 'gobernanza_audios' under client-isolated directory.
 * Path format: gobernanza_audios/${clientId}/${sessionId}/chunk_XXXX.webm
 */
export async function uploadChunkToStorage(
  record: AudioChunkRecord
): Promise<{ success: boolean; storagePath?: string; error?: string }> {
  try {
    const storagePath = `${record.clientId}/${record.sessionId}/chunk_${String(record.chunkIndex).padStart(4, '0')}.webm`;

    const { error: uploadErr } = await supabase.storage
      .from('gobernanza_audios')
      .upload(storagePath, record.blob, {
        contentType: 'audio/webm;codecs=opus',
        upsert: true
      });

    if (uploadErr) {
      console.warn(`[AudioChunker] Chunk ${record.chunkIndex} upload failed:`, uploadErr.message);
      record.uploaded = false;
      record.error = uploadErr.message;
      await set(record.id, record, audioDbStore);
      return { success: false, error: uploadErr.message };
    }

    record.uploaded = true;
    record.storagePath = storagePath;
    record.error = undefined;
    await set(record.id, record, audioDbStore);
    return { success: true, storagePath };
  } catch (err: any) {
    record.uploaded = false;
    record.error = err?.message || 'Error de red';
    await set(record.id, record, audioDbStore);
    return { success: false, error: record.error };
  }
}

/**
 * Retrieves all stored chunks for a given session sorted by chunkIndex.
 */
export async function getSessionChunks(sessionId: string, clientId?: string): Promise<AudioChunkRecord[]> {
  try {
    const all = await values<AudioChunkRecord>(audioDbStore);
    return (all || [])
      .filter(item => item && item.sessionId === sessionId && (!clientId || item.clientId === clientId))
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  } catch (err) {
    console.error('[AudioChunker] Failed to read chunks from IndexedDB:', err);
    return [];
  }
}

/**
 * Attempts to re-upload any pending/un-uploaded chunks for the session.
 */
export async function syncPendingChunks(
  sessionId: string,
  clientId?: string,
  onProgress?: (synced: number, total: number) => void
): Promise<{ total: number; synced: number; failed: number }> {
  const chunks = await getSessionChunks(sessionId, clientId);
  const pending = chunks.filter(c => !c.uploaded);
  let synced = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i++) {
    const chunk = pending[i];
    const res = await uploadChunkToStorage(chunk);
    if (res.success) {
      synced++;
    } else {
      failed++;
    }
    if (onProgress) {
      onProgress(synced, pending.length);
    }
  }

  return { total: pending.length, synced, failed };
}

/**
 * Combines all recorded chunks into a single monolithic Blob for final playback or backup download.
 */
export async function compileSessionAudioBlob(sessionId: string, clientId?: string): Promise<Blob> {
  const chunks = await getSessionChunks(sessionId, clientId);
  if (chunks.length === 0) {
    throw new Error('No chunks found for session ' + sessionId);
  }
  const blobParts = chunks.map(c => c.blob);
  return new Blob(blobParts, { type: 'audio/webm;codecs=opus' });
}

/**
 * Clears session chunks from IndexedDB after successful processing.
 */
export async function clearSessionChunks(sessionId: string, clientId?: string): Promise<void> {
  const chunks = await getSessionChunks(sessionId, clientId);
  for (const c of chunks) {
    await del(c.id, audioDbStore);
  }
}

/**
 * Sends an audio chunk to the Supabase Edge Function 'transcribe-chunk' for live Whisper
 * transcription and real-time database persistence in 'gobernanza_audio_chunks' & 'gobernanza_entrevistas'.
 */
export async function sendChunkToEdgeTranscriber(
  record: AudioChunkRecord,
  meta?: {
    questionId?: string;
    questionTitle?: string;
    meetingTitle?: string;
    durationSeconds?: number;
  }
): Promise<{
  success: boolean;
  transcription?: string;
  accumulatedTranscript?: string;
  storagePath?: string;
  error?: string;
}> {
  try {
    const formData = new FormData();
    formData.append('file', record.blob, `chunk_${record.chunkIndex}.webm`);
    formData.append('sessionId', record.sessionId);
    formData.append('clientId', record.clientId);
    formData.append('chunkIndex', String(record.chunkIndex));
    
    if (record.storagePath) {
      formData.append('storagePath', record.storagePath);
    }
    if (meta?.questionId || record.activeQuestionId) {
      formData.append('questionId', String(meta?.questionId || record.activeQuestionId));
    }
    if (meta?.questionTitle || record.activeQuestionTitle) {
      formData.append('questionTitle', meta?.questionTitle || record.activeQuestionTitle || '');
    }
    if (meta?.meetingTitle) {
      formData.append('meetingTitle', meta.meetingTitle);
    }
    if (meta?.durationSeconds) {
      formData.append('durationSeconds', String(meta.durationSeconds));
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const res = await fetch(`${supabaseUrl}/functions/v1/transcribe-chunk`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      },
      body: formData
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Edge error HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    
    record.transcribed = true;
    record.transcription = data.transcription || '';
    if (data.storagePath) {
      record.storagePath = data.storagePath;
      record.uploaded = true;
    }
    await set(record.id, record, audioDbStore);

    return {
      success: true,
      transcription: data.transcription || '',
      accumulatedTranscript: data.accumulatedTranscript || '',
      storagePath: data.storagePath
    };
  } catch (err: any) {
    console.warn(`[AudioChunker] sendChunkToEdgeTranscriber failed for chunk ${record.chunkIndex}:`, err.message);
    return {
      success: false,
      error: err.message || 'Error de transcripción en Edge Function'
    };
  }
}
