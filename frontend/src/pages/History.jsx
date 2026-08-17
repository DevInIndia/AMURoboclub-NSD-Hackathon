import React, { useCallback, useEffect, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import SignalWifiStatusbarConnectedNoInternet4Icon from "@mui/icons-material/SignalWifiStatusbarConnectedNoInternet4";
import { marked } from "marked";
import DOMPurify from "dompurify";
import Header from "../components/Header";
import Footer from "../components/Footer";
import StarField from "../components/StarField";
import Spinner from "../components/Spinner";
import { useApi, errorMessage } from "../lib/api";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const parseMarkdown = (markdown) => DOMPurify.sanitize(marked.parse(markdown || ""));

const PREVIEW_LENGTH = 180;
const SEARCH_DEBOUNCE_MS = 300;

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown date";

const formatNumber = (value) =>
  Math.abs(value) >= 1000 || (Math.abs(value) < 0.01 && value !== 0)
    ? Number(value).toExponential(2)
    : Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });

/** The six measurements behind a classification, shown as a compact grid. */
const Measurements = ({ details }) => (
  <dl className="nm-well grid grid-cols-2 gap-3 p-4 text-xs sm:grid-cols-3">
    {[
      ["Temperature", `${formatNumber(details.temperature)} K`],
      ["Luminosity", `${formatNumber(details.luminosity)} L☉`],
      ["Radius", `${formatNumber(details.radius)} R☉`],
      ["Abs. magnitude", formatNumber(details.absoluteMagnitude)],
      ["Colour", details.color],
      ["Spectral class", details.spectralClass],
    ].map(([label, value]) => (
      <div key={label} className="space-y-0.5">
        <dt className="uppercase tracking-wider text-slate-600">{label}</dt>
        <dd className="tabular-nums text-slate-300">{value}</dd>
      </div>
    ))}
  </dl>
);

const History = () => {
  useDocumentTitle("Archive");

  const api = useApi();
  const [entries, setEntries] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  const { fetchArchive } = api;

  const load = useCallback(
    async (search, signal) => {
      try {
        const data = await fetchArchive({ search });
        if (signal?.aborted) return;
        setEntries(data);
        setStatus("ready");
      } catch (err) {
        if (signal?.aborted) return;
        console.error("Could not load archive:", err);
        setError(errorMessage(err, "Your archive could not be loaded."));
        setStatus("error");
      }
    },
    [fetchArchive]
  );

  // Postgres does the searching, so every keystroke is a query -- debounce it.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () => load(searchTerm, controller.signal),
      searchTerm ? SEARCH_DEBOUNCE_MS : 0
    );

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [searchTerm, load]);

  const toggleExpanded = (id) =>
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const renderBody = () => {
    if (status === "loading") {
      return (
        <div className="flex flex-col items-center gap-4 py-24">
          <Spinner size={40} />
          <p className="text-sm text-slate-400">Retrieving your archive</p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="nm-surface mx-auto max-w-md space-y-3 p-10 text-center">
          <span className="mx-auto block w-fit text-slate-500">
            <SignalWifiStatusbarConnectedNoInternet4Icon fontSize="large" />
          </span>
          <p className="text-slate-400">{error}</p>
        </div>
      );
    }

    if (entries.length === 0) {
      return (
        <div className="nm-surface mx-auto max-w-md space-y-3 p-10 text-center">
          <span className="mx-auto block w-fit text-slate-500">
            <InboxOutlinedIcon fontSize="large" />
          </span>
          <p className="text-slate-300">
            {searchTerm ? "No matches in your archive" : "No entries yet"}
          </p>
          <p className="text-sm text-slate-500">
            {searchTerm
              ? "Try a different search term."
              : "Ask a question or classify a star and it will appear here."}
          </p>
        </div>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2">
        {entries.map((entry) => {
          const isExpanded = expandedIds.includes(entry.id);
          const isClassification = entry.kind === "classification";
          const isLong = entry.body.length > PREVIEW_LENGTH;
          const body = isExpanded
            ? entry.body
            : entry.body.slice(0, PREVIEW_LENGTH) + (isLong ? "..." : "");

          return (
            <article
              key={entry.id}
              className="nm-surface flex flex-col gap-4 p-6 animate-fade-in"
            >
              <header className="space-y-2">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 shrink-0 ${
                      isClassification ? "text-accent" : "text-slate-500"
                    }`}
                  >
                    {isClassification ? (
                      <ScienceOutlinedIcon fontSize="small" />
                    ) : (
                      <ChatBubbleOutlineIcon fontSize="small" />
                    )}
                  </span>
                  <h2 className="line-clamp-2 font-medium leading-snug text-slate-100">
                    {isClassification
                      ? `${entry.title} · ${(entry.details.confidence * 100).toFixed(0)}% confidence`
                      : entry.title}
                  </h2>
                </div>
                <p className="flex items-center gap-2 pl-7 text-xs text-slate-600">
                  <CalendarTodayIcon style={{ fontSize: 13 }} />
                  <span>{formatDate(entry.createdAt)}</span>
                </p>
              </header>

              {isClassification && <Measurements details={entry.details} />}

              {entry.body && (
                <div
                  className={`prose prose-invert prose-sm max-w-none flex-1 ${
                    isExpanded ? "max-h-96 overflow-y-auto pr-2" : ""
                  }`}
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(body) }}
                />
              )}

              {isLong && (
                <button
                  type="button"
                  onClick={() => toggleExpanded(entry.id)}
                  className="nm-button flex w-full items-center justify-center gap-2 py-2.5 text-sm text-accent"
                >
                  <span>{isExpanded ? "Show less" : "Show more"}</span>
                  {isExpanded ? (
                    <ExpandLessIcon fontSize="small" />
                  ) : (
                    <ExpandMoreIcon fontSize="small" />
                  )}
                </button>
              )}
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <StarField count={50} />

      <div className="relative flex min-h-screen flex-col">
        <Header />

        <main className="mx-auto w-full max-w-6xl flex-1 space-y-10 px-4 py-12">
          <div className="space-y-6 text-center">
            <h1 className="text-2xl font-semibold text-slate-100">
              Cosmic knowledge archive
            </h1>

            <div className="relative mx-auto max-w-md">
              <input
                type="text"
                placeholder="Search questions, answers and star types"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="nm-input pr-12"
                aria-label="Search your archive"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-600">
                <SearchIcon fontSize="small" />
              </span>
            </div>
          </div>

          {renderBody()}
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default History;
