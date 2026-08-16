import React, { useEffect, useRef } from "react";

/**
 * Continuous colorful meteor shower background with twinkling stars.
 */
const COLOR_PALETTES = [
  { head: "#ffffff", tailStart: "rgba(56, 189, 248, 0.95)", tailEnd: "rgba(56, 189, 248, 0)", glow: "#38bdf8" },   // Cyan
  { head: "#ffffff", tailStart: "rgba(244, 63, 94, 0.95)", tailEnd: "rgba(244, 63, 94, 0)", glow: "#f43f5e" },   // Rose/Pink
  { head: "#ffffff", tailStart: "rgba(168, 85, 247, 0.95)", tailEnd: "rgba(168, 85, 247, 0)", glow: "#a855f7" },   // Violet
  { head: "#ffffff", tailStart: "rgba(251, 191, 36, 0.95)", tailEnd: "rgba(251, 191, 36, 0)", glow: "#fbbf24" },   // Gold Amber
  { head: "#ffffff", tailStart: "rgba(52, 211, 153, 0.95)", tailEnd: "rgba(52, 211, 153, 0)", glow: "#34d399" },   // Emerald Green
  { head: "#ffffff", tailStart: "rgba(96, 165, 250, 0.95)", tailEnd: "rgba(96, 165, 250, 0)", glow: "#60a5fa" },   // Electric Blue
  { head: "#ffffff", tailStart: "rgba(236, 72, 153, 0.95)", tailEnd: "rgba(236, 72, 153, 0)", glow: "#ec4899" },   // Neon Magenta
];

const createMeteor = (width, height, isInitial = false) => {
  const angle = (Math.PI / 180) * (35 + Math.random() * 20); // ~35° to 55°
  const speed = 7 + Math.random() * 11; // speed px/frame
  const length = 80 + Math.random() * 120; // tail length
  const palette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
  const thickness = 1.5 + Math.random() * 1.5;

  // Start position: spread across top and left offscreen boundaries
  const startFromTop = Math.random() > 0.4;
  let x, y;
  if (startFromTop) {
    x = Math.random() * (width + 300) - 200;
    y = -100 - Math.random() * 200;
  } else {
    x = -150 - Math.random() * 100;
    y = Math.random() * (height * 0.7) - 100;
  }

  // If initial, stagger their starting progress
  if (isInitial) {
    const progress = Math.random() * 0.8;
    x += Math.cos(angle) * speed * 60 * progress;
    y += Math.sin(angle) * speed * 60 * progress;
  }

  return {
    x,
    y,
    angle,
    speed,
    length,
    palette,
    thickness,
    delay: isInitial ? Math.random() * 100 : Math.random() * 120, // frame delay before active
    activeDelayCounter: 0,
  };
};

const createStar = (width, height) => ({
  x: Math.random() * width,
  y: Math.random() * height,
  radius: Math.random() * 1.3 + 0.5,
  baseAlpha: Math.random() * 0.5 + 0.2,
  alpha: Math.random() * 0.5 + 0.2,
  twinkleSpeed: 0.005 + Math.random() * 0.015,
  twinkleDir: Math.random() > 0.5 ? 1 : -1,
  color: Math.random() > 0.7 ? "#38bdf8" : Math.random() > 0.85 ? "#f43f5e" : "#cbd5e1",
});

const StarField = ({ count = 70, meteorCount = 12 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;

    // Everything below draws in CSS pixels; the backing store is larger on
    // high-DPI screens and the context transform bridges the two. Capped at 2
    // so a 3x display does not allocate a buffer nine times the area.
    const MAX_PIXEL_RATIO = 2;

    let width = 0;
    let height = 0;
    let stars = [];

    /**
     * Match the canvas to its parent, at the current pixel density.
     * Returns false when nothing changed, so callers can skip the work.
     */
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return false;

      const nextWidth = parent.offsetWidth || window.innerWidth;
      const nextHeight = parent.offsetHeight || window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);

      const backingWidth = Math.round(nextWidth * ratio);
      const backingHeight = Math.round(nextHeight * ratio);
      if (canvas.width === backingWidth && canvas.height === backingHeight) {
        return false;
      }

      // Existing stars are rescaled rather than regenerated: a ResizeObserver
      // fires on every layout change, and rebuilding the field each time would
      // make the sky visibly reshuffle whenever the page grew.
      if (width > 0 && height > 0) {
        const scaleX = nextWidth / width;
        const scaleY = nextHeight / height;
        stars.forEach((star) => {
          star.x *= scaleX;
          star.y *= scaleY;
        });
      }

      width = nextWidth;
      height = nextHeight;

      canvas.width = backingWidth;
      canvas.height = backingHeight;

      // Assigning width/height resets the context, so the transform has to be
      // re-applied every time. setTransform rather than scale, which compounds.
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      return true;
    };

    resize();

    stars = Array.from({ length: count }, () => createStar(width, height));
    let meteors = Array.from({ length: meteorCount }, () => createMeteor(width, height, true));
    let particles = []; // Sparkles trailing from meteors

    // A plain window.resize listener misses content-driven growth -- the
    // Stargazing page gets taller when its iframes finish loading, which used
    // to leave the canvas stretched to fill a box larger than its buffer.
    const observer = new ResizeObserver(() => resize());
    observer.observe(canvas.parentElement);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Twinkling Stars
      stars.forEach((star) => {
        star.alpha += star.twinkleSpeed * star.twinkleDir;
        if (star.alpha >= 0.8) {
          star.alpha = 0.8;
          star.twinkleDir = -1;
        } else if (star.alpha <= 0.15) {
          star.alpha = 0.15;
          star.twinkleDir = 1;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = star.alpha;
        ctx.fill();
      });

      ctx.globalAlpha = 1;

      // 2. Draw & Update Meteors
      meteors.forEach((m, index) => {
        if (m.delay > 0) {
          m.delay -= 1;
          return;
        }

        const dx = Math.cos(m.angle) * m.speed;
        const dy = Math.sin(m.angle) * m.speed;

        const tailX = m.x - Math.cos(m.angle) * m.length;
        const tailY = m.y - Math.sin(m.angle) * m.length;

        // Gradient line for the meteor streak
        const gradient = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        gradient.addColorStop(0, m.palette.head);
        gradient.addColorStop(0.15, m.palette.tailStart);
        gradient.addColorStop(1, m.palette.tailEnd);

        ctx.save();
        ctx.shadowColor = m.palette.glow;
        ctx.shadowBlur = 10;

        // Draw meteor line
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = m.thickness;
        ctx.lineCap = "round";
        ctx.stroke();

        // Draw glowing head core
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.thickness * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.restore();

        // Spawn tiny trailing spark particles
        if (Math.random() < 0.4) {
          particles.push({
            x: m.x + (Math.random() - 0.5) * 4,
            y: m.y + (Math.random() - 0.5) * 4,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            life: 1,
            decay: 0.03 + Math.random() * 0.04,
            color: m.palette.glow,
            size: Math.random() * 1.5 + 0.8,
          });
        }

        // Update meteor position
        m.x += dx;
        m.y += dy;

        // Reset if offscreen
        if (m.x > width + 200 || m.y > height + 200) {
          meteors[index] = createMeteor(width, height, false);
        }
      });

      // 3. Draw Trailing Sparkles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [count, meteorCount]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  );
};

export default StarField;
