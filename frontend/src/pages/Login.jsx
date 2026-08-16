import React from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import LoginIcon from "@mui/icons-material/Login";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

const Login = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const location = useLocation();

  // Where the user was headed before being bounced here.
  const returnTo = location.state?.from ?? "/";

  if (isAuthenticated) return <Navigate to={returnTo} replace />;

  return (
    <AuthLayout
      icon={<LoginIcon fontSize="large" />}
      title="Welcome back"
      subtitle="Sign in to ask the cosmos, classify stars, and pick up your archive where you left it."
    >
      <button
        type="button"
        onClick={() => login(returnTo)}
        disabled={isLoading}
        className="nm-button-accent flex w-full items-center justify-center gap-3 py-4"
      >
        <RocketLaunchIcon fontSize="small" />
        <span>{isLoading ? "Preparing sign in" : "Continue to sign in"}</span>
      </button>

      <div className="flex items-start gap-3 text-sm text-slate-500">
        <ShieldOutlinedIcon fontSize="small" className="mt-0.5 shrink-0" />
        <p>
          Authentication is handled by Auth0 on its own secure page. Your
          password is never typed into this site.
        </p>
      </div>

      <div className="nm-divider" />

      <p className="text-center text-sm text-slate-400">
        New here?{" "}
        <Link
          to="/signup"
          className="font-medium text-accent transition-colors hover:text-accent-soft"
        >
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
