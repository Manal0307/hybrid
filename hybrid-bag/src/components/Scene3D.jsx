import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// OrbitControls retiré : on fait tourner le sac directement, pas la caméra
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
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

/* Scroll thresholds (multiples of window.innerHeight) */
const DESCENT_END = 1.8;
const EMERGENCE_START = 7.5;
const EMERGENCE_END = 9.0;

function createSkyGradientTexture() {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
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

    // ─── Renderer ─────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      outputBufferType: THREE.HalfFloatType,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x050508, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // ─── Scene & Camera ───────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.05,
      20000,
    );
    camera.position.set(0, 0.35, 3.2);
    camera.lookAt(0, 0.6, -2);

    // ─── Post-processing (Bloom) ──────────────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.18,
      0.35,
      0.88,
    );
    composer.addPass(bloomPass);

    // ─── Drag-to-rotate (sac uniquement, caméra fixe) ──────────────────────
    const drag = { active: false, prevX: 0, velocityY: 0, productPhase: false };

    function onPointerDown(e) {
      if (!drag.productPhase) return;
      drag.active = true;
      drag.prevX = e.clientX;
      drag.velocityY = 0;
    }
    function onPointerMove(e) {
      if (!drag.active) return;
      const dx = e.clientX - drag.prevX;
      drag.velocityY = dx * 0.006;
      bagGroup.rotation.y += drag.velocityY;
      drag.prevX = e.clientX;
    }
    function onPointerUp() {
      drag.active = false;
    }
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onPointerUp);

    // ─── Sky ──────────────────────────────────────────────────────────────
    scene.background = createSkyGradientTexture();

    // ─── HDRI environment ─────────────────────────────────────────────────
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    new RGBELoader().load(
      HDRI_PATH,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = pmremGenerator.fromEquirectangular(texture).texture;
        scene.environmentIntensity = 0.45;
      },
      undefined,
      () => console.warn("HDRI non chargé — reflets réduits."),
    );

    // ─── Eau ──────────────────────────────────────────────────────────────
    const sun = new THREE.Vector3();
    const phi = THREE.MathUtils.degToRad(90 - SUN_ELEVATION);
    const theta = THREE.MathUtils.degToRad(SUN_AZIMUTH);
    sun.setFromSphericalCoords(1, phi, theta);

    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
    const water = new Water(waterGeometry, {
      textureWidth: 2048,
      textureHeight: 2048,
      clipBias: 0.002,
      waterNormals: createWaterNormalsTexture(512),
      sunDirection: sun.clone().normalize(),
      sunColor: 0xffffff,
      waterColor: 0x0064a5,
      distortionScale: 0.12,
      alpha: 1.0,
      fog: false,
    });
    water.rotation.x = -Math.PI / 2;
    water.material.transparent = true;
    water.material.uniforms["alpha"].value = 1.0;
    water.material.transparent = false;
    water.material.uniforms["size"].value = 28;

    // Renforcer les normales pour des vagues plus marquées
    water.material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "noise.xzy * vec3( 1.5, 1.0, 1.5 )",
        "noise.xzy * vec3( 1.8, 1.0, 1.8 )",
      );
    };

    scene.add(water);

    loadWaterNormals((texture) => {
      water.material.uniforms["normalSampler"].value = texture;
    });

    // ─── Lumières ─────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x8899cc, 0.3));

    const keyLight = new THREE.DirectionalLight(0xfff0e0, 1.0);
    keyLight.position.set(2, 4, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xaabfff, 0.35);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffd0a0, 0.08);
    rimLight.position.set(0, 3, -5);
    scene.add(rimLight);

    // ─── Sac GLB ──────────────────────────────────────────────────────────
    const bagGroup = new THREE.Group();
    bagGroup.position.z = -1.2;
    scene.add(bagGroup);

    const bagAnim = {
      yTop: 2.8,
      yBottom: -1.8,
      ySurface: 0.05,
      loaded: false,
    };

    new GLTFLoader().load(
      "/models/codebag.glb",
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const s = 1.5 / maxDim;
        model.scale.setScalar(s);
        model.position.set(
          -center.x * s,
          -center.y * s + (size.y * s) / 2,
          -center.z * s,
        );
        model.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = false;
          }
        });
        bagGroup.add(model);

        const h = size.y * s;
        bagAnim.yTop = Math.max(2.8, h * 2.5);
        bagAnim.yBottom = -(h + 0.5);
        bagAnim.ySurface = 0.05;
        bagAnim.loaded = true;
        bagGroup.rotation.y = Math.PI;
      },
      undefined,
      (err) => console.error("Erreur chargement GLB :", err),
    );

    // ─── Boucle d'animation ───────────────────────────────────────────────
    const timer = new THREE.Timer();
    let animationId;
    let wasProduct = false;

    function animate() {
      animationId = requestAnimationFrame(animate);
      timer.update(performance.now());
      water.material.uniforms["time"].value = timer.getElapsed() * 0.25;

      if (bagAnim.loaded) {
        const vh = window.innerHeight;
        const y = window.scrollY;

        if (y <= DESCENT_END * vh) {
          const p = y / (DESCENT_END * vh);
          bagGroup.position.y = THREE.MathUtils.lerp(
            bagAnim.yTop,
            bagAnim.yBottom,
            p,
          );
          bagGroup.rotation.y = Math.PI;
        } else if (y <= EMERGENCE_START * vh) {
          bagGroup.position.y = bagAnim.yBottom;
        } else if (y <= EMERGENCE_END * vh) {
          const p =
            (y - EMERGENCE_START * vh) /
            ((EMERGENCE_END - EMERGENCE_START) * vh);
          bagGroup.position.y = THREE.MathUtils.lerp(
            bagAnim.yBottom,
            bagAnim.ySurface,
            p,
          );
          bagGroup.rotation.y = Math.PI + p * Math.PI * 0.25;
        } else {
          bagGroup.position.y = bagAnim.ySurface;
        }

        const isProduct = y >= EMERGENCE_END * vh;
        if (isProduct !== wasProduct) {
          container.style.pointerEvents = isProduct ? "auto" : "none";
          drag.productPhase = isProduct;
          wasProduct = isProduct;
        }

        // Inertie : le sac continue de tourner doucement après le drag
        if (
          drag.productPhase &&
          !drag.active &&
          Math.abs(drag.velocityY) > 0.0001
        ) {
          bagGroup.rotation.y += drag.velocityY;
          drag.velocityY *= 0.95;
        }
      }

      composer.render();
    }
    animate();

    // ─── Resize ───────────────────────────────────────────────────────────
    function onResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
    }
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animationId);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerUp);
      pmremGenerator.dispose();
      composer.dispose();
      renderer.dispose();
      if (container && renderer.domElement)
        container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="scene-container" />;
}
