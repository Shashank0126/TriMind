export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Manrope", "system-ui", "sans-serif"], mono: ["JetBrains Mono", "monospace"] },
      colors: { navy: { 950: "#070b18", 900: "#0b1224", 800: "#111b36" } },
    },
  },
  plugins: [],
};
