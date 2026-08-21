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
        // Centralized brand accent — same hex values as Tailwind's default
        // `orange` scale (this file used to reference `orange-*` directly
        // everywhere). Retune the brand color by editing only these six
        // values instead of hunting through every page.
        brand: {
          50: "#fff7ed",
          200: "#fed7aa",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
        },
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
