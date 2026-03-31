import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import "./Materials.css";

const HDRI_PATH = new URL(
  "../map/hdri/table_mountain_1_puresky_2k.hdr",
  import.meta.url,
).href;

const MATERIALS = [
  {
    id: "blueberry-leather",
    label: "Blueberry Leather",
    color: "#2a1a5e",
    description:
      "Sourced from organic blueberry waste, this leather-like material is soft, durable, and naturally pigmented.",
    threeColor: 0x2a1a5e,
    metalness: 0.3,
    roughness: 0.55,
  },
  {
    id: "ocean-textile",
    label: "Ocean Textile",
    color: "#0064a5",
    description:
      "Woven from recycled ocean plastics, this textile combines strength with a luxurious hand-feel.",
    threeColor: 0x0064a5,
    metalness: 0.1,
    roughness: 0.7,
  },
  {
    id: "bio-composite",
    label: "Bio Composite",
    color: "#4a7a3a",
    description:
      "A plant-based composite with the rigidity of carbon fibre. Lightweight, strong, fully compostable.",
    threeColor: 0x4a7a3a,
    metalness: 0.2,
    roughness: 0.45,
  },
  {
    id: "golden-mycelium",
    label: "Golden Mycelium",
    color: "#c9a050",
    description:
      "Grown from mushroom roots, this material mimics premium suede with a warm golden finish.",
    threeColor: 0xc9a050,
    metalness: 0.5,
    roughness: 0.35,
  },
];

function MaterialViewer({ material, onClose }) {
  const mountRef = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      40,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0, 3.5);

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    new RGBELoader().load(HDRI_PATH, (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = pmrem.fromEquirectangular(tex).texture;
    });

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(3, 4, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xaabbff, 0.4);
    fill.position.set(-3, 2, 2);
    scene.add(fill);

    const geo = new THREE.SphereGeometry(1, 128, 128);
    const mat = new THREE.MeshStandardMaterial({
      color: material.threeColor,
      metalness: material.metalness,
      roughness: material.roughness,
      envMapIntensity: 1.5,
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    const drag = { active: false, prevX: 0, velY: 0 };
    function onDown(e) {
      drag.active = true;
      drag.prevX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      drag.velY = 0;
    }
    function onMove(e) {
      if (!drag.active) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      drag.velY = (x - drag.prevX) * 0.008;
      mesh.rotation.y += drag.velY;
      drag.prevX = x;
    }
    function onUp() {
      drag.active = false;
    }
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointerleave", onUp);

    let raf;
    function animate() {
      raf = requestAnimationFrame(animate);
      if (!drag.active && Math.abs(drag.velY) > 0.0001) {
        mesh.rotation.y += drag.velY;
        drag.velY *= 0.95;
      }
      mesh.rotation.y += 0.003;
      renderer.render(scene, camera);
    }
    animate();

    function onResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    cleanupRef.current = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointerleave", onUp);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };

    return () => cleanupRef.current?.();
  }, [material]);

  return (
    <div className="material-viewer">
      <button className="material-viewer-close" onClick={onClose}>
        &times;
      </button>
      <div className="material-viewer-scene" ref={mountRef} />
      <div className="material-viewer-info">
        <h3>{material.label}</h3>
        <p>{material.description}</p>
      </div>
    </div>
  );
}

export default function Materials() {
  const [activeMaterial, setActiveMaterial] = useState(null);
  const videoRef = useRef(null);

  return (
    <div className="materials-page">
      {/* ─── Section 1 : Intro noire ──────────────────────────────────────── */}
      <section className="mat-intro">
        <h1>The Materials</h1>
        <p>
          Every element of the Hybrid Bag is crafted from next-generation
          bio-materials — engineered for performance, designed for the planet.
        </p>
      </section>

      {/* ─── Section 2 : Image placeholder sac top-view + dégradé blanc ──── */}
      <section className="mat-topview">
        <div className="mat-topview-placeholder">
          <span>Top-view visual placeholder</span>
        </div>
        <div className="mat-topview-gradient" />
      </section>

      {/* ─── Section 3 : Zone blanche — 4 cercles matériaux ───────────────── */}
      <section className="mat-circles-section">
        <h2>Explore Our Materials</h2>
        <div className="mat-circles">
          {MATERIALS.map((m) => (
            <button
              key={m.id}
              className="mat-circle"
              style={{ background: m.color }}
              onClick={() => setActiveMaterial(m)}
            >
              <span className="mat-circle-label">{m.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ─── Section 4 : Material 3D viewer (overlay) ─────────────────────── */}
      {activeMaterial && (
        <MaterialViewer
          material={activeMaterial}
          onClose={() => setActiveMaterial(null)}
        />
      )}

      {/* ─── Section 5 : Vidéo ────────────────────────────────────────────── */}
      <section className="mat-video-section">
        <div className="mat-video-wrapper">
          <video
            ref={videoRef}
            className="mat-video"
            playsInline
            controls
            muted
            poster=""
          >
            {/* <source src="/videos/materials.mp4" type="video/mp4" /> */}
          </video>
          <div className="mat-video-placeholder">
            <span>Video placeholder</span>
          </div>
        </div>
      </section>

      {/* ─── Section 6 : Retour à l'océan ─────────────────────────────────── */}
      <section className="mat-return">
        <h2>Return to the Ocean</h2>
        <Link to="/" className="mat-return-link">
          Back to the beginning
        </Link>
      </section>
    </div>
  );
}
