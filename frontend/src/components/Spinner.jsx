import React from "react";

/** Ring spinner sized to sit inside a neumorphic well or button. */
const Spinner = ({ size = 24 }) => (
  <span
    role="status"
    aria-label="Loading"
    className="inline-block animate-spin rounded-full border-2 border-slate-600 border-t-accent"
    style={{ width: size, height: size }}
  />
);

export default Spinner;
