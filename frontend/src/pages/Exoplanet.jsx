import React, { useEffect, useMemo, useState } from "react";
import PublicIcon from "@mui/icons-material/Public";
import StraightenIcon from "@mui/icons-material/Straighten";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import ScaleOutlinedIcon from "@mui/icons-material/ScaleOutlined";
import OpacityOutlinedIcon from "@mui/icons-material/OpacityOutlined";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Header from "../components/Header";
import Footer from "../components/Footer";
import StarField from "../components/StarField";
import Spinner from "../components/Spinner";
import EsiGauge from "../components/EsiGauge";
import HabitableZoneBar from "../components/HabitableZoneBar";
import { useApi, fetchExoplanetOptions, errorMessage } from "../lib/api";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const REQUIRED_FIELDS = [
  {
    key: "radiusEarths",
    label: "Planetary radius",
    unit: "R⊕",
    icon: <StraightenIcon fontSize="small" />,
    placeholder: "1.0",
    hint: "Size relative to Earth. This is the one value nearly every catalogue lists.",
  },
  {
    key: "insolationFlux",
    label: "Insolation flux",
    unit: "S⊕",
    icon: <WbSunnyOutlinedIcon fontSize="small" />,
    placeholder: "1.0",
    hint: "Starlight received relative to Earth. Drives temperature and habitable-zone position.",
  },
];

const OPTIONAL_FIELDS = [
  {
    key: "massEarths",
    label: "Planetary mass",
    unit: "M⊕",
    icon: <ScaleOutlinedIcon fontSize="small" />,
    placeholder: "estimated if blank",
    hint: "A measured mass sharpens density and escape velocity.",
  },
  {
    key: "bondAlbedo",
    label: "Bond albedo",
    unit: "0–1",
    icon: <OpacityOutlinedIcon fontSize="small" />,
    placeholder: "0.3",
    hint: "Fraction of light reflected. Earth is 0.3.",
  },
  {
    key: "stellarTemperatureK",
    label: "Host star temperature",
    unit: "K",
    icon: <ThermostatIcon fontSize="small" />,
    placeholder: "5780",
    hint: "Needed to locate the habitable zone.",
  },
  {
    key: "stellarLuminositySuns",
    label: "Host star luminosity",
    unit: "L☉",
    icon: <WbSunnyOutlinedIcon fontSize="small" />,
    placeholder: "1.0",
    hint: "Gives the habitable zone in AU.",
  },
];

// Real worlds, so the calculator can be tried without hunting for numbers.
const PRESETS = [
  {
    name: "Earth",
    values: { radiusEarths: "1", insolationFlux: "1", massEarths: "1", stellarTemperatureK: "5780", stellarLuminositySuns: "1" },
  },
  {
    name: "Venus",
    values: { radiusEarths: "0.949", insolationFlux: "1.91", massEarths: "0.815", stellarTemperatureK: "5780", stellarLuminositySuns: "1" },
  },
  {
    name: "Mars",
    values: { radiusEarths: "0.532", insolationFlux: "0.43", massEarths: "0.107", stellarTemperatureK: "5780", stellarLuminositySuns: "1" },
  },
  {
    name: "Kepler-452b",
    values: { radiusEarths: "1.63", insolationFlux: "1.1", stellarTemperatureK: "5757", stellarLuminositySuns: "1.21" },
  },
  {
    name: "TRAPPIST-1e",
    values: { radiusEarths: "0.92", insolationFlux: "0.66", massEarths: "0.69", stellarTemperatureK: "2566", stellarLuminositySuns: "0.000553" },
  },
];

const EMPTY = {
  radiusEarths: "",
  insolationFlux: "",
  massEarths: "",
  bondAlbedo: "",
  stellarTemperatureK: "",
  stellarLuminositySuns: "",
};

const round = (value, places = 2) =>
  Number(value).toLocaleString(undefined, { maximumFractionDigits: places });

