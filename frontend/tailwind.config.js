/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        dark: {
          bg: '#0B0F17',
          card: '#151C2C',
          border: '#232D42',
          hover: '#1E293B',
        },
        figma: {
          bg: '#F8F9FA',
          card: '#FFFFFF',
          border: '#E4E4E7',
          hover: '#F4F4F5',
          green: '#10B981',
          'green-light': '#E6F4EA',
          'green-hover': '#059669',
          orange: '#FEF3C7',
          'orange-text': '#D97706',
          text: '#18181B',
          muted: '#71717A',
          subtle: '#A1A1AA',
        },
      },
    },
  },
  plugins: [],
};
