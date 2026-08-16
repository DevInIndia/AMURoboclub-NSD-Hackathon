import React, { useMemo } from "react";

/**
 * Hertzsprung-Russell diagram.
 *
 * Plots the classified star against the catalogue the model was trained on, so
 * the prediction stops being an opaque label: you can see the star sitting in
 * the main sequence, or out on the giant branch, alongside its neighbours.
 *
 * Two conventions matter and are easy to get wrong:
 *  - temperature runs hot-to-cold left-to-right, so the x axis is reversed
 *  - luminosity spans ten orders of magnitude, so it must be logarithmic
 *
 * Drawn as plain SVG. The dataset is 240 points and one marker; a charting
 * library would cost more bundle than the scales and axes cost to write.
 */

const WIDTH = 640;
const HEIGHT = 440;
const PAD = { top: 24, right: 24, bottom: 48, left: 64 };

const PLOT_WIDTH = WIDTH - PAD.left - PAD.right;
const PLOT_HEIGHT = HEIGHT - PAD.top - PAD.bottom;

// Distinguishable at small sizes and readable on the dark surface.
const TYPE_COLORS = {
  0: "#f87171", // Brown Dwarf
  1: "#fb923c", // Red Dwarf
  2: "#e2e8f0", // White Dwarf
  3: "#fbbf24", // Main Sequence
  4: "#60a5fa", // Supergiant
  5: "#c084fc", // Hypergiant
};

const log10 = (value) => Math.log10(Math.max(value, Number.MIN_VALUE));

const HRDiagram = ({ referenceStars = [], star, classes = [] }) => {
  const scales = useMemo(() => {
    const points = [...referenceStars];
    if (star) points.push(star);
    if (points.length === 0) return null;

    const temps = points.map((p) => log10(p.temperature));
    const lums = points.map((p) => log10(p.luminosity));

    // A little headroom so nothing sits on the frame.
    const tMin = Math.min(...temps) - 0.05;
    const tMax = Math.max(...temps) + 0.05;
    const lMin = Math.min(...lums) - 0.4;
    const lMax = Math.max(...lums) + 0.4;

    return {
      // Reversed: hot stars belong on the left.
      x: (temperature) =>
        PAD.left + ((tMax - log10(temperature)) / (tMax - tMin)) * PLOT_WIDTH,
      y: (luminosity) =>
        PAD.top + ((lMax - log10(luminosity)) / (lMax - lMin)) * PLOT_HEIGHT,
      tMin,
      tMax,
      lMin,
      lMax,
    };
  }, [referenceStars, star]);

  if (!scales) return null;

  // Ticks at whole powers of ten, which is how these axes are always read.
  const luminosityTicks = [];
  for (let power = Math.ceil(scales.lMin); power <= Math.floor(scales.lMax); power++) {
    luminosityTicks.push(power);
  }

  const temperatureTicks = [40000, 20000, 10000, 5000, 3000].filter(
    (t) => log10(t) >= scales.tMin && log10(t) <= scales.tMax
  );

  const legend = classes.filter((cls) => TYPE_COLORS[cls.id]);

  return (
    <figure className="space-y-4">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={
          star
            ? `Hertzsprung-Russell diagram showing the analysed star at ${star.temperature} kelvin and ${star.luminosity} solar luminosities, plotted against ${referenceStars.length} catalogued stars.`
            : "Hertzsprung-Russell diagram of catalogued stars."
        }
      >
        {/* Gridlines */}
        {luminosityTicks.map((power) => (
          <line
            key={`gy-${power}`}
            x1={PAD.left}
            x2={PAD.left + PLOT_WIDTH}
            y1={scales.y(10 ** power)}
            y2={scales.y(10 ** power)}
            stroke="currentColor"
            className="text-slate-700"
            strokeWidth="0.5"
            strokeDasharray="3 4"
          />
        ))}
        {temperatureTicks.map((t) => (
          <line
            key={`gx-${t}`}
            x1={scales.x(t)}
            x2={scales.x(t)}
            y1={PAD.top}
            y2={PAD.top + PLOT_HEIGHT}
            stroke="currentColor"
            className="text-slate-700"
            strokeWidth="0.5"
            strokeDasharray="3 4"
          />
        ))}

        {/* Axis labels */}
        {luminosityTicks.map((power) => (
          <text
            key={`ly-${power}`}
            x={PAD.left - 10}
            y={scales.y(10 ** power) + 4}
            textAnchor="end"
            className="fill-slate-500"
            fontSize="11"
          >
            10{power < 0 ? "−" : ""}
            {Math.abs(power)}
          </text>
        ))}
        {temperatureTicks.map((t) => (
          <text
            key={`lx-${t}`}
            x={scales.x(t)}
            y={PAD.top + PLOT_HEIGHT + 20}
            textAnchor="middle"
            className="fill-slate-500"
            fontSize="11"
          >
            {t >= 1000 ? `${t / 1000}k` : t}
          </text>
        ))}

        <text
          x={PAD.left + PLOT_WIDTH / 2}
          y={HEIGHT - 8}
          textAnchor="middle"
          className="fill-slate-400"
          fontSize="12"
        >
          Surface temperature (K) — hotter to the left
        </text>
        <text
          x={-(PAD.top + PLOT_HEIGHT / 2)}
          y={16}
          textAnchor="middle"
          transform="rotate(-90)"
          className="fill-slate-400"
          fontSize="12"
        >
          Luminosity (× Sun)
        </text>

        {/* The catalogue the model was trained on */}
        {referenceStars.map((point, index) => (
          <circle
            key={index}
            cx={scales.x(point.temperature)}
            cy={scales.y(point.luminosity)}
            r="3"
            fill={TYPE_COLORS[point.type] ?? "#64748b"}
            opacity="0.35"
          />
        ))}

        {/* The star being analysed */}
        {star && (
          <g>
            <circle
              cx={scales.x(star.temperature)}
              cy={scales.y(star.luminosity)}
              r="11"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="1.5"
              opacity="0.7"
            >
              <animate
                attributeName="r"
                values="9;15;9"
                dur="2.5s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.7;0.15;0.7"
                dur="2.5s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx={scales.x(star.temperature)}
              cy={scales.y(star.luminosity)}
              r="5"
              fill="#22d3ee"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
          </g>
        )}
      </svg>

      <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
        {legend.map((cls) => (
          <span key={cls.id} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: TYPE_COLORS[cls.id] }}
            />
            {cls.label}
          </span>
        ))}
        {star && (
          <span className="flex items-center gap-2 text-accent">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
            Your star
          </span>
        )}
      </figcaption>
    </figure>
  );
};

export default HRDiagram;
