import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        // Тёмная «космическая» палитра
        night: {
          900: "#0B0F1E",
          800: "#12172a",
          700: "#1A1F33",
        },
        brand: {
          blue: "#3b82f6",
          light: "#60a5fa",
          purple: "#8b5cf6",
        },
      },
      boxShadow: {
        card: "0 8px 30px rgba(0,0,0,0.35)",
        pop: "0 12px 40px rgba(0,0,0,0.5)",
        glow: "0 0 0 1px rgba(59,130,246,0.4), 0 8px 30px rgba(59,130,246,0.25)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
