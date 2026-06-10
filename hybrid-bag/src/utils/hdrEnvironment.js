import * as THREE from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

const textureCache = new Map();

export function loadHdrTexture(url) {
  if (textureCache.has(url)) return textureCache.get(url);

  const promise = new Promise((resolve, reject) => {
    new HDRLoader().load(
      url,
      (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        resolve(tex);
      },
      undefined,
      reject,
    );
  });

  textureCache.set(url, promise);
  return promise;
}

export function applyHdrEnvironment(scene, pmrem, url) {
  return loadHdrTexture(url).then((tex) => {
    scene.environment = pmrem.fromEquirectangular(tex).texture;
    return scene.environment;
  });
}
