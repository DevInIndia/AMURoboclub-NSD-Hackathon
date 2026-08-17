import React from "react";
import { Link } from "react-router-dom";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import StarField from "../components/StarField";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const NotFound = () => {
  useDocumentTitle("Page not found");

  return (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
    <StarField count={40} />

    <div className="nm-surface relative max-w-md space-y-6 p-10 text-center">
      <span className="nm-flat-space-base-md mx-auto grid h-20 w-20 place-items-center rounded-full text-accent">
        <TravelExploreIcon fontSize="large" />
      </span>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-100">Lost in space</h1>
        <p className="text-sm text-slate-400">
          That page is not on any of our star charts.
        </p>
      </div>
      <Link to="/" className="nm-button-accent inline-block">
        Back to the observatory
      </Link>
    </div>
  </div>
  );
};

export default NotFound;
