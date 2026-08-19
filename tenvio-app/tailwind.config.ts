import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#181614",
        fade: "#8a8171",
        sand: "#e7e2d7",
        paper: "#fffdf9",
        cream: "#f6f2ea",
      },
      borderRadius: {
        lg: "0.625rem",
        xl: "0.875rem",
      },
    },
  },
  plugins: [],
};

export default config;
