/**
 * PFinanc Design System — Spacing & Layout Tokens
 * Grid: 4/8px incremental
 */

export const Spacing = {
  '2xs': 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,

  // Layout
  layoutMargin: 16,
  layoutGutter: 12,

  // Touch targets
  touchTargetMin: 44,

  // Card & component internals
  cardPadding: 16,
  cardRadius: 16,
  buttonRadius: 12,
  pillRadius: 9999,

  // Component heights
  buttonHeight: 48,
  inputHeight: 48,
  navBarHeight: 64,
  listRowMinHeight: 60,
  avatarSm: 32,
  avatarMd: 40,
  avatarLg: 48,
} as const;
