class PCM16Processor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._active = true;
    this._gainValue = 1.0;
    this.port.onmessage = (e) => {
      if (e.data.cmd === 'stop') this._active = false;
      if (e.data.cmd === 'gain') this._gainValue = e.data.value;
    };
  }
  process(inputs) {
    if (!this._active) return false;
    const ch = inputs[0]?.[0];
    if (!ch) return true;
    const pcm = new Int16Array(ch.length);
    for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i] * this._gainValue));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    this.port.postMessage(pcm.buffer, [pcm.buffer]);
    return true;
  }
}
registerProcessor('pcm16-processor', PCM16Processor);
