import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { createWaterNormalsTexture } from "../utils/waterNormalsTexture";
import { loadWaterNormals } from "../utils/loadWaterNormals";

const SUN_ELEVATION = 20;
const SUN_AZIMUTH = 180;

const HDRI_PATH = new URL(
  "../map/hdri/table_mountain_1_puresky_2k.hdr",
  import.meta.url,
).href;

/** Gradient ciel type Viva La Labia : bleu violacé (haut) → rose pêche (horizon). Format équirectangulaire pour scene.background. */
function createSkyGradientTexture() {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  // Ciel : bleu violacé → rose pêche (effet Viva La Labia), bleus légèrement foncés
  gradient.addColorStop(0, "#161d6a");
  gradient.addColorStop(0.22, "#232d85");
  gradient.addColorStop(0.38, "#33419a");
  gradient.addColorStop(0.44, "#505eb5");
  gradient.addColorStop(0.48, "#9e8b8a");
  gradient.addColorStop(0.5, "#c9a9a0");
  gradient.addColorStop(0.52, "#b8958a");
  gradient.addColorStop(0.56, "#124a9e");
  gradient.addColorStop(0.75, "#0c3d8c");
  gradient.addColorStop(1, "#04182e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}

export default function Scene3D() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    // Vue au ras de l'eau : caméra basse, regard vers la surface et l'horizon.
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.05,
      20000,
    );
    camera.position.set(0, 0.45, 0.6);
    camera.lookAt(0, 0.85, -5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      outputBufferType: THREE.HalfFloatType,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.58;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x050508, 1);
    container.appendChild(renderer.domElement);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      1.5,
      0.4,
      0.85,
    );
    bloomPass.threshold = 0.88;
    bloomPass.strength = 0.18;
    bloomPass.radius = 0.35;
    renderer.setEffects([new RenderPass(scene, camera), bloomPass]);

    const sun = new THREE.Vector3();
    function updateSun() {
      const phi = THREE.MathUtils.degToRad(90 - SUN_ELEVATION);
      const theta = THREE.MathUtils.degToRad(SUN_AZIMUTH);
      sun.setFromSphericalCoords(1, phi, theta);
      if (water)
        water.material.uniforms["sunDirection"].value.copy(sun).normalize();
    }

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
    const water = new Water(waterGeometry, {
      textureWidth: 2048,
      textureHeight: 2048,
      clipBias: 0.002,
      waterNormals: createWaterNormalsTexture(512),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xe4c090,
      waterColor: 0x152535,
      distortionScale: 0.08,
      alpha: 0.96,
      fog: false,
    });
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0;
    scene.add(water);

    scene.background = createSkyGradientTexture();

    // Groupe pour le sac : posé sur l'eau (pas un grand océan, vue proche).
    // Garde le sac à y = 0 (surface) ou pieds à y = 0 pour qu'il soit "sur" l'eau.
    const bagGroup = new THREE.Group();
    bagGroup.position.set(0, 0, -6);
    scene.add(bagGroup);
    // Plus tard : charger ton modèle 3D, bagGroup.add(sacMesh), et positionner
    // sacMesh pour que la base soit à y = 0 (sur la surface).

    water.material.transparent = true;
    water.material.uniforms["alpha"].value = 0.96;
    water.material.uniforms["size"].value = 58;
    loadWaterNormals((texture) => {
      water.material.uniforms["normalSampler"].value = texture;
    });
    updateSun();

    function applyHDRI(texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = pmremGenerator.fromEquirectangular(texture).texture;
      // On garde le gradient en fond ; le HDRI sert à l'éclairage et aux reflets.
    }

    const rgbelLoader = new RGBELoader();
    rgbelLoader.load(
      HDRI_PATH,
      (texture) => applyHDRI(texture),
      undefined,
      () => {
        console.warn(
          "HDRI non chargé. Vérifie que table_mountain_1_puresky_2k.hdr est dans src/map/hdri/",
        );
        scene.background = createSkyGradientTexture();
      },
    );

    const timer = new THREE.Timer();
    let animationId;

    function animate() {
      animationId = requestAnimationFrame(animate);
      timer.update(performance.now());
      const t = timer.getElapsed();
      water.material.uniforms["time"].value = t * 0.38;
      renderer.render(scene, camera);
    }
    animate();

    function onResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      bloomPass.resolution.set(w, h);
    }
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animationId);
      pmremGenerator.dispose();
      renderer.dispose();
      if (container && renderer.domElement)
        container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="scene-container" />;
}
