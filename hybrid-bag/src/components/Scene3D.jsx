import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
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

// Easing : montée lente puis décélération (effet émergence de l'eau)
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 4);
}

export default function Scene3D() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ─── Renderer ───────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      outputBufferType: THREE.HalfFloatType,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.52;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x050508, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // ─── Scene & Camera ─────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.05,
      20000,
    );
    camera.position.set(0, 1.2, 3.0);
    camera.lookAt(0, 0.5, 0);

    // ─── Post-processing (Bloom) ─────────────────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.18,
      0.35,
      0.88,
    );
    composer.addPass(bloomPass);

    // ─── OrbitControls ───────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.5, 0);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.rotateSpeed = 0.7;
    controls.minDistance = 1.5;
    controls.maxDistance = 5.5;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI / 2 - 0.08;
    controls.autoRotate = false;
    controls.update();

    // ─── Sky ────────────────────────────────────────────────────────────────
    scene.background = createSkyGradientTexture();

    // ─── HDRI environment ────────────────────────────────────────────────────
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    new RGBELoader().load(
      HDRI_PATH,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = pmremGenerator.fromEquirectangular(texture).texture;
        scene.environmentIntensity = 0.45; // HDRI pour les reflets seulement, pas l'éclairage
      },
      undefined,
      () => console.warn("HDRI non chargé — reflets réduits."),
    );

    // ─── Eau ────────────────────────────────────────────────────────────────
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
      sunColor: 0xe4c090,
      waterColor: 0x152535,
      distortionScale: 0.08,
      alpha: 0.96,
      fog: false,
    });
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0;
    water.material.transparent = true;
    water.material.uniforms["alpha"].value = 0.96;
    water.material.uniforms["size"].value = 58;
    scene.add(water);

    loadWaterNormals((texture) => {
      water.material.uniforms["normalSampler"].value = texture;
    });

    // ─── Lumières ────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x8899cc, 0.3);
    scene.add(ambientLight);

    // Lumière principale : devant-droite, douce
    const keyLight = new THREE.DirectionalLight(0xfff0e0, 1.0);
    keyLight.position.set(2, 4, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    scene.add(keyLight);

    // Fill gauche : légèrement bleuté
    const fillLight = new THREE.DirectionalLight(0xaabfff, 0.35);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    // Rim arrière : quasi éteint, juste un liseré
    const rimLight = new THREE.DirectionalLight(0xffd0a0, 0.08);
    rimLight.position.set(0, 3, -5);
    scene.add(rimLight);

    // ─── Chargement du sac GLB ───────────────────────────────────────────────
    const bagGroup = new THREE.Group();
    scene.add(bagGroup);

    // État de l'animation d'émergence (position Y + rotation Y)
    const emergence = {
      active: false,
      startTime: 0,
      duration: 6000,
      startY: 0,
      targetY: 0,
      startRotY: Math.PI * 2,  // dos à la caméra sous l'eau
      targetRotY: Math.PI,     // face perforée vers la caméra une fois émergé
    };

    const loader = new GLTFLoader();
    loader.load(
      "/models/codebag.glb",
      (gltf) => {
        const model = gltf.scene;

        // Auto-scale : normalise le sac à ~1.5 unités de hauteur
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.5 / maxDim;
        model.scale.setScalar(scale);

        // Centre le modèle horizontalement, base à y = 0
        model.position.x = -center.x * scale;
        model.position.z = -center.z * scale;
        model.position.y = -center.y * scale + (size.y * scale) / 2;

        // Ombres
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = false;
          }
        });

        bagGroup.add(model);

        // Position + rotation initiales (sous l'eau, dos à la caméra)
        emergence.targetY = 0.05;
        emergence.startY = -size.y * scale * 1.2;
        bagGroup.position.y = emergence.startY;
        bagGroup.rotation.y = emergence.startRotY;
        emergence.active = true;
        emergence.startTime = performance.now();
      },
      undefined,
      (err) => console.error("Erreur chargement GLB :", err),
    );

    // ─── Boucle d'animation ──────────────────────────────────────────────────
    const timer = new THREE.Timer();
    let animationId;

    function animate() {
      animationId = requestAnimationFrame(animate);
      timer.update(performance.now());
      const t = timer.getElapsed();

      // Eau
      water.material.uniforms["time"].value = t * 0.38;

      // Émergence du sac : monte ET tourne vers la caméra
      if (emergence.active) {
        const elapsed = performance.now() - emergence.startTime;
        const progress = Math.min(elapsed / emergence.duration, 1);
        const eased = easeOutCubic(progress);
        bagGroup.position.y =
          emergence.startY + (emergence.targetY - emergence.startY) * eased;
        bagGroup.rotation.y =
          emergence.startRotY + (emergence.targetRotY - emergence.startRotY) * eased;
        if (progress >= 1) emergence.active = false;
      }

      controls.update();
      composer.render();
    }
    animate();

    // ─── Resize ──────────────────────────────────────────────────────────────
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
      controls.dispose();
      pmremGenerator.dispose();
      composer.dispose();
      renderer.dispose();
      if (container && renderer.domElement)
        container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="scene-container" />;
}
