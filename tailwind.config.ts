import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.25rem",
        lg: "1.5rem",
        xl: "2rem",
        "2xl": "2.5rem",
      },
    },
    extend: {
      colors: {
        brand: {
          50: "#EEF7FF",
          100: "#DCEEFF",
          200: "#B8DDFF",
          300: "#8CC6FF",
          400: "#57A6FF",
          500: "#2B85FF",
          600: "#1F67E0",
          700: "#1E56B3",
          800: "#1D478F",
          900: "#193B73",
        },
        mint: {
          50: "#ECFDF7",
          100: "#D7FBEF",
          200: "#AEF6DE",
          300: "#7BEBC8",
          400: "#3FD6AA",
          500: "#1DBE91",
          600: "#129A75",
          700: "#107B5F",
          800: "#0F634E",
          900: "#0D5241",
        },
        blush: {
          50: "#FFF1F5",
          100: "#FFE3EB",
          200: "#FFC4D5",
          300: "#FF9AB7",
          400: "#FF6A92",
          500: "#F93B74",
          600: "#DA215E",
          700: "#B1154C",
          800: "#8B123F",
          900: "#731238",
        },
        surface: {
          0: "#FFFFFF",
          50: "#F8FAFF",
          100: "#F3F6FF",
          200: "#E9EEFF",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(20, 50, 100, 0.08)",
        card: "0 10px 25px rgba(17, 24, 39, 0.06)",
        lift: "0 14px 35px rgba(17, 24, 39, 0.10)",
      },
    },
  },
  plugins: [],
} satisfies Config;

