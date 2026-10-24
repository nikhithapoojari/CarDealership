/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101820",
        floor: "#E4E7E9",
        mute: "#566470",
        stripe: "#F2C230",
        "stripe-dark": "#D9A90F",
        go: "#1F7A4D",
        low: "#8A5A00",
        stop: "#B3372B",
      },
      fontFamily: {
        display: ['"Archivo"', "system-ui", "sans-serif"],
        sans: ['"Public Sans"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
