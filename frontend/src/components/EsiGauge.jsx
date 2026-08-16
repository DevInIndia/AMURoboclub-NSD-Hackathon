import React from "react";

/**
 * Earth Similarity Index as an arc gauge, 0 to 1.
 *
 * The colour band is deliberately not a pass/fail traffic light. ESI measures
 * resemblance in bulk properties, not habitability -- Venus scores about 0.90 --
 * so a high value is shown as "Earth-like in size and temperature", never as a
 * verdict.
 */

const SIZE = 200;
const CENTRE = SIZE / 2;
const RADIUS = 78;
const STROKE = 14;

// Semicircle sweeping left to right.
const START_ANGLE = Math.PI;
const END_ANGLE = 0;

const pointOnArc = (angle) => ({
  x: CENTRE + RADIUS * Math.cos(angle),
  y: CENTRE + RADIUS * Math.sin(angle) * -1,
});

const arcPath = (fromValue, toValue) => {
  const from = START_ANGLE + (END_ANGLE - START_ANGLE) * fromValue;
  const to = START_ANGLE + (END_ANGLE - START_ANGLE) * toValue;
  const start = pointOnArc(from);
  const end = pointOnArc(to);
  const largeArc = Math.abs(to - from) > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
};

const bandColour = (esi) => {
  if (esi >= 0.8) return "#34d399";
  if (esi >= 0.6) return "#fbbf24";
  if (esi >= 0.4) return "#fb923c";
  return "#f87171";
};

const EsiGauge = ({ esi, interiorEsi, surfaceEsi }) => {
  const clamped = Math.min(Math.max(esi, 0), 1);
  const colour = bandColour(clamped);

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${SIZE} ${CENTRE + 28}`}
        className="w-full max-w-[220px]"
        role="img"
        aria-label={`Earth Similarity Index ${clamped.toFixed(2)} out of 1`}
      >
        {/* Track */}
        <path
          d={arcPath(0, 1)}
          fill="none"
          stroke="currentColor"
          className="text-slate-700"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />

        {/* Value */}
        {clamped > 0 && (
          <path
            d={arcPath(0, clamped)}
            fill="none"
            stroke={colour}
            strokeWidth={STROKE}
            strokeLinecap="round"
          >
            <animate
              attributeName="stroke-dasharray"
              from={`0 ${Math.PI * RADIUS}`}
              to={`${Math.PI * RADIUS} 0`}
              dur="0.9s"
              fill="freeze"
            />
          </path>
        )}

        {/* Earth's own position, which is the whole reference for the scale */}
        <g>
          <circle cx={pointOnArc(END_ANGLE).x} cy={pointOnArc(END_ANGLE).y} r="3" fill="#38bdf8" />
        </g>

        <text
          x={CENTRE}
          y={CENTRE - 8}
          textAnchor="middle"
          className="fill-slate-100"
          fontSize="34"
          fontWeight="600"
        >
          {clamped.toFixed(2)}
        </text>
        <text x={CENTRE} y={CENTRE + 14} textAnchor="middle" className="fill-slate-500" fontSize="11">
          Earth Similarity Index
        </text>

        <text x={pointOnArc(START_ANGLE).x} y={CENTRE + 26} textAnchor="middle" className="fill-slate-600" fontSize="10">
          0
        </text>
        <text x={pointOnArc(END_ANGLE).x} y={CENTRE + 26} textAnchor="middle" className="fill-slate-600" fontSize="10">
          1 = Earth
        </text>
      </svg>

      {typeof interiorEsi === "number" && (
        <dl className="mt-2 flex gap-6 text-center text-xs">
          <div>
            <dt className="text-slate-600">Interior</dt>
            <dd className="tabular-nums text-slate-300">{interiorEsi.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-slate-600">Surface</dt>
            <dd className="tabular-nums text-slate-300">{surfaceEsi.toFixed(2)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
};

export default EsiGauge;
