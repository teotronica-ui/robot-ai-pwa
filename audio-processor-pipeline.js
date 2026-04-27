// ═══════════════════════════════════════════════════════════════
// audio-processor.js
// AudioWorklet PCM16 processor — ping-pong buffer, zero alloc nel loop
// Cattura i frame mono dall'input, applica gain, accumula in un buffer
// fisso e invia il chunk al main thread quando è pieno.
// ═══════════════════════════════════════════════════════════════
class PCM16Processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    // Chunk size in sample @ sample-rate del contesto.
    // ~50ms a 48kHz = 2400 sample. Manteniamo un buffer fisso.
    const opts = (options && options.processorOptions) || {};
    this.chunkSize = opts.chunkSize || 2400;
    // Ping-pong: due buffer, ne riempio uno mentre l'altro è in volo.
    this.bufA = new Int16Array(this.chunkSize);
    this.bufB = new Int16Array(this.chunkSize);
    this.cur = this.bufA;
    this.alt = this.bufB;
    this.idx = 0;
    this.gain = 1.0;
    this.stopped = false;

    this.port.onmessage = (e) => {
      const d = e.data || {};
      if (d.cmd === 'gain') {
        // Clamp 0..3 — sicurezza
        this.gain = Math.max(0, Math.min(3, +d.value || 0));
      } else if (d.cmd === 'stop') {
        this.stopped = true;
      } else if (d.cmd === 'chunk') {
        // riconfigurazione runtime opzionale
        const n = +d.value | 0;
        if (n >= 256 && n <= 16384) {
          this.chunkSize = n;
          this.bufA = new Int16Array(n);
          this.bufB = new Int16Array(n);
          this.cur = this.bufA;
          this.alt = this.bufB;
          this.idx = 0;
        }
      }
    };
  }

  process(inputs) {
    if (this.stopped) return false;
    const input = inputs[0];
    if (!input || !input.length) return true;
    const ch = input[0];
    if (!ch) return true;

    const g = this.gain;
    const cur = this.cur;
    const cs = this.chunkSize;
    let idx = this.idx;

    for (let i = 0; i < ch.length; i++) {
      // float [-1..1] → int16, clamp + clip
      let s = ch[i] * g;
      if (s > 1) s = 1; else if (s < -1) s = -1;
      cur[idx++] = (s * 0x7FFF) | 0;
      if (idx === cs) {
        // chunk pieno: invia l'ArrayBuffer (transfer, no copia)
        // creiamo una copia per il transfer per non perdere il buffer
        const out = new Int16Array(cs);
        out.set(cur);
        this.port.postMessage(out.buffer, [out.buffer]);
        // ping-pong
        const tmp = this.cur;
        this.cur = this.alt;
        this.alt = tmp;
        idx = 0;
      }
    }
    this.idx = idx;
    return true;
  }
}
registerProcessor('pcm16-processor', PCM16Processor);
