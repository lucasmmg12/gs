import { createStore, set, values, del } from 'idb-keyval';
import { supabase } from './supabase';

export interface AudioChunkRecord {
  id: string; // `${sessionId}_${index}`
  sessionId: string;
  chunkIndex: number;
  timestamp: number;
  activeQuestionId?: string | number;
  activeQuestionTitle?: string;
  blob: Blob;
  sizeBytes: number;
  uploaded: boolean;
  storagePath?: string;
  error?: string;
}

// Dedicated IndexedDB store for audio chunks to avoid data loss during >1h meetings
const audioDbStore = createStore('gs_recording_db', 'interview_chunks');

/**
 * Persists a 30s chunk to IndexedDB immediately.
 * Guaranteed against browser crashes or network loss.
 */
export async function saveLocalChunk(
  sessionId: string,
  chunkIndex: number,
  blob: Blob,
  activeQuestionId?: string | number,
  activeQuestionTitle?: string
): Promise<AudioChunkRecord> {
  const record: AudioChunkRecord = {
    id: `${sessionId}_chunk_${chunkIndex}`,
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
 * Uploads a chunk to Supabase Storage 'gobernanza_audios' in background.
 * Updates the IndexedDB record with upload status.
 */
export async function uploadChunkToStorage(
  record: AudioChunkRecord
): Promise<{ success: boolean; storagePath?: string; error?: string }> {
  try {
    const storagePath = `${record.sessionId}/chunk_${String(record.chunkIndex).padStart(4, '0')}.webm`;

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
export async function getSessionChunks(sessionId: string): Promise<AudioChunkRecord[]> {
  try {
    const all = await values<AudioChunkRecord>(audioDbStore);
    return (all || [])
      .filter(item => item && item.sessionId === sessionId)
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
  onProgress?: (synced: number, total: number) => void
): Promise<{ total: number; synced: number; failed: number }> {
  const chunks = await getSessionChunks(sessionId);
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
export async function compileSessionAudioBlob(sessionId: string): Promise<Blob> {
  const chunks = await getSessionChunks(sessionId);
  if (chunks.length === 0) {
    throw new Error('No chunks found for session ' + sessionId);
  }
  const blobParts = chunks.map(c => c.blob);
  return new Blob(blobParts, { type: 'audio/webm;codecs=opus' });
}

/**
 * Clears session chunks from IndexedDB after successful processing.
 */
export async function clearSessionChunks(sessionId: string): Promise<void> {
  const chunks = await getSessionChunks(sessionId);
  for (const c of chunks) {
    await del(c.id, audioDbStore);
  }
}
