import React from "react";

const AdvancedSearchButton = () => {
  return (
    <a
      href="/advance"
      className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
    >
      <div className="flex items-center space-x-2">
        <span>Advanced Search</span>
        <svg
          className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </a>
  );
};

export default AdvancedSearchButton;
