import { useEffect } from "react";
import { Link } from "react-router-dom";

const ITEMS = [
  {
    num: "01", label: "Materials", sub: "Les matières du sac",
    to: "/materials", color: "#8855cc",
  },
  {
    num: "02", label: "Contact", sub: "Nous écrire",
    to: "#contact", color: "#2288cc",
  },
  {
    num: "03", label: "Process", sub: "Comment c'est fait",
    to: "#process", color: "#228855",
  },
  {
    num: "04", label: "À Propos", sub: "Notre mission",
    to: "#about", color: "#bb8820",
  },
  {
    num: "05", label: "FAQ", sub: "Questions fréquentes",
    to: "#faq", color: "#558899",
  },
  {
    num: "06", label: "Mentions\nlégales", sub: "Confidentialité",
    to: "#legal", color: "#446688",
  },
];

export default function MenuOverlay({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);

    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="mo-overlay" role="dialog" aria-modal="true" aria-label="Menu principal">
      <div className="mo-backdrop" onClick={onClose} />

      <div className="mo-panel">
        {/* Grid 3×2 */}
        <div className="mo-grid">
          {ITEMS.map((item, i) => (
            <Link
              key={item.num}
              to={item.to}
              className="mo-card"
              style={{ "--c": item.color, animationDelay: `${0.04 + i * 0.055}s` }}
              onClick={onClose}
            >
              <span className="mo-card-num">{item.num}</span>
              <div className="mo-card-body">
                <span className="mo-card-label">
                  {item.label.split("\n").map((l, j) => <span key={j}>{l}</span>)}
                </span>
                <span className="mo-card-sub">{item.sub}</span>
              </div>
              {/* Glow orb */}
              <div className="mo-card-glow" />
            </Link>
          ))}
        </div>

        {/* Footer */}
        <p className="mo-footer">© 2025 Hybrid — Bruxelles</p>
      </div>
    </div>
  );
}
