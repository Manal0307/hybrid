import { useAmbientSound } from "../context/AmbientSoundContext";

export default function SoundButton() {
  const { muted, toggleMuted } = useAmbientSound();

  function handleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    toggleMuted();
  }

  function handlePointerDown(event) {
    event.stopPropagation();
  }

  return (
    <button
      type="button"
      className={`sound-button${muted ? " sound-button--muted" : ""}`}
      aria-label={muted ? "Unmute ambient sound" : "Mute ambient sound"}
      aria-pressed={muted}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 14.5V9.5H8.1L12 6.2V17.8L8.1 14.5H5Z" />
        {!muted && (
          <>
            <path d="M15.2 9.2C16.3 10.1 16.9 11 16.9 12C16.9 13 16.3 13.9 15.2 14.8" />
            <path d="M17.6 6.9C19.5 8.3 20.5 10 20.5 12C20.5 14 19.5 15.7 17.6 17.1" />
          </>
        )}
        {muted && (
          <line
            className="sound-button__mute-line"
            x1="5"
            y1="5"
            x2="19"
            y2="19"
          />
        )}
      </svg>
    </button>
  );
}
