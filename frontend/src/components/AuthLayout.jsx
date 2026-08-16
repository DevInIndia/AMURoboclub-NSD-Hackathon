import React from "react";
import { Link } from "react-router-dom";
import StarField from "./StarField";

/** Shared frame for the sign-in and sign-up pages. */
const AuthLayout = ({ icon, title, subtitle, children }) => (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
    <StarField count={40} />

    <div className="nm-surface relative w-full max-w-md space-y-7 p-10 animate-fade-in">
      <div className="flex flex-col items-center space-y-4 text-center">
        <span className="nm-flat-space-base-md grid h-20 w-20 place-items-center rounded-full text-accent">
          {icon}
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-100">{title}</h1>
          <p className="text-sm leading-relaxed text-slate-400">{subtitle}</p>
        </div>
      </div>

      {children}

      <p className="text-center text-xs text-slate-600">
        <Link to="/" className="transition-colors hover:text-slate-400">
          Return to Celestial Chatbot
        </Link>
      </p>
    </div>
  </div>
);

export default AuthLayout;
