/**
 * PFinanc Design System — Border Radii & Shadows
 * Extracted from Google Stitch Tailwind borderRadius config.
 */

export const Radii = {
  DEFAULT: 4,   // 0.25rem
  lg: 8,        // 0.5rem
  xl: 12,       // 0.75rem
  full: 9999,   // 9999px
  '2xl': 24,    // 1.5rem (used for nav pill, cards)
  '3xl': 28,    // rounded-3xl in Stitch nav bar
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0033a0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  navBar: {
    shadowColor: '#0033a0',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
  fab: {
    shadowColor: '#0033a0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
} as const;

export type ShadowToken = keyof typeof Shadows;
