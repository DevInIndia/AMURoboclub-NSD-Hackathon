import React, { useState, useRef, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";

const Header = () => {
  const { user,loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setDropdownOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) return null;

  return (
    <header className="bg-black/20 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-10 shadow-lg">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo & Branding */}
        <div className="flex items-center space-x-3 text-yellow-400">
          <img src="/favicon.png" alt="Celestial Icon" className="w-6 h-6" />
          <h1 className="text-xl font-bold tracking-wide">Celestial Chatbot</h1>
        </div>

        {/* Nav + Avatar */}
        <div className="relative flex items-center space-x-4" ref={dropdownRef}>
          <nav className="hidden md:flex items-center space-x-6">
            <a
              href="/"
              className="text-cyan-300 hover:text-white transition-colors duration-300 px-3 py-1 rounded-lg hover:bg-white/10"
            >
              Home
            </a>
            <a
              href="/history"
              className="text-cyan-300 hover:text-white transition-colors duration-300 px-3 py-1 rounded-lg hover:bg-white/10"
            >
              History
            </a>
            <a
              href="/stargazing"
              className="text-cyan-300 hover:text-white transition-colors duration-300 px-3 py-1 rounded-lg hover:bg-white/10"
            >
              Stargazing
            </a>
          </nav>

          {/* Avatar */}
          <img
            src={user?.photoURL || "/person.png"}
            alt="User Profile"
            className="w-9 h-9 rounded-full border border-cyan-400 cursor-pointer shadow-md transition-transform hover:scale-110"
            title={user?.displayName || "Sign in"}
            onClick={() => {
              if (user) setDropdownOpen((prev) => !prev);
            }}
          />

          {/* Dropdown */}
          {dropdownOpen && user && (
            <div className="absolute right-0 top-12 w-56 bg-white/10 backdrop-blur-md border border-cyan-400/30 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in">
              <div className="px-4 py-3 text-sm text-white border-b border-purple-400/30 flex items-center gap-3">
                <img
                  src={user.photoURL}
                  alt="avatar"
                  className="w-8 h-8 rounded-full border border-cyan-300"
                />
                <span className="truncate">{user.displayName}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-3 text-left text-sm text-purple-300 hover:bg-blue-300/20 transition-colors"
              >
                🚪 Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
