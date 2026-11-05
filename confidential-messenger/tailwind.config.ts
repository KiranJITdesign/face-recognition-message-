import type { Config } from 'tailwindcss';
const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#0B0B0F',
      },
    },
  },
  plugins: [],
};
export default config;
