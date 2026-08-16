import React, { useEffect, useState } from "react";
import SatelliteAltIcon from "@mui/icons-material/SatelliteAlt";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Spinner from "./Spinner";

// Public, key-free and CORS-open. Returns the station's current position.
const ISS_API = "https://api.wheretheiss.at/v1/satellites/25544";
const REFRESH_MS = 5000;

const formatDegrees = (value, [positive, negative]) =>
  `${Math.abs(value).toFixed(2)}° ${value >= 0 ? positive : negative}`;

/**
 * Live position readout for the International Space Station.
 *
 * This used to be a third-party iframe, but that embed died: the host now
 * redirects to an unrelated landing page. Reading the public API directly
 * keeps the panel working and lets it match the rest of the interface.
 */
const IssTracker = () => {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(ISS_API);
        if (!response.ok) throw new Error(`Tracker returned ${response.status}`);
        const data = await response.json();
        if (cancelled) return;
        setPosition(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("ISS position unavailable:", err);
        setError("Live position is unavailable right now.");
      }
    };

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const readings = position
    ? [
        { label: "Latitude", value: formatDegrees(position.latitude, ["N", "S"]) },
        { label: "Longitude", value: formatDegrees(position.longitude, ["E", "W"]) },
        { label: "Altitude", value: `${position.altitude.toFixed(0)} km` },
        {
          label: "Speed",
          value: `${Math.round(position.velocity).toLocaleString()} km/h`,
        },
        {
          label: "Sunlight",
          value: position.visibility === "eclipsed" ? "In shadow" : "In daylight",
        },
        {
          label: "Footprint",
          value: `${position.footprint.toFixed(0)} km wide`,
        },
      ]
    : [];

  return (
    <section className="nm-surface space-y-5 p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-accent">
            <SatelliteAltIcon />
          </span>
          <h2 className="text-lg font-semibold text-slate-100">
            Live ISS position
          </h2>
        </div>
        {position && (
          <span className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
            Updating every {REFRESH_MS / 1000}s
          </span>
        )}
      </div>

      {error && !position ? (
        <p className="nm-well p-6 text-sm text-slate-400">{error}</p>
      ) : !position ? (
        <div className="flex items-center gap-3 p-6">
          <Spinner size={20} />
          <span className="text-sm text-slate-400">Contacting the station</span>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {readings.map((reading) => (
              <div key={reading.label} className="nm-well space-y-1 p-4">
                <dt className="text-xs uppercase tracking-wider text-slate-500">
                  {reading.label}
                </dt>
                <dd className="tabular-nums text-slate-200">{reading.value}</dd>
              </div>
            ))}
          </dl>

          <p className="text-xs text-slate-600">
            The station orbits roughly every 90 minutes, so these figures change
            as you watch.
          </p>
        </>
      )}

      <a
        href="https://www.astroviewer.net/iss/en/"
        target="_blank"
        rel="noreferrer"
        className="nm-button inline-flex items-center gap-2 text-sm text-accent"
      >
        <span>Open the full tracking map</span>
        <OpenInNewIcon style={{ fontSize: 16 }} />
      </a>
    </section>
  );
};

export default IssTracker;
