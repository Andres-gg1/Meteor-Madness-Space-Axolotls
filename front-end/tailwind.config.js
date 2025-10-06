/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'bebas': ['Bebas Neue', 'sans-serif'],
      },
      animation: {
        "meteor-effect": "meteor 5s linear infinite",
        "swing" : 'swing 3s ease-in-out infinite', // duration 2s, infinite loop
      },
      keyframes: {
        meteor: {
          "0%": { transform: "rotate(215deg) translateX(0)", opacity: 1 },
          "70%": { opacity: 1 },
          "100%": {
            transform: "rotate(215deg) translateX(-500px)",
            opacity: 0,
          },
        },
        swing: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(30px)' }, // adjust distance
        },
      },
      rotate: {
        '-19' : '-19deg',
      },
    },
  },
  plugins: [],
}

