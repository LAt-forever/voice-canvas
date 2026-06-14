import { buildPortraitCommand } from './portraitCommandBuilder';
import { generatePortraitImage } from './stabilityClient';

let worker = null;

export function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('../workers/portraitProcessor.js', import.meta.url), { type: 'module' });
  }
  return worker;
}

export function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

export function processImageInWorker(imageBitmap, config = {}) {
  return new Promise((resolve, reject) => {
    const w = getWorker();

    function handler(event) {
      w.removeEventListener('message', handler);
      if (event.data.type === 'PROCESS_COMPLETE') {
        resolve(event.data.result);
      } else {
        reject(new Error(event.data.error || 'Worker processing failed'));
      }
    }

    w.addEventListener('message', handler);
    w.postMessage({ type: 'PROCESS_IMAGE', imageBitmap, config });
  });
}

export async function portraitPipeline(rawCommand, env, callbacks = {}) {
  const { onStatus, onShapeUpdate, onComplete, onError } = callbacks;
  const command = buildPortraitCommand(rawCommand);
  const apiKey = env.VITE_STABILITY_API_KEY;
  const endpoint = env.VITE_STABILITY_API_ENDPOINT;
  const model = env.VITE_PORTRAIT_MODEL;

  if (!apiKey) {
    throw new Error('请配置 VITE_STABILITY_API_KEY');
  }

  onStatus?.('Generating portrait...');
  const imageBitmap = await generatePortraitImage(command.prompt, apiKey, endpoint, model);

  onStatus?.('Processing sketch...');
  const result = await processImageInWorker(imageBitmap, {
    targetSize: 256,
    edgeThreshold: { low: 20, high: 60 },
    simplifyTolerance: 1.2,
    hatchingDensity: 6,
    maxStrokes: 2000
  });

  onStatus?.('Drawing portrait...');
  onComplete?.({ ...command, strokes: result.strokes, totalLength: result.totalLength });
}
