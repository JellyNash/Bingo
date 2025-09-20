import tokens from "../_design-tokens/tailwind.theme.json";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: tokens.color.surface.base,
        accent: tokens.color.brand.secondary,
        card: tokens.color.surface.raised,
        ...tokens.color
      },
      boxShadow: tokens.shadow,
      borderRadius: tokens.radius,
      opacity: tokens.opacity,
      spacing: tokens.spacing
    }
  },
  plugins: []
}