const Exoplanet = () => {
  useDocumentTitle("Exoplanet calculator");

  const api = useApi();
  const [form, setForm] = useState(EMPTY);
  const [options, setOptions] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchExoplanetOptions()
      .then((data) => !cancelled && setOptions(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const applyPreset = (preset) => {
    setForm({ ...EMPTY, ...preset.values });
    setResult(null);
    setError(null);
  };

  const isValid = useMemo(
    () => REQUIRED_FIELDS.every(({ key }) => String(form[key]).trim() !== ""),
    [form]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Blank optional fields are omitted rather than sent as empty strings.
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, value]) => String(value).trim() !== "")
      );
      setResult(await api.characteriseExoplanet(payload));
    } catch (err) {
      console.error("Exoplanet characterisation failed:", err);
      setError(errorMessage(err, "The calculator could not be reached."));
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field) => (
    <div key={field.key} className="space-y-2">
      <label htmlFor={field.key} className="flex items-center gap-2 text-sm font-medium text-slate-300">
        <span className="text-accent">{field.icon}</span>
        <span>{field.label}</span>
        <span className="text-xs text-slate-600">({field.unit})</span>
      </label>
      <input
        id={field.key}
        type="number"
        step="any"
        placeholder={field.placeholder}
        value={form[field.key]}
        onChange={handleChange(field.key)}
        className="nm-input"
      />
      <p className="text-xs text-slate-600">{field.hint}</p>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <StarField count={50} />

      <div className="relative flex min-h-screen flex-col">
        <Header />

        <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-12">
          <section className="nm-surface space-y-4 p-8 animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="nm-flat-space-base-sm grid h-12 w-12 place-items-center rounded-full text-accent">
                <PublicIcon />
              </span>
              <h1 className="text-2xl font-semibold text-slate-100">
                Exoplanet habitability calculator
              </h1>
            </div>

            <p className="leading-relaxed text-slate-400">
              Enter a planet&apos;s measured properties to get its Earth
              Similarity Index, its size class, and where it sits relative to
              the habitable zone.
            </p>

            <p className="text-sm text-slate-500">
              Every figure here is <span className="text-slate-300">computed, not predicted</span>.
              Habitability has no training data — we know of exactly one
              inhabited planet — so nothing on this page is a model output or a
              confidence score.
            </p>

            {options && (
              <p className="text-xs text-slate-600">
                ESI: {options.method.esi} · Habitable zone: {options.method.habitableZone} ·
                Mass–radius: {options.method.massRadius}
              </p>
            )}
          </section>

          <form onSubmit={handleSubmit} className="nm-surface space-y-8 p-8">
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Try a real world</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="nm-flat-space-base-sm rounded-full px-4 py-2 text-xs text-slate-400 transition-all duration-200 hover:text-accent active:nm-inset-space-base-sm"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="nm-divider" />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {REQUIRED_FIELDS.map(renderField)}
            </div>

            <details className="group">
              <summary className="cursor-pointer text-sm text-slate-500 transition-colors hover:text-accent">
                Optional: mass, albedo and host star
              </summary>
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                {OPTIONAL_FIELDS.map(renderField)}
              </div>
            </details>

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={!isValid || isLoading}
                className="nm-button-accent flex items-center gap-3 px-10 py-4"
              >
                {isLoading ? <Spinner size={18} /> : <CalculateOutlinedIcon fontSize="small" />}
                <span>{isLoading ? "Calculating" : "Characterise planet"}</span>
              </button>
            </div>
          </form>

          {error && (
            <div className="nm-well p-6 text-sm text-rose-300 animate-fade-in">{error}</div>
          )}

          {result && !isLoading && (
            <div className="space-y-6 animate-fade-in">
              <section className="nm-surface grid gap-8 p-8 md:grid-cols-[220px_1fr]">
                <EsiGauge
                  esi={result.similarity.esi}
                  interiorEsi={result.similarity.interiorEsi}
                  surfaceEsi={result.similarity.surfaceEsi}
                />

                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500">
                      Classification
                    </p>
                    <h2 className="text-2xl font-semibold text-accent">
                      {result.classification.label}
                    </h2>
                    <p className="text-sm text-slate-400">
                      {result.classification.description}
                    </p>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ["Equilibrium temp.", `${round(result.equilibriumTemperatureK, 0)} K`],
                      ["Mass", `${round(result.mass.massEarths)} M⊕${result.mass.estimated ? " (est.)" : ""}`],
                      ["Density", `${round(result.similarity.densityEarths)} × Earth`],
                      ["Escape velocity", `${round(result.similarity.escapeVelocityEarths)} × Earth`],
                      ...(result.semiMajorAxisAU
                        ? [["Orbital distance", `${round(result.semiMajorAxisAU)} AU`]]
                        : []),
                    ].map(([label, value]) => (
                      <div key={label} className="nm-well space-y-0.5 p-3">
                        <dt className="text-xs uppercase tracking-wider text-slate-600">{label}</dt>
                        <dd className="tabular-nums text-slate-200">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </section>

              {result.habitableZonePosition && (
                <section className="nm-surface space-y-4 p-8">
                  <h3 className="text-lg font-semibold text-slate-100">Habitable zone</h3>
                  <HabitableZoneBar
                    insolationFlux={result.input.insolationFlux}
                    zonePosition={result.habitableZonePosition}
                  />
                  {result.habitableZone && (
                    <p className="text-sm text-slate-500">
                      For this star the conservative zone spans{" "}
                      <span className="tabular-nums text-slate-300">
                        {round(result.habitableZone.conservative.innerAU)} –{" "}
                        {round(result.habitableZone.conservative.outerAU)} AU
                      </span>
                      , optimistically{" "}
                      <span className="tabular-nums text-slate-300">
                        {round(result.habitableZone.optimistic.innerAU)} –{" "}
                        {round(result.habitableZone.optimistic.outerAU)} AU
                      </span>
                      .
                    </p>
                  )}
                </section>
              )}

              {result.notes.length > 0 && (
                <section className="nm-surface space-y-3 p-8">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-slate-500">
                    <InfoOutlinedIcon fontSize="small" />
                    What this does not tell you
                  </h3>
                  {result.notes.map((note) => (
                    <p key={note} className="text-sm leading-relaxed text-amber-300/80">
                      {note}
                    </p>
                  ))}
                </section>
              )}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default Exoplanet;
