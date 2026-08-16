import React, { useEffect, useState } from "react";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Spinner from "./Spinner";
import { fetchAsteroids } from "../lib/api";

/**
 * Close approaches over the coming week, from NASA NeoWs.
 *
 * The wording here is doing real work. "Potentially hazardous" is a tracking
 * category -- orbit within 0.05 AU and brighter than magnitude 22 -- not a
 * warning, and every one of these objects is missing Earth by tens of lunar
 * distances. A panel like this is trivially turned into fear; the copy states
 * the criteria and shows the miss distance so the numbers speak plainly.
 */

const formatDistance = (lunar) =>
  `${lunar.toFixed(1)} LD`;

const formatDiameter = (min, max) =>
  max < 1000
    ? `${Math.round(min)}–${Math.round(max)} m`
    : `${(min / 1000).toFixed(2)}–${(max / 1000).toFixed(2)} km`;

const formatEnergy = (megatons) => {
  if (megatons >= 1000) return `${(megatons / 1000).toFixed(1)} Gt`;
  if (megatons >= 1) return `${megatons.toFixed(0)} Mt`;
  return `${megatons.toFixed(2)} Mt`;
};

const AsteroidWatch = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchAsteroids()
      .then((result) => !cancelled && setData(result))
      .catch((err) => {
        if (cancelled) return;
        console.error("Asteroid feed unavailable:", err);
        setError("The near-Earth object feed is unavailable right now.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <section className="nm-surface p-8">
        <p className="text-sm text-slate-400">{error}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="nm-surface flex items-center gap-3 p-8">
        <Spinner size={20} />
        <span className="text-sm text-slate-400">Scanning near-Earth space</span>
      </section>
    );
  }

  const { objects, hazardousCount, windowDays, meta } = data;

  return (
    <section className="nm-surface space-y-6 p-8">
      <div className="flex items-center gap-3">
        <span className="text-accent">
          <TrackChangesIcon />
        </span>
        <h2 className="text-lg font-semibold text-slate-100">
          Near-Earth objects, next {windowDays} days
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="nm-well space-y-0.5 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-600">Close approaches</p>
          <p className="text-2xl font-semibold tabular-nums text-slate-100">{objects.length}</p>
        </div>
        <div className="nm-well space-y-0.5 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-600">Flagged as PHA</p>
          <p className="text-2xl font-semibold tabular-nums text-slate-100">{hazardousCount}</p>
        </div>
        <div className="nm-well space-y-0.5 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-600">Nearest pass</p>
          <p className="text-2xl font-semibold tabular-nums text-slate-100">
            {objects.length ? formatDistance(objects[0].missDistanceLunar) : "—"}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-600">
              <th className="pb-3 pr-4 font-medium">Object</th>
              <th className="pb-3 pr-4 font-medium">Size</th>
              <th className="pb-3 pr-4 font-medium">H</th>
              <th className="pb-3 pr-4 font-medium">Speed</th>
              <th className="pb-3 pr-4 font-medium">Misses by</th>
              <th className="pb-3 font-medium">Energy</th>
            </tr>
          </thead>
          <tbody>
            {objects.slice(0, 10).map((neo) => (
              <tr key={neo.id} className="border-t border-slate-700/40">
                <td className="py-3 pr-4">
                  <span className="text-slate-200">{neo.name}</span>
                  {neo.isPotentiallyHazardous && (
                    <span className="ml-2 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                      PHA
                    </span>
                  )}
                  <span className="block text-xs text-slate-600">{neo.approachDate}</span>
                </td>
                <td className="py-3 pr-4 tabular-nums text-slate-400">
                  {formatDiameter(neo.diameterMinMetres, neo.diameterMaxMetres)}
                </td>
                <td className="py-3 pr-4 tabular-nums text-slate-400">
                  {neo.absoluteMagnitudeH.toFixed(1)}
                </td>
                <td className="py-3 pr-4 tabular-nums text-slate-400">
                  {neo.velocityKmPerSecond.toFixed(1)} km/s
                </td>
                <td className="py-3 pr-4 tabular-nums text-slate-300">
                  {formatDistance(neo.missDistanceLunar)}
                </td>
                <td className="py-3 tabular-nums text-slate-400">
                  {formatEnergy(neo.kineticEnergyMegatons)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="nm-well space-y-2 p-5">
        <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-600">
          <InfoOutlinedIcon style={{ fontSize: 14 }} />
          How to read this
        </h3>
        <p className="text-xs leading-relaxed text-slate-500">
          <span className="text-slate-400">LD</span> is the lunar distance —
          the Moon is 1 LD away, so everything above passes far outside the
          Moon&apos;s orbit. <span className="text-slate-400">H</span> is
          absolute magnitude; smaller means larger.
        </p>
        <p className="text-xs leading-relaxed text-slate-500">{meta.assumptions.hazardous}</p>
        <p className="text-xs leading-relaxed text-slate-500">{meta.assumptions.density}</p>
        <p className="text-xs leading-relaxed text-slate-500">{meta.assumptions.torino}</p>
      </div>

      <p className="text-xs text-slate-600">
        Source:{" "}
        <a href={meta.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
          {meta.source}
          <OpenInNewIcon style={{ fontSize: 12 }} />
        </a>
        {meta.stale && " · showing cached data"}
      </p>
    </section>
  );
};

export default AsteroidWatch;
