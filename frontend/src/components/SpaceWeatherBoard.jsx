import React, { useEffect, useState } from "react";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import Spinner from "./Spinner";
import { fetchSpaceWeather } from "../lib/api";

/**
 * Live geomagnetic and solar activity from NOAA.
 *
 * The flare percentages are NOAA's own forecast, produced by their forecasters
 * -- not something this application predicts. That distinction is stated in the
 * UI, because a number like "X-class: 15%" invites the assumption that we
 * computed it.
 */

const REFRESH_MS = 10 * 60 * 1000;

// Kp runs 0-9; the bar is a share of that full range.
const KP_MAX = 9;

const STORM_COLOUR = {
  G0: "#34d399",
  G1: "#fbbf24",
  G2: "#fbbf24",
  G3: "#fb923c",
  G4: "#f87171",
  G5: "#f87171",
};

/** Compact sparkline of the last 24 Kp readings (three days at 3-hour cadence). */
const KpHistory = ({ recent }) => {
  if (!recent?.length) return null;

  const width = 260;
  const height = 40;
  const step = width / Math.max(recent.length - 1, 1);

  const points = recent
    .map((entry, index) => {
      const x = index * step;
      const y = height - (Math.min(entry.kp, KP_MAX) / KP_MAX) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Recent planetary K index history">
      {/* Storm threshold: Kp 5 is where G1 begins. */}
      <line
        x1="0"
        x2={width}
        y1={height - (5 / KP_MAX) * height}
        y2={height - (5 / KP_MAX) * height}
        stroke="#fbbf24"
        strokeWidth="0.75"
        strokeDasharray="3 3"
        opacity="0.5"
      />
      <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth="1.5" />
    </svg>
  );
};

const FlareBar = ({ label, percent, description }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-slate-400">
        {label} <span className="text-slate-600">{description}</span>
      </span>
      <span className="tabular-nums text-slate-300">{percent}%</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-space-sunken">
      <div
        className="h-full rounded-full bg-accent transition-all duration-700"
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  </div>
);

const SpaceWeatherBoard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await fetchSpaceWeather();
        if (cancelled) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("Space weather unavailable:", err);
        setError("Live space weather is unavailable right now.");
      }
    };

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (error && !data) {
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
        <span className="text-sm text-slate-400">Reading the solar wind</span>
      </section>
    );
  }

  const { geomagnetic, flareForecast, alerts, meta } = data;

  return (
    <section className="nm-surface space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-accent">
            <BoltOutlinedIcon />
          </span>
          <h2 className="text-lg font-semibold text-slate-100">Space weather now</h2>
        </div>
        {meta.stale && (
          <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-300">
            Showing last known values
          </span>
        )}
      </div>

      {geomagnetic ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="nm-well space-y-3 p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-600">
                Planetary K index
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  color: STORM_COLOUR[geomagnetic.storm.level],
                  background: `${STORM_COLOUR[geomagnetic.storm.level]}1a`,
                }}
              >
                {geomagnetic.storm.level} · {geomagnetic.storm.label}
              </span>
            </div>

            <p className="text-4xl font-semibold tabular-nums text-slate-100">
              {geomagnetic.kp.toFixed(2)}
            </p>

            <KpHistory recent={geomagnetic.recent} />

            <p className="text-xs leading-relaxed text-slate-500">{geomagnetic.aurora}</p>
          </div>

          <div className="nm-well space-y-4 p-5">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-600">
                Flare probability, next 24 hours
              </span>
              <p className="mt-1 text-xs text-slate-600">
                NOAA&apos;s forecast, not ours.
              </p>
            </div>

            {flareForecast ? (
              <div className="space-y-3">
                <FlareBar label="C" percent={flareForecast.cClassPercent} description="common, minor" />
                <FlareBar label="M" percent={flareForecast.mClassPercent} description="radio blackouts" />
                <FlareBar label="X" percent={flareForecast.xClassPercent} description="severe" />
              </div>
            ) : (
              <p className="text-sm text-slate-500">Forecast unavailable.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Geomagnetic data unavailable.</p>
      )}

      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-600">
            <CampaignOutlinedIcon style={{ fontSize: 14 }} />
            Active NOAA notices
          </h3>
          {alerts.map((alert) => (
            // Rendered as text, never markup: this is a third-party free-text field.
            <p key={alert.id + alert.issuedAt} className="nm-card p-3 text-xs text-slate-400">
              {alert.summary}
            </p>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-600">
        Source:{" "}
        <a href={meta.sourceUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
          {meta.source}
        </a>
        {geomagnetic?.observedAt && ` · observed ${geomagnetic.observedAt.replace("T", " ")} UTC`}
        {meta.failures.length > 0 && ` · unavailable: ${meta.failures.join(", ")}`}
      </p>
    </section>
  );
};

export default SpaceWeatherBoard;
