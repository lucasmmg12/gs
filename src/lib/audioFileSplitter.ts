/**
 * audioFileSplitter.ts
 * Browser-native audio decoder & chunker for large pre-recorded meeting files (.m4a, .mp3, .wav, .webm, .ogg).
 * Decodes arbitrarily large files (e.g. 70–120 MB .m4a recordings of 1–2h meetings),
 * resamples to 16 kHz mono 16-bit PCM WAV (ideal for OpenAI Whisper / gpt-4o-transcribe),
 * and splits into ~3.5-minute chunks (~6.7 MB each, well below OpenAI's 25 MB limit and Supabase Edge limits)
 * with a 2-second overlap so sentences at chunk boundaries are never clipped.
 */

import { isIsoBmffAudio, splitM4aBytesLossless } from './m4aLosslessSplitter';

export interface SplitAudioChunk {
  chunkIndex: number;
  totalChunks: number;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  blob: Blob;
  fileName: string;
  mimeType: string;
}

export interface AudioSplitProgress {
  stage: 'reading' | 'decoding' | 'chunking' | 'done';
  percent: number;
  detail: string;
}

const TARGET_SAMPLE_RATE = 16000;
const CHUNK_DURATION_SECONDS = 210; // 3.5 min -> ~6.7 MB WAV @ 16kHz 16-bit mono
const OVERLAP_SECONDS = 2;

/**
 * Encodes a mono Float32Array PCM buffer at `sampleRate` into a valid RIFF WAVE (16-bit PCM) Blob.
 */
function encodeWavMono16(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // AudioFormat = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Fast linear downsampling + mono mixdown from decoded AudioBuffer to 16 kHz mono Float32Array.
 * Avoids OfflineAudioContext memory spikes on 2-hour recordings.
 */
function downsampleToMono16k(audioBuffer: AudioBuffer, startSample: number, endSample: number): Float32Array {
  const srcRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const srcLength = Math.max(0, endSample - startSample);
  const ratio = srcRate / TARGET_SAMPLE_RATE;
  const outLength = Math.max(1, Math.floor(srcLength / ratio));
  const out = new Float32Array(outLength);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(audioBuffer.getChannelData(c));
  }

  for (let i = 0; i < outLength; i++) {
    const srcPos = startSample + i * ratio;
    const idx0 = Math.min(audioBuffer.length - 1, Math.floor(srcPos));
    const idx1 = Math.min(audioBuffer.length - 1, idx0 + 1);
    const frac = srcPos - idx0;

    let sum = 0;
    for (let c = 0; c < numChannels; c++) {
      const v0 = channels[c][idx0] || 0;
      const v1 = channels[c][idx1] || 0;
      sum += v0 + (v1 - v0) * frac;
    }
    out[i] = sum / numChannels;
  }

  return out;
}

/**
 * Parses a meeting date & clean title from filenames like "2026.08.25.LOZANO ARQ.m4a"
 */
export function parseAudioFileMeta(fileName: string): { suggestedTitle: string; detectedDate?: string } {
  const base = fileName.replace(/\.[^/.]+$/, '').trim();
  const dateMatch = base.match(/(\d{4})[.\-_](\d{2})[.\-_](\d{2})/);
  if (dateMatch) {
    const [, yyyy, mm, dd] = dateMatch;
    const rest = base
      .replace(dateMatch[0], '')
      .replace(/^[.\-_\s]+/, '')
      .replace(/[.\-_]+/g, ' ')
      .trim();
    const detectedDate = `${dd}/${mm}/${yyyy}`;
    const suggestedTitle = rest ? `Sesión ${detectedDate} — ${rest}` : `Sesión ${detectedDate}`;
    return { suggestedTitle, detectedDate };
  }
  return { suggestedTitle: base || 'Sesión de Audio Importada' };
}

/**
 * Splits any audio File into Whisper-safe (< 8 MB) 16 kHz mono WAV chunks.
 * If the file is already small (<= 6 MB) and in a directly supported format, returns it directly as 1 chunk.
 */
