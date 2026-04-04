import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
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

const STORY_BLOCKS = [
  {
    title: "Born from the Ocean",
    body: "The Hybrid Bag draws its essence from the sea \u2014 a living, breathing material ecosystem. Every texture, every fibre echoes the rhythm of waves and the resilience of marine life.",
  },
  {
    title: "Engineered by Nature",
    body: "We partnered with bio-engineers to transform agricultural waste and ocean debris into high-performance materials. No petroleum. No compromise. Pure innovation grown from the earth.",
  },
  {
    title: "Designed to Return",
    body: "Every component is fully circular. At end-of-life, the bag decomposes safely \u2014 or gets reprocessed into new material. From ocean, to object, back to ocean.",
  },
];

const PROCESS_STEPS = [
  {
    num: "01",
    title: "Source",
    body: "Raw bio-materials are harvested from regenerative farms and ocean clean-up initiatives across three continents.",
  },
  {
    num: "02",
    title: "Transform",
    body: "Through proprietary low-energy processes, raw matter becomes high-grade textile, composite, and leather alternatives.",
  },
  {
    num: "03",
    title: "Craft",
    body: "Each bag is assembled by hand in our Brussels atelier, where traditional craftsmanship meets programmable design.",
  },
];

function useScrollReveal() {
  const refs = useRef([]);
  const register = useCallback((el) => {
    if (el && !refs.current.includes(el)) refs.current.push(el);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) e.target.classList.add("visible");
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    for (const el of refs.current) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return register;
}

function MaterialViewer({ material }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.cursor = "grab";
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
      renderer.domElement.style.cursor = "grabbing";
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
      renderer.domElement.style.cursor = "grab";
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

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointerleave", onUp);
      geo.dispose();
      mat.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [material]);

  return (
    <div className="material-viewer">
      <div className="material-viewer-scene" ref={mountRef} />
      <div className="material-viewer-info">
        <h3>{material.label}</h3>
        <p>{material.description}</p>
        <span className="material-viewer-hint">Drag to rotate</span>
      </div>
    </div>
  );
}

export default function Materials() {
  const [activeMaterial, setActiveMaterial] = useState(MATERIALS[0]);
  const leftMaterials = MATERIALS.slice(0, 2);
  const rightMaterials = MATERIALS.slice(2, 4);
  const reveal = useScrollReveal();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="materials-page">
      {/* Hero */}
      <section className="mat-hero">
        <div className="mat-hero-content">
          <span className="mat-hero-eyebrow">The Story Behind</span>
          <h1 className="mat-hero-title">Materials</h1>
          <p className="mat-hero-sub">
            Every element of the Hybrid Bag is crafted from next-generation
            bio-materials &mdash; engineered for performance, designed for the planet.
          </p>
          <div className="mat-hero-line" />
        </div>
        <div className="mat-hero-scroll-hint">
          <span>Scroll to explore</span>
          <div className="mat-hero-arrow" />
        </div>
      </section>

      {/* Storytelling */}
      <section className="mat-story">
        {STORY_BLOCKS.map((block, i) => (
          <div
            key={i}
            ref={reveal}
            className={`mat-story-block reveal ${i % 2 === 1 ? "reverse" : ""}`}
          >
            <div className="mat-story-text">
              <span className="mat-story-num">0{i + 1}</span>
              <h2>{block.title}</h2>
              <p>{block.body}</p>
            </div>
            <div className="mat-story-visual">
              <div className="mat-story-placeholder">
                <span>Visual {i + 1}</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Top-view transition */}
      <section className="mat-topview">
        <div className="mat-topview-placeholder reveal" ref={reveal}>
          <span>Top-view visual placeholder</span>
        </div>
        <div className="mat-topview-gradient" />
      </section>

      {/* Materials showcase */}
      <section className="mat-circles-section">
        <h2 className="reveal" ref={reveal}>Explore Our Materials</h2>
        <div className="mat-showcase reveal" ref={reveal}>
          <div className="mat-side-column">
            {leftMaterials.map((m) => (
              <button
                key={m.id}
                className={`mat-chip ${activeMaterial.id === m.id ? "active" : ""}`}
                onClick={() => setActiveMaterial(m)}
              >
                <span
                  className="mat-chip-swatch"
                  style={{ background: m.color }}
                  aria-hidden
                />
                <span className="mat-chip-label">{m.label}</span>
              </button>
            ))}
          </div>

          <MaterialViewer material={activeMaterial} />

          <div className="mat-side-column">
            {rightMaterials.map((m) => (
              <button
                key={m.id}
                className={`mat-chip ${activeMaterial.id === m.id ? "active" : ""}`}
                onClick={() => setActiveMaterial(m)}
              >
                <span
                  className="mat-chip-swatch"
                  style={{ background: m.color }}
                  aria-hidden
                />
                <span className="mat-chip-label">{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="mat-process">
        <h2 className="reveal" ref={reveal}>The Process</h2>
        <div className="mat-process-steps">
          {PROCESS_STEPS.map((step, i) => (
            <div
              key={i}
              ref={reveal}
              className="mat-process-step reveal"
              style={{ transitionDelay: `${i * 0.18}s` }}
            >
              <span className="mat-process-num">{step.num}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
        <div className="mat-process-line reveal" ref={reveal} />
      </section>

      {/* Video */}
      <section className="mat-video-section">
        <h2 className="reveal" ref={reveal}>The Making Of</h2>
        <div className="mat-video-wrapper reveal" ref={reveal}>
          <iframe
            className="mat-video"
            src="https://www.youtube.com/embed/nusOkCRcjlw?rel=0"
            title="Hybrid materials video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </section>

      {/* Return */}
      <section className="mat-return">
        <div className="reveal" ref={reveal}>
          <h2>Return to the Ocean</h2>
          <Link to="/" className="mat-return-link">
            Back to the beginning
          </Link>
        </div>
      </section>
    </div>
  );
}
