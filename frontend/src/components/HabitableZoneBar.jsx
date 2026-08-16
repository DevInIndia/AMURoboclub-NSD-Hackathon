import React from "react";

/**
 * Where the planet's insolation places it relative to the habitable zone.
 *
 * Plotted on insolation rather than distance, because insolation is what the
 * zone is actually defined on -- and it is the quantity a reader can look up
 * without knowing the star's mass.
 *
 * Flux runs high (close, hot) on the left to low (far, cold) on the right,
 * matching the H-R diagram's convention of hot-to-the-left.
 */

const WIDTH = 640;
const HEIGHT = 96;
const PAD = 40;
const TRACK_Y = 46;

// Fixed logarithmic span: 10 S-earth (searing) down to 0.1 (frozen).
const MAX_FLUX = 10;
const MIN_FLUX = 0.1;

const position = (flux) => {
  const clamped = Math.min(Math.max(flux, MIN_FLUX), MAX_FLUX);
  const t = (Math.log10(MAX_FLUX) - Math.log10(clamped)) / (Math.log10(MAX_FLUX) - Math.log10(MIN_FLUX));
  return PAD + t * (WIDTH - PAD * 2);
};

const ZONE_LABEL = {
  conservative: "Inside the conservative habitable zone",
  optimistic: "Inside the optimistic habitable zone only",
  "too-hot": "Closer than the inner edge — a runaway greenhouse is likely",
  "too-cold": "Beyond the outer edge — likely frozen",
};

const HabitableZoneBar = ({ insolationFlux, zonePosition }) => {
  // Boundary fluxes for a Sun-like star; the backend uses the same model.
  const conservativeInner = position(1.107);
  const conservativeOuter = position(0.356);
  const optimisticInner = position(1.776);
  const optimisticOuter = position(0.32);

  const planetX = position(insolationFlux);
  const outOfRange = insolationFlux > MAX_FLUX || insolationFlux < MIN_FLUX;

  return (
    <figure className="space-y-2">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={ZONE_LABEL[zonePosition] ?? "Habitable zone position"}>
        {/* Full range track */}
        <rect x={PAD} y={TRACK_Y} width={WIDTH - PAD * 2} height="14" rx="7" className="fill-slate-800" />

        {/* Optimistic zone */}
        <rect
          x={optimisticInner}
          y={TRACK_Y}
          width={optimisticOuter - optimisticInner}
          height="14"
          rx="7"
          fill="#34d399"
          opacity="0.2"
        />

        {/* Conservative zone */}
        <rect
          x={conservativeInner}
          y={TRACK_Y}
          width={conservativeOuter - conservativeInner}
          height="14"
          rx="7"
          fill="#34d399"
          opacity="0.5"
        />

        {/* The planet */}
        <g>
          <line x1={planetX} y1={TRACK_Y - 10} x2={planetX} y2={TRACK_Y + 24} stroke="#22d3ee" strokeWidth="2" />
          <circle cx={planetX} cy={TRACK_Y + 7} r="7" fill="#22d3ee" stroke="#0f172a" strokeWidth="2" />
        </g>

        {/* Scale ends */}
        <text x={PAD} y={TRACK_Y - 14} textAnchor="start" className="fill-slate-500" fontSize="11">
          hotter
        </text>
        <text x={WIDTH - PAD} y={TRACK_Y - 14} textAnchor="end" className="fill-slate-500" fontSize="11">
          colder
        </text>
        <text x={PAD} y={TRACK_Y + 38} textAnchor="start" className="fill-slate-600" fontSize="10">
          10 S⊕
        </text>
        <text x={(conservativeInner + conservativeOuter) / 2} y={TRACK_Y + 38} textAnchor="middle" className="fill-emerald-400/70" fontSize="10">
          habitable zone
        </text>
        <text x={WIDTH - PAD} y={TRACK_Y + 38} textAnchor="end" className="fill-slate-600" fontSize="10">
          0.1 S⊕
        </text>
      </svg>

      <figcaption className="text-sm text-slate-400">
        {ZONE_LABEL[zonePosition] ?? "Position relative to the habitable zone is unknown."}
        {outOfRange && " The marker is pinned at the end of the scale."}
      </figcaption>
    </figure>
  );
};

export default HabitableZoneBar;
