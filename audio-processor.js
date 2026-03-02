{\rtf1\ansi\ansicpg1252\cocoartf1504\cocoasubrtf840
{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww10800\viewh8400\viewkind0
\pard\tx566\tx1133\tx1700\tx2267\tx2834\tx3401\tx3968\tx4535\tx5102\tx5669\tx6236\tx6803\pardirnatural\partightenfactor0

\f0\fs24 \cf0 /**\
 * audio-processor.js \'97 AudioWorklet PCM16\
 * DEVE essere un file separato (stesso dominio di index.html)\
 * Pubblicalo su GitHub Pages accanto a index.html\
 */\
\
class PCM16Processor extends AudioWorkletProcessor \{\
  constructor() \{\
    super();\
    this._active = true;\
    this._gainValue = 1.0;\
    this.port.onmessage = (e) => \{\
      if (e.data.cmd === 'stop') this._active = false;\
      if (e.data.cmd === 'gain') this._gainValue = e.data.value;\
    \};\
  \}\
\
  process(inputs) \{\
    if (!this._active) return false;\
    const ch = inputs[0]?.[0];\
    if (!ch) return true;\
\
    const pcm = new Int16Array(ch.length);\
    for (let i = 0; i < ch.length; i++) \{\
      const s = Math.max(-1, Math.min(1, ch[i] * this._gainValue));\
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;\
    \}\
    this.port.postMessage(pcm.buffer, [pcm.buffer]);\
    return true;\
  \}\
\}\
\
registerProcessor('pcm16-processor', PCM16Processor);}