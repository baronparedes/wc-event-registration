/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        accent: "var(--color-accent)",
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        text: "var(--color-text)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        danger: "var(--color-danger)",
      },
      fontFamily: {
        heading: ["Manrope", "sans-serif"],
        body: ["Source Sans 3", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        card: "0 10px 30px -12px rgba(11, 95, 255, 0.2)",
      },
    },
  },
  plugins: [],
};
