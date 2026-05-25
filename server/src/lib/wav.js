import fs from 'node:fs/promises';

export const PCM_SAMPLE_RATE = 24000;
export const PCM_CHANNELS = 1;
export const PCM_BITS_PER_SAMPLE = 16;

const BYTE_RATE = PCM_SAMPLE_RATE * PCM_CHANNELS * (PCM_BITS_PER_SAMPLE / 8);
const BLOCK_ALIGN = PCM_CHANNELS * (PCM_BITS_PER_SAMPLE / 8);

export function buildWavHeader({ dataSize = 0xffffffff } = {}) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  const riffSize = dataSize === 0xffffffff ? 0xffffffff : dataSize + 36;
  header.writeUInt32LE(riffSize >>> 0, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(PCM_CHANNELS, 22);
  header.writeUInt32LE(PCM_SAMPLE_RATE, 24);
  header.writeUInt32LE(BYTE_RATE, 28);
  header.writeUInt16LE(BLOCK_ALIGN, 32);
  header.writeUInt16LE(PCM_BITS_PER_SAMPLE, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataSize >>> 0, 40);
  return header;
}

export async function fixWavHeader(filePath, dataBytes) {
  const fh = await fs.open(filePath, 'r+');
  try {
    const riffSize = Buffer.alloc(4);
    riffSize.writeUInt32LE(dataBytes + 36, 0);
    await fh.write(riffSize, 0, 4, 4);
    const dataSize = Buffer.alloc(4);
    dataSize.writeUInt32LE(dataBytes, 0);
    await fh.write(dataSize, 0, 4, 40);
  } finally {
    await fh.close();
  }
}
