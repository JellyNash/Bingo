import tokens from '../_design-tokens/tailwind.theme.json';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: tokens.color,
      boxShadow: tokens.shadow,
      borderRadius: tokens.radius,
      opacity: tokens.opacity,
      spacing: tokens.spacing
    }
  },
  plugins: []
};