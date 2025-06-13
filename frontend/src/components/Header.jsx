import React from "react";
import FlareIcon from "@mui/icons-material/Flare";

const Header = () => {
  return (
    <header className="bg-black/20 backdrop-blur-sm border-b border-purple-500/20 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-yellow-400">
            <FlareIcon />
            <h1 className="text-xl font-bold tracking-wide">
              Celestial Chatbot
            </h1>
          </div>
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
        </div>
      </div>
    </header>
  );
};

export default Header;
