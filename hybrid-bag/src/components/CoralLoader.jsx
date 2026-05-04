import { useEffect, useState } from "react";

const ICONS = [
  "/loading/loading1.png",
  "/loading/loading2.png",
  "/loading/loading3.png",
];

const FRAME_DURATION_MS = 600;

export default function CoralLoader() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % ICONS.length);
    }, FRAME_DURATION_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="coral-loader-stack" aria-hidden="true">
      {ICONS.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`coral-loader ${i === index ? "is-active" : ""}`}
        />
      ))}
    </div>
  );
}
