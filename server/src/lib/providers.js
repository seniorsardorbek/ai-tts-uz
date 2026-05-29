import * as gemini from './gemini.js';
import * as elevenlabs from './elevenlabs.js';

const REGISTRY = {
  gemini: {
    streamAudio: gemini.streamTtsPcm,
    format: 'wav',
    contentType: 'audio/wav',
    fileExt: '.wav',
  },
  elevenlabs: {
    streamAudio: elevenlabs.streamAudio,
    format: 'mp3',
    contentType: 'audio/mpeg',
    fileExt: '.mp3',
  },
};

export function getProvider(name) {
  const p = REGISTRY[name];
  if (!p) throw new Error(`Unknown provider: ${name}`);
  return p;
}
