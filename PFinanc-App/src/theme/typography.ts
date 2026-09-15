/**
 * PFinanc Design System — Typography Scale
 * Font: Inter | Locale: en-IN
 */
import { TextStyle } from 'react-native';

export const Typography: Record<string, TextStyle> = {
  // ── Display (currency hero) ──────────────────────────────────────────
  displayCurrency: {
    fontFamily: 'Inter_700Bold',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.68, // ~-0.02em
    fontVariant: ['tabular-nums'],
  },
  displayCurrencyMobile: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.56,
    fontVariant: ['tabular-nums'],
  },

  // ── Headlines ────────────────────────────────────────────────────────
  headlineLg: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.36,
  },
  headlineMd: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  headlineSm: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.085,
  },

  // ── Body ─────────────────────────────────────────────────────────────
  bodyLg: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyMd: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },
  bodySm: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.065,
  },

  // ── Numeric / Financial Data ──────────────────────────────────────────
  numericData: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.15,
    fontVariant: ['tabular-nums'],
  },

  // ── Labels ───────────────────────────────────────────────────────────
  labelMd: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.24,
  },
  labelSm: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.33,
  },
};
