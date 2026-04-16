import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export const BOTTLE_SCROLL_VH = 4;

const CAM_X = 1.48;
const CAM_Z = 0.65;
const CAM_Y_START = 2.45;
const CAM_Y_END = 1.7;
const CAM_FOV_START = 26;
const CAM_FOV_END = 20;
const CAM_LOOK_AT = new THREE.Vector3(1.48, 0.02, 0.65);

function createBeachBackground() {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.00, "#b8daf5");
  g.addColorStop(0.35, "#e8c99a");
  g.addColorStop(0.65, "#d4a96a");
  g.addColorStop(1.00, "#c19050");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}

export default function BottleScene({ onReady }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ─── Renderer ────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    // Visible par défaut — c'est la première scène (y=0)
    renderer.domElement.style.display = "block";

    // ─── Scene & Camera ──────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = createBeachBackground();

    const camera = new THREE.PerspectiveCamera(
      CAM_FOV_START,
      container.clientWidth / container.clientHeight,
      0.05,
      1000,
    );
    camera.position.set(CAM_X, CAM_Y_START, CAM_Z);
    camera.lookAt(CAM_LOOK_AT);

    // ─── Post-processing ─────────────────────────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        0.10, 0.3, 0.92,
      ),
    );

    // ─── Éclairage plage ─────────────────────────────────────────────────────
    // Soleil zénithal chaud
    const sun = new THREE.DirectionalLight(0xfff4d6, 3.0);
    sun.position.set(2, 10, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -6;
    sun.shadow.camera.right = 6;
    sun.shadow.camera.top = 6;
    sun.shadow.camera.bottom = -6;
    scene.add(sun);

    // Hémisphère ciel / sable
    scene.add(new THREE.HemisphereLight(0x9ecfef, 0xc8a06a, 1.4));

    // Contre-jour doux
    const rim = new THREE.DirectionalLight(0xffecd0, 0.5);
    rim.position.set(-3, 4, -2);
    scene.add(rim);

    // ─── Chargement GLB ──────────────────────────────────────────────────────
    new GLTFLoader().load(
      "/models/bottlescene.glb",
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        model.position.sub(center);
        model.scale.setScalar(4.0 / maxDim);
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        scene.add(model);
        onReady?.();
      },
      undefined,
      (err) => { console.error("bottlescene.glb error:", err); onReady?.(); },
    );

    // ─── Boucle d'animation ──────────────────────────────────────────────────
    let animId;

    function animate() {
      animId = requestAnimationFrame(animate);
      const yVh = window.scrollY / window.innerHeight;
      const active = yVh < BOTTLE_SCROLL_VH;

      // Cache le canvas quand ce n'est pas la phase bouteille
      renderer.domElement.style.display = active ? "block" : "none";
      if (!active) return;

      const progress = Math.min(1, yVh / BOTTLE_SCROLL_VH);
      camera.position.set(
        CAM_X,
        THREE.MathUtils.lerp(CAM_Y_START, CAM_Y_END, progress),
        CAM_Z,
      );
      camera.fov = THREE.MathUtils.lerp(CAM_FOV_START, CAM_FOV_END, progress);
      camera.lookAt(CAM_LOOK_AT);
      camera.updateProjectionMatrix();

      composer.render();
    }

    animate();

    // ─── Resize ──────────────────────────────────────────────────────────────
    function onResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      composer.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="scene-container" />;
}
