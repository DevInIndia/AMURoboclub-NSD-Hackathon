import React from "react";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

/**
 * Shown instead of the app when the Auth0 environment variables are absent.
 * The SDK's own failure mode is an opaque render error, which is a poor first
 * experience for anyone cloning the repo.
 */
const MissingAuthConfig = ({ missing }) => (
  <div className="flex min-h-screen items-center justify-center bg-space-base px-6">
    <div className="nm-surface max-w-xl space-y-5 p-10">
      <div className="flex items-center gap-3 text-amber-300">
        <WarningAmberIcon />
        <h1 className="text-xl font-semibold text-slate-100">
          Auth0 is not configured
        </h1>
      </div>

      <p className="text-slate-400">
        The app signs users in with Auth0, and these environment variables are
        missing from <code className="text-accent-soft">frontend/.env</code>:
      </p>

      <ul className="nm-well space-y-2 p-5 font-mono text-sm text-slate-300">
        {missing.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>

      <p className="text-sm text-slate-500">
        Copy <code className="text-accent-soft">frontend/.env.example</code> to{" "}
        <code className="text-accent-soft">frontend/.env</code>, fill in the
        values from your Auth0 application, and restart the dev server. The
        README lists the full setup, including the callback URLs Auth0 needs.
      </p>
    </div>
  </div>
);

export default MissingAuthConfig;
