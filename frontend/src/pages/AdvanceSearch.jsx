import React, { useEffect, useMemo, useState } from "react";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import LightModeIcon from "@mui/icons-material/LightMode";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import BrightnessHighIcon from "@mui/icons-material/BrightnessHigh";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import BarChartIcon from "@mui/icons-material/BarChart";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import SearchIcon from "@mui/icons-material/Search";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ExploreOutlinedIcon from "@mui/icons-material/ExploreOutlined";
import { marked } from "marked";
import DOMPurify from "dompurify";
import Header from "../components/Header";
import Footer from "../components/Footer";
import StarField from "../components/StarField";
import Spinner from "../components/Spinner";
import { useApi, fetchClassifierOptions, errorMessage } from "../lib/api";

const parseMarkdown = (markdown) => DOMPurify.sanitize(marked.parse(markdown || ""));

const NUMERIC_FIELDS = [
  {
    key: "temperature",
    label: "Surface temperature",
    unit: "K",
    icon: <ThermostatIcon fontSize="small" />,
    placeholder: "5778",
    hint: "How hot the star's visible surface is, in kelvin.",
  },
  {
    key: "luminosity",
    label: "Luminosity",
    unit: "L☉",
    icon: <LightModeIcon fontSize="small" />,
    placeholder: "1",
    hint: "Total energy output, as a multiple of the Sun's.",
  },
  {
    key: "radius",
    label: "Radius",
    unit: "R☉",
    icon: <RadioButtonUncheckedIcon fontSize="small" />,
    placeholder: "1",
    hint: "Size of the star, as a multiple of the Sun's radius.",
  },
  {
    key: "absoluteMagnitude",
    label: "Absolute magnitude",
    unit: "Mv",
    icon: <BrightnessHighIcon fontSize="small" />,
    placeholder: "4.83",
    hint: "Brightness at a standard distance. Lower means brighter.",
  },
];

// Real stars, so the page can be tried out without hunting for numbers.
const PRESETS = [
  {
    name: "The Sun",
    values: {
      temperature: "5778",
      luminosity: "1",
      radius: "1",
      absoluteMagnitude: "4.83",
      color: "Yellowish White",
      spectralClass: "G",
    },
  },
  {
    name: "Betelgeuse",
    values: {
      temperature: "3500",
      luminosity: "126000",
      radius: "887",
      absoluteMagnitude: "-5.85",
      color: "Red",
      spectralClass: "M",
    },
  },
  {
    name: "Sirius B",
    values: {
      temperature: "25000",
      luminosity: "0.026",
      radius: "0.0084",
      absoluteMagnitude: "11.18",
      color: "Blue-White",
      spectralClass: "A",
    },
  },
  {
    name: "Proxima Centauri",
    values: {
      temperature: "3042",
      luminosity: "0.0017",
      radius: "0.154",
      absoluteMagnitude: "15.6",
      color: "Red",
      spectralClass: "M",
    },
  },
];

const EMPTY_FORM = {
  temperature: "",
  luminosity: "",
  radius: "",
  absoluteMagnitude: "",
  color: "",
  spectralClass: "",
};

