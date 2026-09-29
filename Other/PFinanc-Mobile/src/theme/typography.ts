/**
 * PFinanc Design System — Typography
 * Extracted from Google Stitch Tailwind font config.
 *
 * Two font families:
 *  - Hanken Grotesk → UI text (body, headline, labels)
 *  - JetBrains Mono → Financial metrics, label-sm, label-md
 */

import { TextStyle } from 'react-native';

export const FontFamily = {
  hanken: 'HankenGrotesk_400Regular',
  hankenMedium: 'HankenGrotesk_500Medium',
  hankenSemiBold: 'HankenGrotesk_600SemiBold',
  hankenBold: 'HankenGrotesk_700Bold',
  hankenExtraBold: 'HankenGrotesk_800ExtraBold',
  jetbrains: 'JetBrainsMono_400Regular',
  jetbrainsMedium: 'JetBrainsMono_500Medium',
  jetbrainsSemiBold: 'JetBrainsMono_600SemiBold',
  jetbrainsBold: 'JetBrainsMono_700Bold',
} as const;


/**
 * Maps to Stitch fontFamily tokens.
 * label-sm and label-md use JetBrains Mono.
 * Everything else uses Hanken Grotesk.
 */
export const Typography = {
  'display-hero': {
    fontFamily: FontFamily.hanken,
    fontSize: 56,
    lineHeight: 62,
    letterSpacing: -0.03 * 56,
    fontWeight: '800' as TextStyle['fontWeight'],
  },
  'display-hero-mobile': {
    fontFamily: FontFamily.hanken,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.02 * 36,
    fontWeight: '800' as TextStyle['fontWeight'],
  },
  'headline-lg': {
    fontFamily: FontFamily.hanken,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.02 * 36,
    fontWeight: '700' as TextStyle['fontWeight'],
  },
  'headline-lg-mobile': {
    fontFamily: FontFamily.hanken,
    fontSize: 28,
    lineHeight: 35,
    letterSpacing: -0.015 * 28,
    fontWeight: '700' as TextStyle['fontWeight'],
  },
  'headline-md': {
    fontFamily: FontFamily.hanken,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.01 * 24,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  'headline-sm': {
    fontFamily: FontFamily.hanken,
    fontSize: 20,
    lineHeight: 27,
    letterSpacing: -0.005 * 20,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  'body-lg': {
    fontFamily: FontFamily.hanken,
    fontSize: 18,
    lineHeight: 29,
    letterSpacing: 0,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  'body-md': {
    fontFamily: FontFamily.hanken,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  'body-sm': {
    fontFamily: FontFamily.hanken,
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0.005 * 14,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  'label-lg': {
    fontFamily: FontFamily.hanken,
    fontSize: 14,
    lineHeight: 17,
    letterSpacing: 0.02 * 14,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  'label-md': {
    fontFamily: FontFamily.jetbrains,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.01 * 13,
    fontWeight: '500' as TextStyle['fontWeight'],
  },
  'label-sm': {
    fontFamily: FontFamily.jetbrains,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.04 * 11,
    fontWeight: '500' as TextStyle['fontWeight'],
  },
  'financial-metric-lg': {
    fontFamily: FontFamily.jetbrains,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.02 * 32,
    fontWeight: '700' as TextStyle['fontWeight'],
  },
  'financial-metric-sm': {
    fontFamily: FontFamily.jetbrains,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.01 * 18,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
} as const;

export type TypographyToken = keyof typeof Typography;
