import React, { useState, useRef, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import NightsStayIcon from "@mui/icons-material/NightsStay";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LoginIcon from "@mui/icons-material/Login";
import { useAuth } from "../context/AuthContext";

const Header = () => {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const links = [
    { to: "/", label: "Home" },
    { to: "/stargazing", label: "Stargazing" },
    // Both of these are behind auth, so only offer them once signed in.
    ...(isAuthenticated
      ? [
          { to: "/advance", label: "Classifier" },
          { to: "/history", label: "Archive" },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-20 bg-space-base/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link to="/" className="flex items-center gap-3">
          <span className="nm-flat-space-base-sm grid h-10 w-10 place-items-center rounded-full text-accent">
            <NightsStayIcon fontSize="small" />
          </span>
          <span className="text-lg font-semibold tracking-wide text-slate-100">
            Celestial Chatbot
          </span>
        </Link>

        <div className="flex items-center gap-3" ref={dropdownRef}>
          <nav className="hidden items-center gap-2 md:flex">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2 text-sm transition-all duration-200 ${
                    isActive
                      ? "nm-inset-space-base-sm text-accent"
                      : "text-slate-400 hover:text-slate-100"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {isLoading ? (
            <span className="nm-flat-space-base-sm h-11 w-11 rounded-full" />
          ) : isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((open) => !open)}
                className="nm-icon-button overflow-hidden p-0"
                aria-haspopup="menu"
                aria-expanded={dropdownOpen}
                aria-label="Account menu"
              >
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <PersonOutlineIcon fontSize="small" />
                )}
              </button>

              {dropdownOpen && (
                <div
                  role="menu"
                  className="nm-surface absolute right-0 top-14 w-60 overflow-hidden p-2 animate-fade-in"
                >
                  <div className="px-4 py-3">
                    <p className="truncate text-sm font-medium text-slate-100">
                      {user?.name || "Signed in"}
                    </p>
                    {user?.email && (
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    )}
                  </div>

                  <div className="nm-divider my-1" />

                  <button
                    type="button"
                    onClick={signOut}
                    role="menuitem"
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-slate-300 transition-colors hover:text-accent"
                  >
                    <LogoutIcon fontSize="small" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="nm-button flex items-center gap-2 px-5 py-2.5 text-sm"
            >
              <LoginIcon fontSize="small" />
              <span>Sign in</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
