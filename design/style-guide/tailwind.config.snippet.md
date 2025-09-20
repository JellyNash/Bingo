```ts
import type { Config } from "tailwindcss";
import theme from "../apps/_design-tokens/tailwind.theme.json" assert { type: "json" };

export default {
  content: ["./apps/**/*.{ts,tsx}", "./packages/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: theme.color,
      boxShadow: theme.shadow,
      borderRadius: theme.radius,
      opacity: theme.opacity,
      fontFamily: {
        display: ["Space Grotesk", "Segoe UI", "sans-serif"],
        heading: ["Space Grotesk", "Segoe UI", "sans-serif"],
        sans: ["Inter", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

_Approved by Agent B — UX/UI_
