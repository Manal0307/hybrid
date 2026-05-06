import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const BOTTLE_SCROLL_VH = 4;

/** Si le GLB contient une caméra Blender (export : cocher « Cameras »), on la réutilise. */
const PREFER_GLTF_CAMERA = true;

export default function BottleScene({ onReady }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0xd4a96a, 1); // même couleur que la scène → pas de flash
    container.appendChild(renderer.domElement);

    // Gate pour éviter le pop : on ne rend rien tant que la caméra Blender
    // n'est pas chargée et prête.
    let ready = false;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#d4a96a");

    const defaultCamera = new THREE.PerspectiveCamera(
      38,
      container.clientWidth / container.clientHeight,
      0.01,
      500,
    );
    defaultCamera.up.set(0, 1, 0);

    let activeCamera = defaultCamera;
    const camInitialPos = new THREE.Vector3();
    let backAmount = 0; // calculé après chargement (% de la distance cam initiale)
    const BACK_RATIO = 0.6; // 0.6 = la cam recule de 60% de sa distance initiale

    // ─── Éclairage cinématique « fin d'après-midi côtier » ──────────────────
    //
    // 1. SKY BOUNCE — hémisphère : simule la lumière du ciel (bleu doux qui
    //    remonte en bas, blanc chaud qui descend en haut). Donne la teinte
    //    subtile bleutée des zones à l'ombre sans rien aplatir.
    const sky = new THREE.HemisphereLight(
      0xfff1dc, // ciel : blanc légèrement chaud (≈5500K)
      0x8aa6c2, // sol : bleu-gris froid pour les ombres
      0.8,
    );
    scene.add(sky);

    // 2. SOLEIL — DirectionalLight rasante depuis le haut-gauche.
    //    Couleur crème chaude (≈5200K) — pas orange saturé, pour garder
    //    un rendu « naturel humide » plutôt que « désert sec ».
    const sun = new THREE.DirectionalLight(0xfff0cc, 3.2);
    sun.position.set(-5, 6, 3); // haut-gauche, angle d'incidence bas (~50°)
    sun.castShadow = true;

    // Ombres douces et lissées :
    sun.shadow.mapSize.set(4096, 4096); // haute résolution → bords fins
    sun.shadow.radius = 6; // flou PCF → bords diffus comme à travers l'air humide
    sun.shadow.blurSamples = 16; // qualité du flou
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.02;
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 30;
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    scene.add(sun);

    // 3. FILL FROID — contre-lumière bleue très douce depuis l'opposé,
    //    simule la diffusion atmosphérique marine : les ombres ne sont
    //    jamais vraiment noires, elles prennent une teinte cyan léger.
    const fill = new THREE.DirectionalLight(0xbcd4e8, 0.6);
    fill.position.set(4, 3, -3);
    scene.add(fill);

    // 4. RIM chaud subtil — lèche les crêtes depuis l'arrière, donne
    //    un léger halo doré qui souligne les reliefs sans dominer.
    const rim = new THREE.DirectionalLight(0xffe0b8, 0.35);
    rim.position.set(-2, 2, -5);
    scene.add(rim);

    // Exposure légèrement boostée pour le look cinématique chaud-doux
    renderer.toneMappingExposure = 1.15;

    function fitDefaultCameraToSphere(sphere) {
      const vfov = THREE.MathUtils.degToRad(defaultCamera.fov);
      const dist = Math.max(
        (sphere.radius / Math.sin(vfov / 2)) * 1.12,
        0.15,
      );
      const dir = new THREE.Vector3(0.5, 0.38, 0.55).normalize();
      defaultCamera.position.copy(dir.multiplyScalar(dist));
      defaultCamera.near = Math.max(dist * 1e-4, 0.005);
      defaultCamera.far = dist * 20;
      defaultCamera.lookAt(sphere.center);
      defaultCamera.updateProjectionMatrix();
    }

    new GLTFLoader().load(
      "/models/bottle.glb",
      (gltf) => {
        const model = gltf.scene;

        let embeddedCam = null;
        model.traverse((o) => {
          if (o.isPerspectiveCamera) embeddedCam = o;
        });
        if (!embeddedCam && gltf.cameras?.length) {
          embeddedCam = gltf.cameras[0];
        }

        const root = new THREE.Group();
        root.add(model);

        if (embeddedCam) {
          embeddedCam.removeFromParent();
          if (PREFER_GLTF_CAMERA) root.add(embeddedCam);
        }

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        model.position.sub(center);
        if (embeddedCam && PREFER_GLTF_CAMERA) {
          embeddedCam.position.sub(center);
        }

        const maxDim = Math.max(size.x, size.y, size.z, 1e-5);
        const targetSize = 1.35;
        root.scale.setScalar(targetSize / maxDim);
        scene.add(root);

        if (embeddedCam && PREFER_GLTF_CAMERA) {
          embeddedCam.aspect = container.clientWidth / container.clientHeight;
          embeddedCam.updateProjectionMatrix();
          embeddedCam.updateMatrixWorld(true);
          activeCamera = embeddedCam;
        } else {
          const sphere = new THREE.Sphere();
          new THREE.Box3().setFromObject(model).getBoundingSphere(sphere);
          fitDefaultCameraToSphere(sphere);
          activeCamera = defaultCamera;
        }

        camInitialPos.copy(activeCamera.position);
        backAmount = camInitialPos.length() * BACK_RATIO;

        // Premier rendu synchrone avec la bonne caméra AVANT d'annoncer ready
        activeCamera.updateMatrixWorld(true);
        renderer.render(scene, activeCamera);
        ready = true;

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
          if (child.isLight) {
            child.intensity *= 50; // compense la conversion Blender → glTF
            child.castShadow = true;
            if (child.shadow) {
              child.shadow.mapSize.set(2048, 2048);
              child.shadow.bias = -0.0005;
            }
          }
        });

        onReady?.();
      },
      undefined,
      (err) => {
        console.error("bottle.glb error:", err);
        onReady?.();
      },
    );

    let animId;
    const backVec = new THREE.Vector3();
    function animate() {
      animId = requestAnimationFrame(animate);
      const yVh = window.scrollY / window.innerHeight;
      renderer.domElement.style.display = yVh < BOTTLE_SCROLL_VH ? "block" : "none";
      if (yVh >= BOTTLE_SCROLL_VH) return;
      if (!ready) {
        renderer.clear(); // juste la couleur de fond, pas de caméra pourrie
        return;
      }

      // Recule la caméra le long de son axe de vue (local +Z = derrière la cam)
      if (camInitialPos.lengthSq() > 0) {
        const progress = Math.min(1, yVh / BOTTLE_SCROLL_VH);
        backVec.set(0, 0, 1).applyQuaternion(activeCamera.quaternion);
        activeCamera.position
          .copy(camInitialPos)
          .addScaledVector(backVec, progress * backAmount);
      }

      renderer.render(scene, activeCamera);
    }
    animate();

    function onResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      activeCamera.aspect = w / h;
      activeCamera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="scene-container" />;
}
