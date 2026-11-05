import type { Config } from 'tailwindcss';
const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-canvas)',
        panel: 'var(--color-panel)',
        accent: 'var(--color-accent)',
        muted: 'var(--color-text-muted)',
      },
    },
  },
  plugins: [],
};
export default config;
