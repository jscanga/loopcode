import { useEffect, useRef } from "react";

/**
 * A tiny dependency-free confetti burst. Renders a full-screen canvas overlay,
 * animates ~150 falling/rotating pieces for a couple of seconds, then removes
 * itself. Used to celebrate clearing the daily review queue.
 */
export function Confetti({ onDone }: { onDone?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = ["#58cc02", "#1cb0f6", "#ce82ff", "#ffc800", "#ff4b4b", "#ff9600"];
    const pieces = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height * 0.5,
      w: (6 + Math.random() * 8) * dpr,
      h: (8 + Math.random() * 10) * dpr,
      vy: (2 + Math.random() * 4) * dpr,
      vx: (Math.random() - 0.5) * 3 * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const start = performance.now();
    const DURATION = 2600;
    let raf = 0;

    const frame = (t: number) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - elapsed / DURATION);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (elapsed < DURATION) {
        raf = requestAnimationFrame(frame);
      } else {
        onDone?.();
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [onDone]);

  return <canvas ref={canvasRef} className="confetti-canvas" aria-hidden="true" />;
}
