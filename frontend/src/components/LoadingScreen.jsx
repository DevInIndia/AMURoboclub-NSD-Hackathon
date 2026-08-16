import React from "react";
import Spinner from "./Spinner";

const LoadingScreen = ({ message = "Loading" }) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-space-base">
    <Spinner size={48} />
    <p className="text-sm tracking-wide text-slate-400">{message}</p>
  </div>
);

export default LoadingScreen;
