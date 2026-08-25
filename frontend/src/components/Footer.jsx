import React from "react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="mt-16 px-4 pb-10">
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="nm-divider" />
      <div className="flex flex-col items-center justify-between gap-2 text-sm text-slate-500 sm:flex-row">
        <span>&copy; {new Date().getFullYear()} Celestial Chatbot</span>
        <Link to="/privacy" className="transition-colors hover:text-slate-300">
          Privacy
        </Link>
        <span>
          Team <span className="text-slate-400">Code Clusters</span>
        </span>
      </div>
    </div>
  </footer>
);

export default Footer;
