import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "#000000",
        foreground: "#FFFFFF",
        primary: "#FFC107",
        "primary-foreground": "#000000",
        secondary: {
          DEFAULT: "#000000",
          foreground: "#FFC107",
        },
        destructive: {
          DEFAULT: "#000000",
          foreground: "#FFFFFF"
        },
        popover: {
          DEFAULT: "#000000",
          foreground: "#FFFFFF"
        },
        accent: {
          DEFAULT: "#000000",
          foreground: "#FFFFFF"
        },
      },
      borderRadius: {
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
