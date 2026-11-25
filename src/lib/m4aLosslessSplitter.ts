/**
 * m4aLosslessSplitter.ts
 * Zero-dependency, pure-TypeScript ISOBMFF (.m4a / .mp4 audio) lossless splitter.
 * Splits arbitrarily large AAC/M4A recordings (e.g. 70–200 MB, 1–3 hours) into
 * standard, playable, OpenAI Whisper-compatible .m4a chunks (~6–8 MB / ~10 min each)
 * in < 100 ms with ZERO audio decoding and ZERO Web Audio memory spikes.
 */

export interface M4aChunkResult {
  chunkIndex: number;
  totalChunks: number;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
}

interface BoxRef {
  type: string;
  start: number;
  headerSize: number;
  size: number;
  end: number;
}

function readStr4(u8: Uint8Array, off: number): string {
  return String.fromCharCode(u8[off], u8[off + 1], u8[off + 2], u8[off + 3]);
}

function readU32(view: DataView, off: number): number {
  return view.getUint32(off, false);
}

function readU64(view: DataView, off: number): number {
  const hi = view.getUint32(off, false);
  const lo = view.getUint32(off + 4, false);
  return hi * 4294967296 + lo;
}

function iterBoxes(u8: Uint8Array, view: DataView, start: number, end: number): BoxRef[] {
  const out: BoxRef[] = [];
  let off = start;
  while (off + 8 <= end) {
    let size = readU32(view, off);
    const type = readStr4(u8, off + 4);
    let headerSize = 8;
    if (size === 1) {
      if (off + 16 > end) break;
      size = readU64(view, off + 8);
      headerSize = 16;
    } else if (size === 0) {
      size = end - off;
    }
    if (size < headerSize || off + size > end) break;
    out.push({ type, start: off, headerSize, size, end: off + size });
    off += size;
  }
  return out;
}

function findBox(u8: Uint8Array, view: DataView, start: number, end: number, target: string): BoxRef | null {
  for (const b of iterBoxes(u8, view, start, end)) {
    if (b.type === target) return b;
  }
  return null;
}

