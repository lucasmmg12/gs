import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import { requestScreenWakeLock, releaseScreenWakeLock } from './wakeLock';
import {
  saveLocalChunk,
  uploadChunkToStorage,
  compileSessionAudioBlob,
  getSessionChunks,
  sendChunkToEdgeTranscriber,
  getCompatibleAudioMimeType,
} from './audioChunker';
import { WhisperLiveStreamer, type LiveStreamStatus } from './whisperLiveStream';

export type PersistentRecorderStatus = 'idle' | 'starting' | 'recording' | 'paused';

export interface PersistentSessionSnapshot {
  sessionId: string;
  clientId: string;
  clientName: string;
  meetingTitle: string;
  meetingType: string;
  status: PersistentRecorderStatus;
  duration: number;
  chunksCount: number;
  syncedChunks: number;
  liveTranscript: string;
  interimText: string;
  streamStatus: LiveStreamStatus;
  micError: string | null;
  compiledAudioUrl: string | null;
  lastSavedAt: string | null;
}

interface PersistedDraftPayload {
  sessionId: string;
  clientId: string;
  clientName: string;
  meetingTitle: string;
  meetingType: string;
  duration: number;
  chunksCount: number;
  syncedChunks: number;
  liveTranscript: string;
  updatedAt: string;
}

const DRAFT_PREFIX = 'gs_recording_draft_v2_';

function getDraftKey(clientId: string): string {
  return `${DRAFT_PREFIX}${clientId}`;
}

class PersistentRecordingManager {
  private state: PersistentSessionSnapshot = {
    sessionId: crypto.randomUUID(),
    clientId: '',
    clientName: '',
    meetingTitle: '',
    meetingType: 'diagnostico',
    status: 'idle',
    duration: 0,
    chunksCount: 0,
    syncedChunks: 0,
    liveTranscript: '',
    interimText: '',
    streamStatus: 'idle',
    micError: null,
    compiledAudioUrl: null,
    lastSavedAt: null,
  };

  private listeners = new Set<() => void>();
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private liveStreamer: WhisperLiveStreamer | null = null;
  private realtimeChannel: any = null;
  private tickTimer: any = null;
  private cloudSyncTimer: any = null;
  private chunkIndex = 0;

  // Wall-clock accurate timing (immune to background browser tab throttling)
  private baseDurationSeconds = 0;
  private segmentStartMs: number | null = null;
  private globalsRegistered = false;

  constructor() {
    this.registerBrowserLifecycleGuards();
  }

  private registerBrowserLifecycleGuards() {
    if (this.globalsRegistered || typeof window === 'undefined') return;
    this.globalsRegistered = true;

    // 1. Flush audio chunk & persist draft whenever user switches browser tabs or minimizes
    document.addEventListener('visibilitychange', () => {
      if (this.state.status === 'recording') {
        this.recalculateWallClockDuration();
        this.flushActiveMediaRecorderBuffer();
        this.saveDraftLocally();
        this.syncDraftToSupabase('grabando');
      } else if (document.visibilityState === 'visible' && this.audioContext?.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
    });

    // 2. Warn & flush if user accidentally reloads/closes browser tab while recording
    window.addEventListener('beforeunload', (e) => {
      if (this.state.status === 'recording') {
        this.recalculateWallClockDuration();
        this.flushActiveMediaRecorderBuffer();
        this.saveDraftLocally();
        e.preventDefault();
        e.returnValue = 'Hay una grabación de sesión en curso. Tu avance ya fue respaldado, ¿deseas salir?';
      } else if (this.state.liveTranscript.trim() || this.state.duration > 0) {
        this.saveDraftLocally();
      }
    });
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public getSnapshot = (): PersistentSessionSnapshot => {
    return this.state;
  };

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyser;
  }

  private setState(patch: Partial<PersistentSessionSnapshot>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  private recalculateWallClockDuration() {
    if (this.segmentStartMs !== null) {
      const elapsed = Math.max(0, Math.floor((Date.now() - this.segmentStartMs) / 1000));
      const total = this.baseDurationSeconds + elapsed;
      if (total !== this.state.duration) {
        this.setState({ duration: total });
      }
    }
  }

  private flushActiveMediaRecorderBuffer() {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.requestData();
      }
    } catch {
      // Ignore if browser doesn't need manual flush at this ms
    }
  }