export async function splitAudioFileForTranscription(
  file: File,
  onProgress?: (progress: AudioSplitProgress) => void
): Promise<{ chunks: SplitAudioChunk[]; totalDurationSeconds: number }> {
  const ext = (file.name.split('.').pop() || 'webm').toLowerCase();
  const directSupported = ['mp3', 'mp4', 'm4a', 'wav', 'webm', 'ogg', 'flac', 'mpeg'].includes(ext);

  // Fast path: small file already under 6 MB -> send directly with real MIME/extension
  if (file.size <= 6 * 1024 * 1024 && directSupported) {
    onProgress?.({ stage: 'done', percent: 100, detail: 'Archivo liviano listo para transcripción directa' });
    return {
      totalDurationSeconds: Math.max(30, Math.round(file.size / 16000)),
      chunks: [
        {
          chunkIndex: 0,
          totalChunks: 1,
          startSeconds: 0,
          endSeconds: 180,
          durationSeconds: 180,
          blob: file,
          fileName: file.name,
          mimeType: file.type || (ext === 'm4a' ? 'audio/mp4' : `audio/${ext}`)
        }
      ]
    };
  }

  onProgress?.({ stage: 'reading', percent: 10, detail: `Leyendo ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)...` });
  const arrayBuffer = await file.arrayBuffer();
  const u8 = new Uint8Array(arrayBuffer);

  // Fast lossless path for .m4a / .mp4 (handles 70–200+ MB files in <100ms without Web Audio memory spikes!)
  if (isIsoBmffAudio(u8)) {
    onProgress?.({ stage: 'chunking', percent: 45, detail: 'Particionando pistas AAC/M4A sin pérdida (<7 MB por segmento)...' });
    const { chunks: m4aChunks, totalDurationSeconds } = splitM4aBytesLossless(u8, {
      maxChunkBytes: 7 * 1024 * 1024,
      maxChunkSeconds: 600,
      overlapSeconds: 2
    });
    const chunks: SplitAudioChunk[] = m4aChunks.map(c => ({
      chunkIndex: c.chunkIndex,
      totalChunks: c.totalChunks,
      startSeconds: c.startSeconds,
      endSeconds: c.endSeconds,
      durationSeconds: c.durationSeconds,
      blob: new Blob([c.bytes as unknown as BlobPart], { type: 'audio/mp4' }),
      fileName: c.fileName,
      mimeType: 'audio/mp4'
    }));
    onProgress?.({
      stage: 'done',
      percent: 100,
      detail: `Listo: ${chunks.length} segmentos M4A sin pérdida (${Math.round(totalDurationSeconds / 60)} min totales)`
    });
    return { chunks, totalDurationSeconds };
  }

  onProgress?.({ stage: 'decoding', percent: 35, detail: 'Decodificando pista de audio en el navegador...' });
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtx();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    audioCtx.close().catch(() => {});
  }

  const totalDurationSeconds = Math.ceil(audioBuffer.duration);
  const stepSeconds = CHUNK_DURATION_SECONDS - OVERLAP_SECONDS;
  const totalChunks = Math.max(1, Math.ceil(totalDurationSeconds / stepSeconds));
  const chunks: SplitAudioChunk[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const startSec = i * stepSeconds;
    const endSec = Math.min(totalDurationSeconds, startSec + CHUNK_DURATION_SECONDS);
    if (endSec - startSec < 1 && i > 0) break;

    const startSample = Math.floor(startSec * audioBuffer.sampleRate);
    const endSample = Math.min(audioBuffer.length, Math.floor(endSec * audioBuffer.sampleRate));

    const mono16k = downsampleToMono16k(audioBuffer, startSample, endSample);
    const wavBlob = encodeWavMono16(mono16k, TARGET_SAMPLE_RATE);

    chunks.push({
      chunkIndex: i,
      totalChunks,
      startSeconds: startSec,
      endSeconds: endSec,
      durationSeconds: Math.max(1, Math.round(endSec - startSec)),
      blob: wavBlob,
      fileName: `chunk_${String(i).padStart(4, '0')}.wav`,
      mimeType: 'audio/wav'
    });

    const pct = 40 + Math.round(((i + 1) / totalChunks) * 58);
    onProgress?.({
      stage: 'chunking',
      percent: pct,
      detail: `Generando segmento ${i + 1} de ${totalChunks} (${(wavBlob.size / 1024 / 1024).toFixed(1)} MB)...`
    });
  }

  // Normalize totalChunks in case last tail was skipped
  chunks.forEach(c => {
    c.totalChunks = chunks.length;
  });

  onProgress?.({
    stage: 'done',
    percent: 100,
    detail: `Listo: ${chunks.length} segmentos de audio (${Math.round(totalDurationSeconds / 60)} min totales)`
  });

  return { chunks, totalDurationSeconds };
}
