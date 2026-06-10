import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
);

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

const cache = new Map();
const pending = new Map();

export function preloadGltf(url) {
  if (cache.has(url)) return Promise.resolve(cache.get(url));
  if (pending.has(url)) return pending.get(url);

  const promise = new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        cache.set(url, gltf);
        pending.delete(url);
        resolve(gltf);
      },
      undefined,
      (err) => {
        pending.delete(url);
        reject(err);
      },
    );
  });

  pending.set(url, promise);
  return promise;
}

export function cloneGltfScene(gltf) {
  return gltf.scene.clone(true);
}

export function preloadGltfBatch(urls, { staggerMs = 0 } = {}) {
  if (!staggerMs) {
    return Promise.allSettled(urls.map((url) => preloadGltf(url)));
  }

  return urls.reduce(
    (chain, url, index) =>
      chain.then(() =>
        new Promise((resolve) => {
          const delay = index * staggerMs;
          window.setTimeout(() => {
            preloadGltf(url).finally(resolve);
          }, delay);
        }),
      ),
    Promise.resolve(),
  );
}
