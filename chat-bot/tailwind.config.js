/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}', 
    './components/**/*.{js,ts,jsx,tsx,mdx}', 
  ],
  theme: {
    extend: {
      screens: {
        mobile: '430px',
        tablet: '834px',
        desktop: '1280px',
      },
      backgroundColor: {
        'chat-input': '#2c2c2e',
      }
    }
  },
  plugins: [],
};