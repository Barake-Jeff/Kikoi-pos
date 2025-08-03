// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Scan all relevant files in src
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // IMPORTANT: Add the prefix and disable preflight
  prefix: 'tw-',
  corePlugins: {
    // Disabling preflight removes Tailwind's base style resets,
    // which can conflict with MUI's own base styles.
    preflight: false, 
  },
}