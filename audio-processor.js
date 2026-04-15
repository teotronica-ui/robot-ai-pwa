/**
 * PCM16 AudioWorklet Processor
 * 
 * Fix applicati rispetto alla versione precedente:
 * - Ping-pong buffer: zero allocazioni nel loop audio → meno GC → meno glitch
 * - Gestione chunk size variabile (sicurezza cross-browser)
 * - Gain applicato SOLO qui (rimosso il secondo passaggio in onChunk in openai.html)
 */
class PCM16Processor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._active = true;
    this._gainValue = 1.0;

    // Ping-pong buffer: due array alternati per evitare allocazioni nel loop audio.
    // WebAudio standard render quantum = 128 sample, ma gestiamo size variabile.
    this._bufs = [new Int16Array(128), new Int16Array(128)];
    this._bufIdx = 0;

    this.port.onmessage = (e) => {
      if (e.data.cmd === 'stop')  this._active = false;
      if (e.data.cmd === 'gain')  this._gainValue = Math.max(0, e.data.value);
    };
  }

  process(inputs) {
    if (!this._active) return false;

    const ch = inputs[0]?.[0];
    if (!ch || ch.length === 0) return true;

    // Assicura che il buffer corrente abbia la dimensione giusta
    // (normalmente 128, ma può variare su alcuni browser)
    if (this._bufs[this._bufIdx].length !== ch.length) {
      this._bufs[0] = new Int16Array(ch.length);
      this._bufs[1] = new Int16Array(ch.length);
    }

    const pcm = this._bufs[this._bufIdx];
    const gain = this._gainValue;

    for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i] * gain));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Trasferisce il buffer (zero-copy) e prepara il buffer dell'altro slot
    this.port.postMessage(pcm.buffer, [pcm.buffer]);
    this._bufs[this._bufIdx] = new Int16Array(ch.length);
    this._bufIdx ^= 1;

    return true;
  }
}

registerProcessor('pcm16-processor', PCM16Processor);
