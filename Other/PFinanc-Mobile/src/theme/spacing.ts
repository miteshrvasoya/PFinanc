/**
 * PFinanc Design System — Spacing
 * Extracted from Google Stitch Tailwind spacing config.
 */

export const Spacing = {
  xs: 4,    // space-xs: 0.25rem
  sm: 8,    // space-sm: 0.5rem
  md: 16,   // space-md: 1rem
  lg: 24,   // space-lg: 1.5rem
  xl: 40,   // space-xl: 2.5rem
  '2xl': 64, // space-2xl: 4rem

  // Named aliases matching Stitch semantics
  marginMobile: 20, // margin-mobile: 1.25rem
  margin: 40,       // margin: 2.5rem
  gutterMobile: 16, // gutter-mobile: 1rem
  gutter: 24,       // gutter: 1.5rem
} as const;

export type SpacingToken = keyof typeof Spacing;
