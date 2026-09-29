/**
 * PFinanc Design System — Colors
 * Extracted from Google Stitch HTML/Tailwind config as the single source of truth.
 */

export const Colors = {
  // Brand primary palette
  primary: '#00216e',
  primaryContainer: '#0033a0',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#8ea6ff',
  primaryFixed: '#dce1ff',
  primaryFixedDim: '#b6c4ff',
  onPrimaryFixed: '#001550',
  onPrimaryFixedVariant: '#133ca8',
  inversePrimary: '#b6c4ff',

  // Secondary
  secondary: '#5f5e5e',
  secondaryContainer: '#e2dfde',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#636262',
  secondaryFixed: '#e5e2e1',
  secondaryFixedDim: '#c8c6c5',
  onSecondaryFixed: '#1c1b1b',
  onSecondaryFixedVariant: '#474746',

  // Tertiary (greens)
  tertiary: '#00301b',
  tertiaryContainer: '#00492c',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#55be87',
  tertiaryFixed: '#8ff8bc',
  tertiaryFixedDim: '#73dba1',
  onTertiaryFixed: '#002111',
  onTertiaryFixedVariant: '#005231',

  // Error
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#93000a',

  // Surfaces
  surfaceCanvas: '#F8FAFB',
  surface: '#eefcfa',
  surfaceBright: '#eefcfa',
  surfaceCard: '#FFFFFF',
  surfaceSubtle: '#F2F4F5',
  surfaceDim: '#ceddda',
  surfaceContainer: '#e2f1ee',
  surfaceContainerLow: '#e8f7f4',
  surfaceContainerHigh: '#dcebe9',
  surfaceContainerHighest: '#d7e6e3',
  surfaceContainerLowest: '#ffffff',
  surfaceVariant: '#d7e6e3',
  surfaceTint: '#3456c1',

  // On-surface
  onSurface: '#111e1d',
  onSurfaceVariant: '#444653',
  onBackground: '#111e1d',

  // Background
  background: '#eefcfa',

  // Inverse
  inverseOnSurface: '#e5f4f1',
  inverseSurface: '#263331',

  // Borders
  borderSubtle: '#E2E7E7',
  borderStrong: '#A9B2B1',

  // Outline
  outline: '#747684',
  outlineVariant: '#c4c5d5',

  // Semantic / Signal
  signalRed: '#D82C2C',
  incomeGreen: '#128A58',
  incomeGreenBg: '#E7F5EE',
  transferGray: '#5f5e5e',
} as const;

export type ColorToken = keyof typeof Colors;
