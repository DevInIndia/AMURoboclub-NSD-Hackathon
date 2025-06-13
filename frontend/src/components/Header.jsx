import React, { useEffect, useState, useRef } from "react";
import { auth } from "../firebase";

const Header = () => {
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      setDropdownOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-black/20 backdrop-blur-sm border-b border-purple-500/20 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-yellow-400">
            <img src="/favicon.png" alt="Celestial Icon" className="w-6 h-6" />
            <h1 className="text-xl font-bold tracking-wide">
              Celestial Chatbot
            </h1>
          </div>

          <div
            className="flex items-center space-x-4 relative"
            ref={dropdownRef}
          >
            <nav className="hidden md:flex items-center space-x-6">
              <a
                href="#"
                className="text-cyan-300 hover:text-white transition-colors duration-300 px-3 py-1 rounded-lg hover:bg-white/10"
              >
                Features
              </a>
              <a
                href="#"
                className="text-cyan-300 hover:text-white transition-colors duration-300 px-3 py-1 rounded-lg hover:bg-white/10"
              >
                Stargazing
              </a>
              <a
                href="#"
                className="text-cyan-300 hover:text-white transition-colors duration-300 px-3 py-1 rounded-lg hover:bg-white/10"
              >
                About
              </a>
            </nav>

            <img
              src={user?.photoURL || "/default-user.png"}
              alt="User Profile"
              className="w-8 h-8 rounded-full border border-cyan-400 cursor-pointer transition-transform hover:scale-105"
              title={user?.displayName || "Sign in"}
              onClick={() => {
                if (user) {
                  setDropdownOpen((prev) => !prev);
                } else {
                  window.location.href = "/login"; // Or trigger Firebase signInWithPopup
                }
              }}
            />

            {dropdownOpen && user && (
              <div className="absolute right-0 mt-2 w-44 bg-white/90 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-2 text-gray-800 text-sm border-b font-medium">
                  {user.displayName}
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-100 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
