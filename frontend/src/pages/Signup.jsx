import React from "react";
import { Link, Navigate } from "react-router-dom";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import HistoryIcon from "@mui/icons-material/History";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const PERKS = [
  { icon: <ChatBubbleOutlineIcon fontSize="small" />, text: "Ask anything about space and get answers in real time" },
  { icon: <ScienceOutlinedIcon fontSize="small" />, text: "Classify a star from its measurements with a trained model" },
  { icon: <HistoryIcon fontSize="small" />, text: "Keep every question and result in a searchable archive" },
];

const Signup = () => {
  useDocumentTitle("Create an account");

  const { isAuthenticated, isLoading, signup } = useAuth();

  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <AuthLayout
      icon={<PersonAddAltIcon fontSize="large" />}
      title="Create your account"
      subtitle="One account unlocks the whole observatory."
    >
      <ul className="space-y-3">
        {PERKS.map((perk) => (
          <li key={perk.text} className="flex items-start gap-3 text-sm text-slate-400">
            <span className="mt-0.5 text-accent">{perk.icon}</span>
            <span>{perk.text}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => signup()}
        disabled={isLoading}
        className="nm-button-accent flex w-full items-center justify-center gap-3 py-4"
      >
        <AutoAwesomeIcon fontSize="small" />
        <span>{isLoading ? "Preparing sign up" : "Create an account"}</span>
      </button>

      <div className="nm-divider" />

      <p className="text-center text-sm text-slate-400">
        Already have one?{" "}
        <Link
          to="/login"
          className="font-medium text-accent transition-colors hover:text-accent-soft"
        >
          Sign in instead
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Signup;