  public saveDraftLocally() {
    if (!this.state.clientId) return;
    if (!this.state.liveTranscript.trim() && this.state.duration === 0 && this.state.chunksCount === 0) {
      return;
    }
    const nowIso = new Date().toISOString();
    const payload: PersistedDraftPayload = {
      sessionId: this.state.sessionId,
      clientId: this.state.clientId,
      clientName: this.state.clientName,
      meetingTitle: this.state.meetingTitle,
      meetingType: this.state.meetingType,
      duration: this.state.duration,
      chunksCount: this.state.chunksCount,
      syncedChunks: this.state.syncedChunks,
      liveTranscript: this.state.liveTranscript,
      updatedAt: nowIso,
    };
    try {
      localStorage.setItem(getDraftKey(this.state.clientId), JSON.stringify(payload));
      if (this.state.lastSavedAt !== nowIso) {
        this.state = { ...this.state, lastSavedAt: nowIso };
      }
    } catch (err) {
      console.warn('[PersistentRecorder] Local draft save warning:', err);
    }
  }

  public clearClientDraft(clientId: string) {
    try {
      localStorage.removeItem(getDraftKey(clientId));
    } catch {
      // Ignore
    }
  }

  public async syncDraftToSupabase(estado: 'grabando' | 'en_pausa' = 'en_pausa') {
    if (!this.state.clientId || !this.state.sessionId) return;
    const text = (this.state.liveTranscript + (this.state.interimText ? ` ${this.state.interimText}` : '')).trim();
    if (!text && this.state.duration === 0 && estado === 'en_pausa') return;

    try {
      await (supabase.from('gobernanza_entrevistas') as any).upsert(
        {
          id: this.state.sessionId,
          client_id: this.state.clientId,
          meeting_type: this.state.meetingType || 'diagnostico',
          titulo: this.state.meetingTitle || `Sesión - ${this.state.clientName}`,
          estado,
          live_status: estado === 'grabando' ? 'recording' : 'paused',
          duracion_segundos: this.state.duration,
          transcripcion_raw: text,
          transcripcion: text,
        },
        { onConflict: 'id' }
      );
    } catch (err) {
      console.warn('[PersistentRecorder] Cloud draft sync notice:', err);
    }
  }

