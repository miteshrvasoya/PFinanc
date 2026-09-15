/**
 * PFinanc Design System — Color Tokens
 * Based on "Kinship Wealth OS" Stitch design system
 */

export const Colors = {
  // ── Core Brand ──────────────────────────────────────────────────────
  primary: '#0F172A',      // Slate — authority, structural permanence
  primaryDark: '#1E293B',  // Pressed state
  secondary: '#3B82F6',    // Blue — active states, interactions
  tertiary: '#6366F1',     // Indigo — investment / wealth growth vehicles

  // ── Surface System ───────────────────────────────────────────────────
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceDim: '#F1F5F9',
  surfaceVariant: '#E2E8F0',
  border: '#E2E8F0',
  borderFocus: '#3B82F6',

  // ── Text ─────────────────────────────────────────────────────────────
  onPrimary: '#FFFFFF',
  onSurface: '#0F172A',
  onSurfaceMuted: '#64748B',  // Slate blue — secondary metadata
  onSurfaceSubtle: '#94A3B8',

  // ── Semantic — Financial Telemetry ───────────────────────────────────
  success: '#10B981',     // Emerald — cash inflow, positive
  successBg: 'rgba(16, 185, 129, 0.1)',
  danger: '#EF4444',      // Crimson — outflow / expense
  dangerBg: 'rgba(239, 68, 68, 0.1)',
  warning: '#F59E0B',     // Amber — due soon / attention
  warningBg: 'rgba(245, 158, 11, 0.1)',
  transfer: '#64748B',    // Neutral — household transfers

  // ── Bottom Nav ───────────────────────────────────────────────────────
  navActive: '#0F172A',
  navInactive: '#64748B',
  navAccentDot: '#3B82F6',

  // ── Overlay / Scrim ──────────────────────────────────────────────────
  scrim: 'rgba(15, 23, 42, 0.4)',

  // ── Card Shadows ─────────────────────────────────────────────────────
  shadowColor: 'rgba(15, 23, 42, 0.08)',
} as const;

export type ColorKey = keyof typeof Colors;
