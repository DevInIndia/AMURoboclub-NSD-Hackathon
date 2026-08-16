import React from "react";
import { Link } from "react-router-dom";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const AdvancedSearchButton = () => (
  <Link
    to="/advance"
    className="nm-button group flex items-center gap-3 text-accent hover:text-accent-soft"
  >
    <ScienceOutlinedIcon fontSize="small" />
    <span>Classify a star</span>
    <ArrowForwardIcon
      fontSize="small"
      className="transition-transform duration-300 group-hover:translate-x-1"
    />
  </Link>
);

export default AdvancedSearchButton;