  /**
   * Initializes or restores a client's active/paused session when entering ClientMeetingSession.
   * Never interrupts an active recording!
   */
  public async ensureClientContext(params: {
    clientId: string;
    clientName: string;
    defaultTitle: string;
    meetingType: string;
  }): Promise<void> {
    // If currently recording for ANY client, do not clobber the active mic session!
    if (this.state.status === 'recording' || this.state.status === 'starting') {
      return;
    }

    // If already loaded in memory for this exact client with content, keep it!
    if (
      this.state.clientId === params.clientId &&
      (this.state.duration > 0 || this.state.liveTranscript.trim().length > 0 || this.state.chunksCount > 0)
    ) {
      return;
    }

    // Check if there is a saved local draft for this client
    try {
      const raw = localStorage.getItem(getDraftKey(params.clientId));
      if (raw) {
        const draft: PersistedDraftPayload = JSON.parse(raw);
        if (draft && draft.sessionId && (draft.liveTranscript?.trim() || draft.duration > 0 || draft.chunksCount > 0)) {
          const existingChunks = await getSessionChunks(draft.sessionId, params.clientId);
          this.chunkIndex = existingChunks.length > 0 ? existingChunks[existingChunks.length - 1].chunkIndex + 1 : draft.chunksCount || 0;
          this.baseDurationSeconds = draft.duration || 0;
          this.segmentStartMs = null;

          let previewUrl: string | null = null;
          if (existingChunks.length > 0) {
            try {
              const blob = await compileSessionAudioBlob(draft.sessionId, params.clientId);
              if (blob.size > 0) previewUrl = URL.createObjectURL(blob);
            } catch {
              // Ignore preview compile error
            }
          }

          this.setState({
            sessionId: draft.sessionId,
            clientId: params.clientId,
            clientName: params.clientName,
            meetingTitle: draft.meetingTitle || params.defaultTitle,
            meetingType: draft.meetingType || params.meetingType,
            status: 'paused',
            duration: draft.duration || 0,
            chunksCount: Math.max(draft.chunksCount || 0, existingChunks.length),
            syncedChunks: draft.syncedChunks || existingChunks.filter((c) => c.uploaded).length,
            liveTranscript: draft.liveTranscript || '',
            interimText: '',
            streamStatus: 'idle',
            micError: null,
            compiledAudioUrl: previewUrl,
            lastSavedAt: draft.updatedAt || null,
          });
          return;
        }
      }
    } catch (e) {
      console.warn('[PersistentRecorder] Draft restore notice:', e);
    }

    // Also check Supabase for any unfinished ('grabando' or 'en_pausa') session for this client
    try {
      const { data: openSession } = await (supabase.from('gobernanza_entrevistas') as any)
        .select('*')
        .eq('client_id', params.clientId)
        .in('estado', ['grabando', 'en_pausa'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openSession && (openSession.transcripcion || openSession.transcripcion_raw || openSession.duracion_segundos > 0)) {
        const existingChunks = await getSessionChunks(openSession.id, params.clientId);
        this.chunkIndex = existingChunks.length > 0 ? existingChunks[existingChunks.length - 1].chunkIndex + 1 : 0;
        this.baseDurationSeconds = openSession.duracion_segundos || 0;
        this.segmentStartMs = null;

        this.setState({
          sessionId: openSession.id,
          clientId: params.clientId,
          clientName: params.clientName,
          meetingTitle: openSession.titulo || params.defaultTitle,
          meetingType: openSession.meeting_type || params.meetingType,
          status: 'paused',
          duration: openSession.duracion_segundos || 0,
          chunksCount: existingChunks.length,
          syncedChunks: existingChunks.filter((c) => c.uploaded).length,
          liveTranscript: openSession.transcripcion || openSession.transcripcion_raw || '',
          interimText: '',
          streamStatus: 'idle',
          micError: null,
          compiledAudioUrl: null,
          lastSavedAt: openSession.created_at || null,
        });
        this.saveDraftLocally();
        return;
      }
    } catch {
      // Ignore network error
    }

    // Otherwise initialize a clean idle session for this client
    this.chunkIndex = 0;
    this.baseDurationSeconds = 0;
    this.segmentStartMs = null;
    this.setState({
      sessionId: crypto.randomUUID(),
      clientId: params.clientId,
      clientName: params.clientName,
      meetingTitle: params.defaultTitle,
      meetingType: params.meetingType,
      status: 'idle',
      duration: 0,
      chunksCount: 0,
      syncedChunks: 0,
      liveTranscript: '',
      interimText: '',
      streamStatus: 'idle',
      micError: null,
      compiledAudioUrl: null,
      lastSavedAt: null,
    });
  }

  /**
   * Loads any historical or paused session so the consultant can continue recording on top of it!
   */
  public async loadExistingSessionToContinue(session: {
    id: string;
    clientId: string;
    clientName: string;
    title: string;
    meetingType?: string;
    transcript?: string;
    durationSeconds?: number;
  }): Promise<void> {
    if (this.state.status === 'recording') {
      await this.pauseRecording();
    }

    const existingChunks = await getSessionChunks(session.id, session.clientId);
    this.chunkIndex = existingChunks.length > 0 ? existingChunks[existingChunks.length - 1].chunkIndex + 1 : 0;
    this.baseDurationSeconds = session.durationSeconds || 0;
    this.segmentStartMs = null;

    let previewUrl: string | null = null;
    if (existingChunks.length > 0) {
      try {
        const blob = await compileSessionAudioBlob(session.id, session.clientId);
        if (blob.size > 0) previewUrl = URL.createObjectURL(blob);
      } catch {
        // Ignore
      }
    }

    this.setState({
      sessionId: session.id,
      clientId: session.clientId,
      clientName: session.clientName,
      meetingTitle: session.title,
      meetingType: session.meetingType || 'diagnostico',
      status: 'paused',
      duration: session.durationSeconds || 0,
      chunksCount: existingChunks.length,
      syncedChunks: existingChunks.filter((c) => c.uploaded).length,
      liveTranscript: session.transcript || '',
      interimText: '',
      streamStatus: 'idle',
      micError: null,
      compiledAudioUrl: previewUrl,
      lastSavedAt: new Date().toISOString(),
    });
    this.saveDraftLocally();
  }

  public updateMeetingTitle(title: string) {
    this.setState({ meetingTitle: title });
    this.saveDraftLocally();
  }

  public updateTranscriptManually(text: string) {
    this.setState({ liveTranscript: text, interimText: '' });
    this.saveDraftLocally();
  }

  public appendTranscriptSegment(segment: string) {
    const clean = segment.trim();
    if (!clean) return;
    const prev = this.state.liveTranscript.trim();
    // Avoid duplicating exact tail sentences when Whisper & WebSpeech overlap
    if (prev.endsWith(clean)) return;
    const next = prev ? `${prev} ${clean}` : clean;
    this.setState({ liveTranscript: next });
    this.saveDraftLocally();
  }

  /**
   * Starts a new recording OR resumes/continues an existing paused conversation seamlessly!
   */
  public async startOrResumeRecording(params?: {
    clientId?: string;
    clientName?: string;
    meetingTitle?: string;
    meetingType?: string;
  }): Promise<void> {
    if (this.state.status === 'recording' || this.state.status === 'starting') return;

    const targetClientId = params?.clientId || this.state.clientId;
    const targetClientName = params?.clientName || this.state.clientName;

    // If switching from another paused client, reset context cleanly first
    const isContinuingSameClient = targetClientId === this.state.clientId;
    const activeSessionId = isContinuingSameClient && this.state.sessionId ? this.state.sessionId : crypto.randomUUID();
    const initialDuration = isContinuingSameClient ? this.state.duration : 0;
    const initialTranscript = isContinuingSameClient ? this.state.liveTranscript : '';

    const existingChunks = await getSessionChunks(activeSessionId, targetClientId);
    this.chunkIndex =
      existingChunks.length > 0
        ? existingChunks[existingChunks.length - 1].chunkIndex + 1
        : isContinuingSameClient
          ? this.state.chunksCount
          : 0;

    this.baseDurationSeconds = initialDuration;

    this.setState({
      sessionId: activeSessionId,
      clientId: targetClientId,
      clientName: targetClientName,
      meetingTitle: params?.meetingTitle || this.state.meetingTitle || `Sesión de Relevamiento - ${targetClientName}`,
      meetingType: params?.meetingType || this.state.meetingType || 'diagnostico',
      status: 'starting',
      duration: initialDuration,
      liveTranscript: initialTranscript,
      micError: null,
    });

    try {
      await requestScreenWakeLock();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.mediaStream = stream;

      // Detect unexpected microphone hardware disconnect & preserve session cleanly!
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          if (this.state.status === 'recording') {
            this.pauseRecording('El micrófono se desconectó. Todo tu audio y transcripción quedaron guardados; reconéctalo y pulsa "Continuar Grabación".');
          }
        };
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume().catch(() => {});
      }
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 2048;
      this.audioContext = audioCtx;
      this.analyser = analyser;

      // Upsert active session in Supabase & subscribe to server-side Whisper chunks
      await this.syncDraftToSupabase('grabando');

      try {
        if (this.realtimeChannel) {
          supabase.removeChannel(this.realtimeChannel);
        }
        const channel = supabase
          .channel(`realtime_session_${activeSessionId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'gobernanza_audio_chunks',
              filter: `session_id=eq.${activeSessionId}`,
            },
            (payload: any) => {
              const chunkTrim = payload.new?.transcription?.trim();
              if (chunkTrim) {
                this.appendTranscriptSegment(chunkTrim);
              }
            }
          )
          .subscribe();
        this.realtimeChannel = channel;
      } catch (e) {
        console.warn('[PersistentRecorder] Realtime subscription notice:', e);
      }

      // Live Whisper / WebSpeech recognition
      try {
        const streamer = new WhisperLiveStreamer({
          clientId: targetClientId,
          sessionId: activeSessionId,
          language: 'es',
          onTranscript: (ev) => {
            if (ev.isFinal) {
              this.appendTranscriptSegment(ev.text);
              this.setState({ interimText: '' });
            } else {
              this.setState({ interimText: ev.text });
            }
          },
          onStatusChange: (st) => this.setState({ streamStatus: st }),
          onError: (err) => console.warn('[PersistentRecorder] Live streamer warning:', err.message),
        });
        this.liveStreamer = streamer;
        await streamer.start(stream);
      } catch (e) {
        console.warn('[PersistentRecorder] Streamer init warning:', e);
      }

      // MediaRecorder slicing every 4 seconds -> zero data loss on tab switches or interruptions!
      const { mimeType } = getCompatibleAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      this.mediaRecorder = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          const idx = this.chunkIndex++;
          const record = await saveLocalChunk(
            targetClientId,
            activeSessionId,
            idx,
            e.data,
            undefined,
            this.state.meetingTitle || 'Relevamiento Integral 100 Preguntas'
          );

          this.setState({ chunksCount: this.state.chunksCount + 1 });
          this.saveDraftLocally();

          sendChunkToEdgeTranscriber(record, {
            questionId: '',
            questionTitle: 'Relevamiento Integral',
            meetingTitle: this.state.meetingTitle,
            durationSeconds: 4,
          }).then((res) => {
            if (res.success) {
              this.setState({ syncedChunks: this.state.syncedChunks + 1 });
              if (res.transcription?.trim()) {
                this.appendTranscriptSegment(res.transcription.trim());
              }
            } else {
              uploadChunkToStorage(record).then((up) => {
                if (up.success) {
                  this.setState({ syncedChunks: this.state.syncedChunks + 1 });
                }
              });
            }
          });
        }
      };

      // 4000ms timeslice guarantees frequent IndexedDB persistence even in background browser tabs
      recorder.start(4000);

      this.segmentStartMs = Date.now();
      this.setState({
        status: 'recording',
        micError: null,
      });
      this.saveDraftLocally();

      if (this.tickTimer) clearInterval(this.tickTimer);
      this.tickTimer = setInterval(() => {
        this.recalculateWallClockDuration();
        this.saveDraftLocally();
      }, 1000);

      if (this.cloudSyncTimer) clearInterval(this.cloudSyncTimer);
      this.cloudSyncTimer = setInterval(() => {
        this.syncDraftToSupabase('grabando');
      }, 8000);
    } catch (err: any) {
      console.error('[PersistentRecorder] Mic error:', err);
      this.setState({
        status: this.baseDurationSeconds > 0 || this.state.liveTranscript.trim() ? 'paused' : 'idle',
        micError:
          err?.message ||
          'No se pudo activar el micrófono. Verifica los permisos del navegador o sube un archivo de audio.',
      });
    }
  }

  /**
   * Pauses the active recording, flushes the final audio chunk into IndexedDB,
   * compiles playable audio so far, and keeps the session ready to CONTINUE at any time!
   */
  public async pauseRecording(customNotice?: string): Promise<Blob | null> {
    this.recalculateWallClockDuration();
    this.baseDurationSeconds = this.state.duration;
    this.segmentStartMs = null;

    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.cloudSyncTimer) {
      clearInterval(this.cloudSyncTimer);
      this.cloudSyncTimer = null;
    }

    // Flush any pending interim text into liveTranscript so nothing spoken in the last second is lost!
    if (this.state.interimText.trim()) {
      this.appendTranscriptSegment(this.state.interimText.trim());
    }

    if (this.liveStreamer) {
      const streamerTranscript = this.liveStreamer.stop();
      if (!this.state.liveTranscript.trim() && streamerTranscript.trim()) {
        this.appendTranscriptSegment(streamerTranscript.trim());
      }
      this.liveStreamer = null;
    }

    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    // Wait for MediaRecorder's final ondataavailable flush before compiling!
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        const rec = this.mediaRecorder!;
        const timeout = setTimeout(() => resolve(), 900);
        rec.addEventListener(
          'stop',
          () => {
            clearTimeout(timeout);
            // Allow 120ms for async saveLocalChunk inside ondataavailable to finish
            setTimeout(() => resolve(), 120);
          },
          { once: true }
        );
        try {
          rec.stop();
        } catch {
          clearTimeout(timeout);
          resolve();
        }
      });
    }
    this.mediaRecorder = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch {
        // Ignore
      }
      this.audioContext = null;
      this.analyser = null;
    }

    releaseScreenWakeLock();

    let combinedBlob: Blob | null = null;
    let audioUrl = this.state.compiledAudioUrl;
    try {
      combinedBlob = await compileSessionAudioBlob(this.state.sessionId, this.state.clientId);
      if (combinedBlob && combinedBlob.size > 0) {
        audioUrl = URL.createObjectURL(combinedBlob);
      }
    } catch {
      // No binary chunks if transcript-only
    }

    this.setState({
      status: 'paused',
      interimText: '',
      streamStatus: 'idle',
      compiledAudioUrl: audioUrl,
      micError: customNotice || null,
    });

    this.saveDraftLocally();
    await this.syncDraftToSupabase('en_pausa');
    return combinedBlob;
  }

  /**
   * Finalizes the session for automatic 100-question checkout & clears the active draft once processed.
   */
  public async stopForFinalCheckout(): Promise<{
    sessionId: string;
    transcript: string;
    duration: number;
    combinedBlob: Blob | null;
  }> {
    let combinedBlob: Blob | null = null;
    if (this.state.status === 'recording') {
      combinedBlob = await this.pauseRecording();
    } else {
      try {
        combinedBlob = await compileSessionAudioBlob(this.state.sessionId, this.state.clientId);
      } catch {
        combinedBlob = null;
      }
    }

    if (combinedBlob && combinedBlob.size > 0 && this.state.clientId) {
      const fullFileName = `${this.state.clientId}/${this.state.sessionId}_full.webm`;
      supabase.storage
        .from('gobernanza_audios')
        .upload(fullFileName, combinedBlob, {
          contentType: combinedBlob.type || 'audio/webm;codecs=opus',
          upsert: true,
        })
        .catch(() => {});
    }

    return {
      sessionId: this.state.sessionId,
      transcript: this.state.liveTranscript.trim(),
      duration: this.state.duration,
      combinedBlob,
    };
  }

  public markCheckoutCompleted(clientId: string) {
    this.clearClientDraft(clientId);
    if (this.state.clientId === clientId && this.state.status !== 'recording') {
      this.baseDurationSeconds = 0;
      this.segmentStartMs = null;
      this.chunkIndex = 0;
      this.setState({
        status: 'idle',
        interimText: '',
        micError: null,
      });
    }
  }

  /**
   * Starts a brand-new blank session (discarding or archiving the current draft).
   */
  public async startFreshBlankSession(params: {
    clientId: string;
    clientName: string;
    defaultTitle: string;
    meetingType: string;
  }) {
    if (this.state.status === 'recording') {
      await this.pauseRecording();
    }
    this.clearClientDraft(params.clientId);
    this.chunkIndex = 0;
    this.baseDurationSeconds = 0;
    this.segmentStartMs = null;

    this.setState({
      sessionId: crypto.randomUUID(),
      clientId: params.clientId,
      clientName: params.clientName,
      meetingTitle: params.defaultTitle,
      meetingType: params.meetingType,
      status: 'idle',
      duration: 0,
      chunksCount: 0,
      syncedChunks: 0,
      liveTranscript: '',
      interimText: '',
      streamStatus: 'idle',
      micError: null,
      compiledAudioUrl: null,
      lastSavedAt: null,
    });
  }
}

export const persistentRecorder = new PersistentRecordingManager();

export function usePersistentRecorder(): PersistentSessionSnapshot {
  return useSyncExternalStore(persistentRecorder.subscribe, persistentRecorder.getSnapshot);
}
