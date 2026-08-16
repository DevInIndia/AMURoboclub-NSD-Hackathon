/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark neumorphism works by lighting a single base colour from one
        // corner: every surface is the same colour as the page, and only the
        // paired shadows separate them. These are the tones the neumorphism
        // plugin derives its light/dark shadow pairs from.
        space: {
          base: "#252a3a",
          raised: "#2a3042",
          sunken: "#20242f",
        },
        accent: {
          DEFAULT: "#22d3ee",
          soft: "#67e8f9",
          deep: "#0e7490",
        },
        nebula: {
          DEFAULT: "#a78bfa",
          deep: "#7c3aed",
        },
      },
      // Shadow offsets the plugin builds its utilities from. It ships
      // xs/sm/default/lg/xl; `md` is added so every surface in index.css can
      // name its depth explicitly rather than relying on the unnamed default.
      neumorphismSize: {
        xs: "0.05em",
        sm: "0.1em",
        md: "0.2em",
        lg: "0.35em",
        xl: "0.6em",
      },
      animation: {
        "spin-slow": "spin 8s linear infinite",
        "bounce-slow": "bounce 3s infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/typography"), require("tailwindcss-neumorphism")],
};
