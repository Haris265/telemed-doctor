import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#0d9488",
          600: "#0f766e",
          700: "#115e59",
          800: "#134e4a",
          900: "#042f2e",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