const AdvancedSearch = () => {
  const api = useApi();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [options, setOptions] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // The valid colours and spectral classes come from the trained model itself,
  // so the form can never offer a value it was not trained on.
  useEffect(() => {
    let cancelled = false;
    fetchClassifierOptions()
      .then((data) => {
        if (!cancelled) setOptions(data);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not reach the classifier. Is the backend running?");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInputChange = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const applyPreset = (preset) => {
    setFormData(preset.values);
    setResult(null);
    setError(null);
  };

  const isFormValid = useMemo(
    () => Object.values(formData).every((value) => String(value).trim() !== ""),
    [formData]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;

    setIsLoading(true);
    setError(null);
    setNotice(null);
    setResult(null);

    try {
      // The backend classifies and archives in one call, storing the
      // measurements as real columns rather than a sentence.
      const data = await api.classifyStar(formData);
      setResult(data);
      if (data.archiveError) setNotice(data.archiveError);
    } catch (err) {
      console.error("Classification failed:", err);
      setError(errorMessage(err, "The classifier could not be reached."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <StarField count={50} />

      <div className="relative flex min-h-screen flex-col">
        <Header />

        <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-12">
          <section className="nm-surface space-y-4 p-8 animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="nm-flat-space-base-sm grid h-12 w-12 place-items-center rounded-full text-accent">
                <ScienceOutlinedIcon />
              </span>
              <h1 className="text-2xl font-semibold text-slate-100">
                Star type classifier
              </h1>
            </div>

            <p className="leading-relaxed text-slate-400">
              Enter a star&apos;s measured properties and a machine-learning model
              trained on real stellar data will identify what kind of star it is,
              then explain the reasoning behind the answer.
            </p>

            {options && (
              <p className="text-xs text-slate-600">
                {options.algorithm} &middot; trained on {options.sampleCount}{" "}
                catalogued stars &middot;{" "}
                {(options.metrics.cv_accuracy_mean * 100).toFixed(1)}%
                cross-validated accuracy
              </p>
            )}
          </section>

          <form onSubmit={handleSubmit} className="nm-surface space-y-8 p-8">
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Try a real star</p>
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
              {NUMERIC_FIELDS.map((field) => (
                <div key={field.key} className="space-y-2">
                  <label
                    htmlFor={field.key}
                    className="flex items-center gap-2 text-sm font-medium text-slate-300"
                  >
                    <span className="text-accent">{field.icon}</span>
                    <span>{field.label}</span>
                    <span className="text-xs text-slate-600">({field.unit})</span>
                  </label>
                  <input
                    id={field.key}
                    type="number"
                    step="any"
                    placeholder={field.placeholder}
                    value={formData[field.key]}
                    onChange={handleInputChange(field.key)}
                    required
                    className="nm-input"
                  />
                  <p className="text-xs text-slate-600">{field.hint}</p>
                </div>
              ))}

              <div className="space-y-2">
                <label
                  htmlFor="color"
                  className="flex items-center gap-2 text-sm font-medium text-slate-300"
                >
                  <span className="text-accent">
                    <PaletteOutlinedIcon fontSize="small" />
                  </span>
                  <span>Colour</span>
                </label>
                <select
                  id="color"
                  value={formData.color}
                  onChange={handleInputChange("color")}
                  required
                  disabled={!options}
                  className="nm-select"
                >
                  <option value="">
                    {options ? "Select a colour" : "Loading"}
                  </option>
                  {(options?.colorOptions ?? []).map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-600">
                  Visible colour, coolest (red) to hottest (blue).
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="spectralClass"
                  className="flex items-center gap-2 text-sm font-medium text-slate-300"
                >
                  <span className="text-accent">
                    <BarChartIcon fontSize="small" />
                  </span>
                  <span>Spectral class</span>
                </label>
                <select
                  id="spectralClass"
                  value={formData.spectralClass}
                  onChange={handleInputChange("spectralClass")}
                  required
                  disabled={!options}
                  className="nm-select"
                >
                  <option value="">
                    {options ? "Select a class" : "Loading"}
                  </option>
                  {(options?.spectralOptions ?? []).map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-600">
                  Harvard classification: M is coolest, O is hottest.
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={!isFormValid || isLoading || !options}
                className="nm-button-accent flex items-center gap-3 px-10 py-4"
              >
                {isLoading ? <Spinner size={18} /> : <SearchIcon fontSize="small" />}
                <span>{isLoading ? "Classifying" : "Classify star"}</span>
              </button>
            </div>
          </form>

          {error && (
            <div className="nm-well p-6 text-sm text-rose-300 animate-fade-in">
              {error}
            </div>
          )}

          {notice && (
            <div className="nm-well p-6 text-sm text-amber-300 animate-fade-in">
              {notice}
            </div>
          )}

          {isLoading && (
            <div className="nm-surface flex flex-col items-center gap-4 p-10 animate-fade-in">
              <Spinner size={40} />
              <p className="text-sm text-slate-400">
                Comparing against catalogued stars
              </p>
            </div>
          )}

          {result && !isLoading && (
            <div className="space-y-6 animate-fade-in">
              <section className="nm-surface space-y-6 p-8">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest text-slate-500">
                    Predicted type
                  </p>
                  <h2 className="text-3xl font-semibold text-accent">
                    {result.prediction.label}
                  </h2>
                  <p className="text-slate-400">{result.prediction.description}</p>
                </div>

                <div className="nm-well space-y-4 p-6">
                  {result.probabilities.map((item) => {
                    const isPredicted = item.type === result.prediction.type;
                    return (
                      <div key={item.type} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span
                            className={
                              isPredicted
                                ? "font-medium text-accent"
                                : "text-slate-500"
                            }
                          >
                            {item.label}
                          </span>
                          <span className="tabular-nums text-slate-500">
                            {(item.probability * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-space-sunken">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              isPredicted ? "bg-accent" : "bg-slate-600"
                            }`}
                            style={{ width: `${item.probability * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {result.warnings?.length > 0 && (
                  <div className="space-y-2">
                    {result.warnings.map((warning) => (
                      <p
                        key={warning}
                        className="nm-well flex items-start gap-3 p-4 text-sm text-amber-300"
                      >
                        <WarningAmberIcon fontSize="small" className="mt-0.5 shrink-0" />
                        <span>{warning}</span>
                      </p>
                    ))}
                  </div>
                )}

                <p className="text-xs text-slate-600">
                  {result.model.algorithm} trained on {result.model.sampleCount}{" "}
                  stars from {result.model.trainedOn} &middot;{" "}
                  {(result.model.metrics.cv_accuracy_mean * 100).toFixed(1)}%
                  cross-validated accuracy
                </p>
              </section>

              {result.explanation && (
                <section className="nm-surface space-y-4 p-8">
                  <div className="flex items-center gap-3">
                    <span className="text-accent">
                      <ExploreOutlinedIcon />
                    </span>
                    <h3 className="text-lg font-semibold text-slate-100">
                      What this means
                    </h3>
                  </div>
                  <div
                    className="prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: parseMarkdown(result.explanation),
                    }}
                  />
                </section>
              )}

              {result.explanationError && (
                <p className="text-sm text-amber-300">
                  {result.explanationError} The classification above is unaffected.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className="nm-surface space-y-3 p-7">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                Spectral classes
              </h3>
              <dl className="space-y-2 text-sm">
                {[
                  ["O", "Very hot, blue stars above 30,000 K"],
                  ["B", "Hot, blue-white stars"],
                  ["A", "White stars"],
                  ["F", "Yellow-white stars"],
                  ["G", "Yellow stars, like our Sun"],
                  ["K", "Orange stars"],
                  ["M", "Cool, red stars below 3,700 K"],
                ].map(([letter, description]) => (
                  <div key={letter} className="flex gap-3">
                    <dt className="w-5 shrink-0 font-medium text-accent">{letter}</dt>
                    <dd className="text-slate-400">{description}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="nm-surface space-y-3 p-7">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                Types it can identify
              </h3>
              <ul className="space-y-2 text-sm">
                {(options?.classes ?? []).map((cls) => (
                  <li key={cls.id} className="text-slate-400">
                    <span className="text-accent">{cls.label}</span>
                  </li>
                ))}
                {!options && <li className="text-slate-600">Loading</li>}
              </ul>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default AdvancedSearch;
