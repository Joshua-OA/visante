// ─── PCM / WAV / Base64 utilities ────────────────────────────────────────────
// Used by useRealtimeSession to prepare audio for the OpenAI Realtime API
// and to convert API audio deltas back into playable WAV files.

/**
 * Decodes a base64 string to an ArrayBuffer.
 * Uses React Native's built-in global atob().
 */
export function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encodes an ArrayBuffer to a base64 string.
 * Used to send PCM16 mic chunks to the API.
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Concatenates multiple ArrayBuffers into a single ArrayBuffer.
 * Used to assemble accumulated audio delta chunks before wrapping in WAV.
 */
export function concatArrayBuffers(buffers) {
  const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    result.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return result.buffer;
}

/**
 * Wraps a raw PCM16 LE buffer in a RIFF/WAV container header.
 *
 * The OpenAI Realtime API returns raw PCM16 LE at 24000 Hz mono.
 * expo-av Sound.createAsync() cannot play raw PCM — it needs a valid WAV file.
 * This function prepends the 44-byte RIFF header so the buffer becomes a
 * complete .wav file that expo-av can load via a file URI.
 *
 * @param {ArrayBuffer} pcmBuffer  Raw PCM16 LE samples
 * @param {number} sampleRate      Samples per second (24000 for OpenAI output)
 * @param {number} numChannels     1 = mono
 * @returns {ArrayBuffer}          Complete WAV file bytes
 */
export function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1) {
  const bytesPerSample = 2; // PCM16 = 2 bytes per sample
  const byteRate = sampleRate * numChannels * bytesPerSample;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = pcmBuffer.byteLength;
  const wavBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(wavBuffer);

  // RIFF chunk descriptor
  writeStr(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeStr(view, 8, 'WAVE');

  // fmt sub-chunk
  writeStr(view, 12, 'fmt ');
  view.setUint32(16, 16, true);               // sub-chunk size
  view.setUint16(20, 1, true);                // PCM = audio format 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true); // bits per sample

  // data sub-chunk
  writeStr(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Copy raw PCM samples
  new Uint8Array(wavBuffer).set(new Uint8Array(pcmBuffer), 44);
  return wavBuffer;
}

function writeStr(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Strips the 44-byte RIFF/WAV header from a WAV ArrayBuffer,
 * returning just the raw PCM sample data.
 *
 * @param {ArrayBuffer} wavBuffer  Complete WAV file bytes
 * @returns {ArrayBuffer}          Raw PCM16 LE samples
 */
export function stripWavHeader(wavBuffer) {
  // Standard WAV header is 44 bytes. Verify RIFF signature.
  const view = new DataView(wavBuffer);
  const riff =
    String.fromCharCode(view.getUint8(0)) +
    String.fromCharCode(view.getUint8(1)) +
    String.fromCharCode(view.getUint8(2)) +
    String.fromCharCode(view.getUint8(3));
  if (riff === 'RIFF') {
    // Read the actual data chunk offset for robustness
    // "data" sub-chunk starts after "fmt " sub-chunk
    let offset = 12; // skip RIFF header (12 bytes)
    while (offset < wavBuffer.byteLength - 8) {
      const id =
        String.fromCharCode(view.getUint8(offset)) +
        String.fromCharCode(view.getUint8(offset + 1)) +
        String.fromCharCode(view.getUint8(offset + 2)) +
        String.fromCharCode(view.getUint8(offset + 3));
      const size = view.getUint32(offset + 4, true);
      if (id === 'data') {
        return wavBuffer.slice(offset + 8, offset + 8 + size);
      }
      offset += 8 + size;
    }
  }
  // Fallback: assume 44-byte header
  return wavBuffer.slice(44);
}

/**
 * Resamples PCM16 LE audio from one sample rate to another using
 * linear interpolation.
 *
 * @param {ArrayBuffer} pcmBuffer  Raw PCM16 LE samples at srcRate
 * @param {number} srcRate         Source sample rate (e.g. 44100)
 * @param {number} dstRate         Target sample rate (e.g. 24000)
 * @returns {ArrayBuffer}          Resampled PCM16 LE samples at dstRate
 */
export function resamplePcm16(pcmBuffer, srcRate, dstRate) {
  if (srcRate === dstRate) return pcmBuffer;

  const src = new Int16Array(pcmBuffer);
  const ratio = srcRate / dstRate;
  const dstLength = Math.floor(src.length / ratio);
  const dst = new Int16Array(dstLength);

  for (let i = 0; i < dstLength; i++) {
    const srcIndex = i * ratio;
    const idx = Math.floor(srcIndex);
    const frac = srcIndex - idx;
    const s0 = src[idx] || 0;
    const s1 = src[Math.min(idx + 1, src.length - 1)] || 0;
    dst[i] = Math.round(s0 + frac * (s1 - s0));
  }

  return dst.buffer;
}
