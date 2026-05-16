import * as THREE from "three";
import { createWaterNormalsTexture } from "./waterNormalsTexture";

const TEXTURE_BASE = "/textures";

/** Haute résolution en premier — évite water.jpg (400×400) qui donne l'effet « carrés ». */
const TEXTURE_PATHS = [
  "waternormals.jpg",
  "waternormal3.jpg",
  "waterviva.png",
];

function applyTexture(texture) {
  const w = texture.image?.width ?? 512;
  const repeat = w >= 1024 ? 3 : w >= 512 ? 4 : 5;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
}

/**
 * Charge une normal map eau depuis public/textures/.
 * Si aucun fichier ne charge, texture procédurale haute résolution.
 */
export function loadWaterNormals(onLoaded) {
  const loader = new THREE.TextureLoader();
  const fallback = createWaterNormalsTexture(1024);

  let index = 0;

  function tryNext() {
    if (index >= TEXTURE_PATHS.length) {
      onLoaded(fallback);
      return;
    }
    const path = `${TEXTURE_BASE}/${TEXTURE_PATHS[index]}`;
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
