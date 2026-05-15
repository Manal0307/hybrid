import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export const BOTTLE_SCROLL_VH = 4;

const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/v1/decoders/";

/** Compense la conversion Blender → glTF (lumens / candela mal interprétés
 *  par three.js). Sans ça, l'éclairage Blender est ~50× trop sombre dans le
 *  navigateur. Ajuste si trop clair / trop sombre. */
const LIGHT_INTENSITY_BOOST = 50;

/* ════════════════════════════════════════════════════════════════════════════
   CAMÉRA MANUELLE (saisis tes valeurs Blender ici)
   ────────────────────────────────────────────────────────────────────────────
   Dans Blender, sélectionne Camera.001 → panneau N → onglet "Item" pour la
   Location et Rotation, puis onglet "Object Data Properties" (icône caméra
   verte dans Properties) → Lens pour le Focal Length / Field of View.
   ════════════════════════════════════════════════════════════════════════════ */
const BLENDER_CAMERA = {
  // Position de la caméra dans Blender (axes Blender : Z = haut)
  location: { x: -0.23127, y: -1.3755, z: 0.43646 },

  // Rotation Euler XYZ en degrés (panneau N → Rotation)
  rotation: { x: 101.6, y: -0.000064, z: 2 },

  // Field of View vertical en degrés.
  //   Calculé depuis : Focal Length 22mm, Sensor Size 34mm (Auto fit, render 16:9)
  //   → sensor_v = 34 × 9/16 = 19.125mm
  //   → FOV_v = 2 × atan(19.125 / (2 × 22)) ≈ 47°
  fov: 47,

  // Distances de clipping (Camera Properties → Lens → Clip Start / End)
  near: 0.2,
  far: 1000,
};

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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);

    let ready = false;

    const scene = new THREE.Scene();

    // Environnement neutre (Blender n'exporte pas son World en glTF) — sans
    // ça les matériaux PBR (verre, métal, plastique réfléchissant) sont noirs.
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // Caméra de secours uniquement le temps du chargement.
    const fallbackCamera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    let activeCamera = fallbackCamera;

    const camInitialPos = new THREE.Vector3();
    let travelAmount = 0;
    /** Distance à parcourir au scroll, en % de la distance initiale de la
     *  caméra à l'origine. Positif = la caméra avance vers la scène. Mets
     *  une valeur négative pour reculer, 0 pour ne pas bouger. */
    const SCROLL_FORWARD_RATIO = 1.25;
    /** Plus la valeur est basse, plus le mouvement suit le scroll en douceur
     *  (plus « fluide », un peu plus de latence). Entre 2 et 8 en général. */
    const SCROLL_SMOOTH_LAMBDA = 5.5;
    /** Courbe d'easing appliquée à la progression du scroll. easeOutCubic :
     *  réactif au début (la caméra bouge dès les premiers pixels de scroll),
     *  puis ralentit en arrivant à destination. */
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    Promise.all([
      gltfLoader.loadAsync("/models/bottle.glb"),
      gltfLoader.loadAsync("/models/fruits.glb"),
    ])
      .then(([bottleGltf, fruitsGltf]) => {
        scene.add(bottleGltf.scene);
        scene.add(fruitsGltf.scene);

        // Vire les caméras embarquées dans les GLB pour ne garder que la
        // caméra manuelle ci-dessous.
        scene.traverse((o) => {
          if (o.isPerspectiveCamera) o.removeFromParent();
        });

        scene.updateMatrixWorld(true);

        // ─── Caméra manuelle reconstruite depuis les chiffres Blender ────
        const manualCam = new THREE.PerspectiveCamera(
          BLENDER_CAMERA.fov,
          container.clientWidth / container.clientHeight,
          BLENDER_CAMERA.near,
          BLENDER_CAMERA.far,
        );

        // Conversion d'axes Blender (Z up) → three.js (Y up, +Y Up glTF export) :
        //   three.x =  blender.x
        //   three.y =  blender.z
        //   three.z = -blender.y
        manualCam.position.set(
          BLENDER_CAMERA.location.x,
          BLENDER_CAMERA.location.z,
          -BLENDER_CAMERA.location.y,
        );

        // Rotation : on construit dans l'espace Blender puis on bascule.
        const blenderEuler = new THREE.Euler(
          THREE.MathUtils.degToRad(BLENDER_CAMERA.rotation.x),
          THREE.MathUtils.degToRad(BLENDER_CAMERA.rotation.y),
          THREE.MathUtils.degToRad(BLENDER_CAMERA.rotation.z),
          "XYZ",
        );
        const qBlender = new THREE.Quaternion().setFromEuler(blenderEuler);
        // Compensation : Blender caméra regarde -Z local, three.js -Z local
        // aussi, mais Blender place -Z monde où three.js a -Y monde après +Y Up.
        // Rotation supplémentaire de -90° autour de X pour convertir Z-up → Y-up.
        const qAxisSwap = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          -Math.PI / 2,
        );
        manualCam.quaternion.copy(qAxisSwap).multiply(qBlender);

        manualCam.updateMatrixWorld(true);
        activeCamera = manualCam;
        scene.add(activeCamera);

        camInitialPos.copy(activeCamera.position);
        travelAmount = camInitialPos.length() * SCROLL_FORWARD_RATIO;

        scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
          if (child.isLight) {
            child.intensity *= LIGHT_INTENSITY_BOOST;
            if (child.shadow) {
              child.castShadow = true;
              child.shadow.mapSize.set(2048, 2048);
              child.shadow.bias = -0.0005;
            }
          }
        });

        renderer.render(scene, activeCamera);
        ready = true;
        onReady?.();
      })
      .catch((err) => {
        console.error("BottleScene load error:", err);
        onReady?.();
      });

    let animId;
    const clock = new THREE.Clock();
    let smoothScrollProgress = 0;
    const forwardVec = new THREE.Vector3();
    function animate() {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const yVh = window.scrollY / window.innerHeight;
      renderer.domElement.style.display =
        yVh < BOTTLE_SCROLL_VH ? "block" : "none";
      if (!ready) {
        renderer.clear();
        return;
      }

      const rawProgress = Math.min(1, Math.max(0, yVh / BOTTLE_SCROLL_VH));
      const targetProgress = easeOutCubic(rawProgress);
      smoothScrollProgress = THREE.MathUtils.damp(
        smoothScrollProgress,
        targetProgress,
        SCROLL_SMOOTH_LAMBDA,
        dt,
      );
      smoothScrollProgress = THREE.MathUtils.clamp(smoothScrollProgress, 0, 1);

      if (yVh >= BOTTLE_SCROLL_VH) return;

      // Avance de la caméra au scroll (effet du site). Axe local -Z = devant
      // la caméra dans three.js. Le progress est lissé pour éviter les à-coups.
      if (camInitialPos.lengthSq() > 0) {
        forwardVec.set(0, 0, -1).applyQuaternion(activeCamera.quaternion);
        activeCamera.position
          .copy(camInitialPos)
          .addScaledVector(forwardVec, smoothScrollProgress * travelAmount);
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
      dracoLoader.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="scene-container" />;
}
