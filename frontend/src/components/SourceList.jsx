import React from "react";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

/**
 * Citations for a grounded answer.
 *
 * These exist so a reader can check the answer, not to decorate it. Retrieval
 * reduces fabrication but does not remove it -- a model can still misread a
 * passage or attach a citation to a claim the passage does not support -- so
 * the numbers link out to the originals and the panel says as much.
 */

const SOURCE_LABELS = {
  "iau-constants": "Reference constant",
  "nasa-apod": "NASA APOD",
  arxiv: "arXiv preprint",
};

const SourceList = ({ sources }) => {
  if (!sources?.length) return null;

  return (
    <div className="space-y-3 border-t border-slate-700/40 pt-5">
      <h3 className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
        <MenuBookOutlinedIcon style={{ fontSize: 14 }} />
        Sources used
      </h3>

      <ol className="space-y-2">
        {sources.map((source, index) => (
          <li key={source.id} className="flex gap-3 text-sm">
            {/* The number matches the [n] citations in the answer above. */}
            <span className="shrink-0 tabular-nums text-accent">[{index + 1}]</span>

            <span className="min-w-0 flex-1">
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-baseline gap-1 text-slate-300 hover:text-accent hover:underline"
                >
                  <span>{source.title}</span>
                  <OpenInNewIcon style={{ fontSize: 11 }} />
                </a>
              ) : (
                <span className="text-slate-300">{source.title}</span>
              )}

              <span className="block text-xs text-slate-600">
                {SOURCE_LABELS[source.source] ?? source.source}
                {typeof source.similarity === "number" &&
                  ` · ${(source.similarity * 100).toFixed(0)}% match`}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <p className="text-xs leading-relaxed text-slate-600">
        The answer was grounded in these passages, which reduces invention but
        does not guarantee accuracy. Follow the links to check any claim that
        matters.
      </p>
    </div>
  );
};

export default SourceList;
