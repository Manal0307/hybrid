import * as THREE from "three";
import { createWaterNormalsTexture } from "./waterNormalsTexture";

const TEXTURE_BASE = "/textures";

/**
 * Bundled with the app (Vite) so water normals always resolve after clone,
 * even if dev server or paths differ between machines.
 */
const MAP_WATERVIVA_URL = new URL(
  "../map/textures/waterviva.png",
  import.meta.url,
).href;

/** Fallbacks in public/textures/ (development / overrides). */
const TEXTURE_PATHS = [
  "water.jpg",
  "waternormals.jpg",
  "waternormal3.jpg",
];

const TRY_URLS = [MAP_WATERVIVA_URL, ...TEXTURE_PATHS.map((f) => `${TEXTURE_BASE}/${f}`)];

function applyTexture(texture) {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
}

/**
 * Loads water normal map: bundled asset first, then public/textures/, then procedural.
 */
export function loadWaterNormals(onLoaded) {
  const loader = new THREE.TextureLoader();
  const fallback = createWaterNormalsTexture(512);

  let index = 0;

  function tryNext() {
    if (index >= TRY_URLS.length) {
      onLoaded(fallback);
      return;
    }
    const path = TRY_URLS[index];
    index += 1;
    loader.load(
      path,
      (texture) => {
        applyTexture(texture);
        onLoaded(texture);
      },
      undefined,
      tryNext,
    );
  }

  tryNext();
}
