import * as THREE from "three";
import { createWaterNormalsTexture } from "./waterNormalsTexture";

const TEXTURE_BASE = "/textures";

/** Une seule texture est utilisée : on essaie les chemins dans l'ordre, le premier qui charge gagne. */
const TEXTURE_PATHS = [
  "water.jpg",
  "waterviva.png",
  "waternormals.jpg",
  "waternormal3.jpg",
];

function applyTexture(texture) {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
}

/**
 * Charge une seule normal map eau depuis public/textures/.
 * Essaie les fichiers dans l'ordre ; si aucun ne charge, utilise la texture procédurale.
 */
export function loadWaterNormals(onLoaded) {
  const loader = new THREE.TextureLoader();
  const fallback = createWaterNormalsTexture(512);

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