function makeBox(type: string, ...parts: Uint8Array[]): Uint8Array {
  let payloadLen = 0;
  for (const p of parts) payloadLen += p.length;
  const total = 8 + payloadLen;
  const out = new Uint8Array(total);
  const v = new DataView(out.buffer);
  v.setUint32(0, total, false);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  let off = 8;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function makeFullBox(type: string, version: number, flags: number, ...parts: Uint8Array[]): Uint8Array {
  const vf = new Uint8Array(4);
  vf[0] = version & 0xff;
  vf[1] = (flags >> 16) & 0xff;
  vf[2] = (flags >> 8) & 0xff;
  vf[3] = flags & 0xff;
  return makeBox(type, vf, ...parts);
}

function u32Bytes(vals: number[]): Uint8Array {
  const out = new Uint8Array(vals.length * 4);
  const v = new DataView(out.buffer);
  for (let i = 0; i < vals.length; i++) v.setUint32(i * 4, vals[i] >>> 0, false);
  return out;
}

function buildM4aSegment(params: {
  stsdRawBox: Uint8Array;
  timescale: number;
  sampleDurations: number[];
  sampleSizes: number[];
  sampleBytesTotal: number;
  samplePayloads: Uint8Array[];
}): Uint8Array {
  const { stsdRawBox, timescale, sampleDurations, sampleSizes, sampleBytesTotal, samplePayloads } = params;
  const totalDuration = sampleDurations.reduce((a, b) => a + b, 0);

  // ftyp
  const ftyp = makeBox(
    'ftyp',
    new Uint8Array([
      0x4d, 0x34, 0x41, 0x20, // 'M4A '
      0x00, 0x00, 0x00, 0x00, // minor_version
      0x4d, 0x34, 0x41, 0x20, // 'M4A '
      0x6d, 0x70, 0x34, 0x32, // 'mp42'
      0x69, 0x73, 0x6f, 0x6d  // 'isom'
    ])
  );

  // mvhd (version 0, 96 bytes payload)
  const mvhdBody = new Uint8Array(96);
  const mvhdV = new DataView(mvhdBody.buffer);
  mvhdV.setUint32(8, timescale, false);
  mvhdV.setUint32(12, totalDuration, false);
  mvhdV.setUint32(16, 0x00010000, false); // rate 1.0
  mvhdV.setUint16(20, 0x0100, false); // volume 1.0
  // identity matrix at offset 32 (36 bytes)
  mvhdV.setUint32(32, 0x00010000, false);
  mvhdV.setUint32(48, 0x00010000, false);
  mvhdV.setUint32(64, 0x40000000, false);
  mvhdV.setUint32(92, 2, false); // next_track_ID = 2
  const mvhd = makeFullBox('mvhd', 0, 0, mvhdBody);

  // tkhd (version 0, flags=3 enabled+in_movie, 80 bytes payload)
  const tkhdBody = new Uint8Array(80);
  const tkhdV = new DataView(tkhdBody.buffer);
  tkhdV.setUint32(8, 1, false); // track_ID = 1
  tkhdV.setUint32(16, totalDuration, false);
  tkhdV.setUint16(32, 0x0100, false); // volume 1.0
  tkhdV.setUint32(36, 0x00010000, false);
  tkhdV.setUint32(52, 0x00010000, false);
  tkhdV.setUint32(68, 0x40000000, false);
  const tkhd = makeFullBox('tkhd', 0, 3, tkhdBody);

  // mdhd (version 0, 20 bytes payload)
  const mdhdBody = new Uint8Array(20);
  const mdhdV = new DataView(mdhdBody.buffer);
  mdhdV.setUint32(8, timescale, false);
  mdhdV.setUint32(12, totalDuration, false);
  mdhdV.setUint16(16, 0x55c4, false); // 'und'
  const mdhd = makeFullBox('mdhd', 0, 0, mdhdBody);

  // hdlr ('soun')
  const hdlrBody = new Uint8Array(25);
  hdlrBody.set([0x73, 0x6f, 0x75, 0x6e], 4); // 'soun'
  const hdlr = makeFullBox('hdlr', 0, 0, hdlrBody);

  // smhd
  const smhd = makeFullBox('smhd', 0, 0, new Uint8Array(4));

  // dinf -> dref -> url
  const urlBox = makeFullBox('url ', 0, 1);
  const dref = makeFullBox('dref', 0, 0, u32Bytes([1]), urlBox);
  const dinf = makeBox('dinf', dref);

  // stts (RLE compress sample durations)
  const sttsEntries: number[] = [];
  for (let i = 0; i < sampleDurations.length; i++) {
    const d = sampleDurations[i];
    if (sttsEntries.length >= 2 && sttsEntries[sttsEntries.length - 1] === d) {
      sttsEntries[sttsEntries.length - 2]++;
    } else {
      sttsEntries.push(1, d);
    }
  }
  const stts = makeFullBox('stts', 0, 0, u32Bytes([sttsEntries.length / 2, ...sttsEntries]));

  // stsc (1 chunk containing all N samples)
  const stsc = makeFullBox('stsc', 0, 0, u32Bytes([1, 1, sampleSizes.length, 1]));

  // stsz
  const stsz = makeFullBox('stsz', 0, 0, u32Bytes([0, sampleSizes.length, ...sampleSizes]));

  // Build stbl with placeholder stco first so we know exact moov size -> exact mdat payload offset!
  const buildMoovWithOffset = (mdatPayloadOffset: number) => {
    const stco = makeFullBox('stco', 0, 0, u32Bytes([1, mdatPayloadOffset]));
    const stbl = makeBox('stbl', stsdRawBox, stts, stsc, stsz, stco);
    const minf = makeBox('minf', smhd, dinf, stbl);
    const mdia = makeBox('mdia', mdhd, hdlr, minf);
    const trak = makeBox('trak', tkhd, mdia);
    return makeBox('moov', mvhd, trak);
  };

  const moovPass1 = buildMoovWithOffset(0);
  const mdatPayloadOffset = ftyp.length + moovPass1.length + 8;
  const moov = buildMoovWithOffset(mdatPayloadOffset);

  // Assemble final file: ftyp + moov + mdat header + sample payloads
  const finalSize = ftyp.length + moov.length + 8 + sampleBytesTotal;
  const finalBuf = new Uint8Array(finalSize);
  finalBuf.set(ftyp, 0);
  finalBuf.set(moov, ftyp.length);

  const mdatStart = ftyp.length + moov.length;
  const mdatV = new DataView(finalBuf.buffer, mdatStart, 8);
  mdatV.setUint32(0, 8 + sampleBytesTotal, false);
  finalBuf.set([0x6d, 0x64, 0x61, 0x74], mdatStart + 4); // 'mdat'

  let writePos = mdatStart + 8;
  for (const payload of samplePayloads) {
    finalBuf.set(payload, writePos);
    writePos += payload.length;
  }

  return finalBuf;
}

/**
 * Checks if a buffer starts with an ISO BMFF 'ftyp' header (.m4a / .mp4).
 */
export function isIsoBmffAudio(u8: Uint8Array): boolean {
  return u8.length >= 12 && readStr4(u8, 4) === 'ftyp';
}

/**
 * Splits a raw .m4a / .mp4 audio Uint8Array losslessly into Whisper-safe chunks (< maxChunkMB).
 */
export function splitM4aBytesLossless(
  u8: Uint8Array,
  options?: { maxChunkBytes?: number; maxChunkSeconds?: number; overlapSeconds?: number }
): { chunks: M4aChunkResult[]; totalDurationSeconds: number } {
  const maxChunkBytes = options?.maxChunkBytes ?? 7 * 1024 * 1024; // 7 MB (well under OpenAI 25 MB & Edge limits)
  const maxChunkSeconds = options?.maxChunkSeconds ?? 600; // 10 min max per chunk
  const overlapSeconds = options?.overlapSeconds ?? 2;

  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const moov = findBox(u8, view, 0, u8.length, 'moov');
  if (!moov) throw new Error('Archivo M4A inválido: no se encontró el bloque moov.');

  // Find audio trak ('soun')
  const traks = iterBoxes(u8, view, moov.start + moov.headerSize, moov.end).filter(b => b.type === 'trak');
  let audioMdia: BoxRef | null = null;
  for (const trak of traks) {
    const mdia = findBox(u8, view, trak.start + trak.headerSize, trak.end, 'mdia');
    if (!mdia) continue;
    const hdlr = findBox(u8, view, mdia.start + mdia.headerSize, mdia.end, 'hdlr');
    if (hdlr && readStr4(u8, hdlr.start + hdlr.headerSize + 8) === 'soun') {
      audioMdia = mdia;
      break;
    }
  }
  if (!audioMdia) throw new Error('Archivo M4A inválido: no se encontró pista de audio (soun).');

  // mdhd -> timescale & duration
  const mdhd = findBox(u8, view, audioMdia.start + audioMdia.headerSize, audioMdia.end, 'mdhd');
  if (!mdhd) throw new Error('Archivo M4A inválido: falta mdhd.');
  const mdhdVer = u8[mdhd.start + mdhd.headerSize];
  const timescale = mdhdVer === 1
    ? readU32(view, mdhd.start + mdhd.headerSize + 20)
    : readU32(view, mdhd.start + mdhd.headerSize + 12);
  const rawDuration = mdhdVer === 1
    ? readU64(view, mdhd.start + mdhd.headerSize + 24)
    : readU32(view, mdhd.start + mdhd.headerSize + 16);
  const totalDurationSeconds = Math.ceil(rawDuration / (timescale || 1));

  const minf = findBox(u8, view, audioMdia.start + audioMdia.headerSize, audioMdia.end, 'minf');
  const stbl = minf ? findBox(u8, view, minf.start + minf.headerSize, minf.end, 'stbl') : null;
  if (!stbl) throw new Error('Archivo M4A inválido: falta stbl.');

  const stblStart = stbl.start + stbl.headerSize;
  const stsd = findBox(u8, view, stblStart, stbl.end, 'stsd');
  const stts = findBox(u8, view, stblStart, stbl.end, 'stts');
  const stsc = findBox(u8, view, stblStart, stbl.end, 'stsc');
  const stsz = findBox(u8, view, stblStart, stbl.end, 'stsz');
  const stco = findBox(u8, view, stblStart, stbl.end, 'stco');
  const co64 = findBox(u8, view, stblStart, stbl.end, 'co64');

  if (!stsd || !stts || !stsc || !stsz || (!stco && !co64)) {
    throw new Error('Archivo M4A incompleto: faltan tablas de muestras (stsd/stts/stsc/stsz/stco).');
  }

  const stsdRawBox = u8.slice(stsd.start, stsd.end);

  // 1. Parse stsz -> sampleSizes[]
  const stszPay = stsz.start + stsz.headerSize;
  const fixedSampleSize = readU32(view, stszPay + 4);
  const sampleCount = readU32(view, stszPay + 8);
  const sampleSizes = new Uint32Array(sampleCount);
  if (fixedSampleSize > 0) {
    sampleSizes.fill(fixedSampleSize);
  } else {
    for (let i = 0; i < sampleCount; i++) {
      sampleSizes[i] = readU32(view, stszPay + 12 + i * 4);
    }
  }

  // 2. Parse stts -> sampleDurations[]
  const sttsPay = stts.start + stts.headerSize;
  const sttsCount = readU32(view, sttsPay + 4);
  const sampleDurations = new Uint32Array(sampleCount);
  let sIdx = 0;
  for (let i = 0; i < sttsCount; i++) {
    const cnt = readU32(view, sttsPay + 8 + i * 8);
    const dur = readU32(view, sttsPay + 12 + i * 8);
    for (let j = 0; j < cnt && sIdx < sampleCount; j++) {
      sampleDurations[sIdx++] = dur;
    }
  }

  // 3. Parse stco / co64 -> chunkOffsets[]
  const chunkOffsets: number[] = [];
  if (stco) {
    const p = stco.start + stco.headerSize;
    const n = readU32(view, p + 4);
    for (let i = 0; i < n; i++) chunkOffsets.push(readU32(view, p + 8 + i * 4));
  } else if (co64) {
    const p = co64.start + co64.headerSize;
    const n = readU32(view, p + 4);
    for (let i = 0; i < n; i++) chunkOffsets.push(readU64(view, p + 8 + i * 8));
  }

  // 4. Parse stsc -> compute exact byte offset of every sample
  const stscPay = stsc.start + stsc.headerSize;
  const stscCount = readU32(view, stscPay + 4);
  const stscEntries: { firstChunk: number; samplesPerChunk: number }[] = [];
  for (let i = 0; i < stscCount; i++) {
    stscEntries.push({
      firstChunk: readU32(view, stscPay + 8 + i * 12),
      samplesPerChunk: readU32(view, stscPay + 12 + i * 12)
    });
  }

  const sampleOffsets = new Float64Array(sampleCount);
  let curSample = 0;
  for (let e = 0; e < stscEntries.length; e++) {
    const startChunk1 = stscEntries[e].firstChunk;
    const endChunk1 = e + 1 < stscEntries.length ? stscEntries[e + 1].firstChunk : chunkOffsets.length + 1;
    const spc = stscEntries[e].samplesPerChunk;
    for (let ch = startChunk1; ch < endChunk1 && curSample < sampleCount; ch++) {
      let bytePos = chunkOffsets[ch - 1];
      for (let k = 0; k < spc && curSample < sampleCount; k++) {
        sampleOffsets[curSample] = bytePos;
        bytePos += sampleSizes[curSample];
        curSample++;
      }
    }
  }

  // 5. Partition samples into Whisper-safe segments (<= maxChunkBytes and <= maxChunkSeconds)
  const maxDurTicks = maxChunkSeconds * timescale;
  const overlapTicks = overlapSeconds * timescale;
  const segments: { startIdx: number; endIdx: number; startSec: number; endSec: number }[] = [];

  let i = 0;
  let elapsedTicks = 0;
  while (i < sampleCount) {
    const segStart = i;
    const segStartTicks = elapsedTicks;
    let segBytes = 0;
    let segTicks = 0;

    while (i < sampleCount) {
      const sz = sampleSizes[i];
      const d = sampleDurations[i];
      if (i > segStart && (segBytes + sz > maxChunkBytes || segTicks + d > maxDurTicks)) {
        break;
      }
      segBytes += sz;
      segTicks += d;
      elapsedTicks += d;
      i++;
    }

    segments.push({
      startIdx: segStart,
      endIdx: i,
      startSec: Math.round(segStartTicks / timescale),
      endSec: Math.round((segStartTicks + segTicks) / timescale)
    });

    if (i < sampleCount && overlapTicks > 0) {
      // Step back by overlapTicks so sentences at boundary aren't cut
      let backTicks = 0;
      let backIdx = i;
      while (backIdx > segStart + 1 && backTicks < overlapTicks) {
        backIdx--;
        backTicks += sampleDurations[backIdx];
      }
      i = backIdx;
      elapsedTicks -= backTicks;
    }
  }

  // 6. Emit valid .m4a byte buffers for every segment
  const chunks: M4aChunkResult[] = segments.map((seg, idx) => {
    const durs: number[] = [];
    const sizes: number[] = [];
    const payloads: Uint8Array[] = [];
    let totalBytes = 0;

    for (let s = seg.startIdx; s < seg.endIdx; s++) {
      const off = sampleOffsets[s];
      const sz = sampleSizes[s];
      durs.push(sampleDurations[s]);
      sizes.push(sz);
      payloads.push(u8.subarray(off, off + sz));
      totalBytes += sz;
    }

    const m4aBytes = buildM4aSegment({
      stsdRawBox,
      timescale,
      sampleDurations: durs,
      sampleSizes: sizes,
      sampleBytesTotal: totalBytes,
      samplePayloads: payloads
    });

    return {
      chunkIndex: idx,
      totalChunks: segments.length,
      startSeconds: seg.startSec,
      endSeconds: seg.endSec,
      durationSeconds: Math.max(1, seg.endSec - seg.startSec),
      bytes: m4aBytes,
      fileName: `chunk_${String(idx).padStart(4, '0')}.m4a`,
      mimeType: 'audio/mp4'
    };
  });

  return { chunks, totalDurationSeconds };
}
