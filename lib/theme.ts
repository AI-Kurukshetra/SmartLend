export const lightColors = {
  // Backgrounds
  pageBg:      '#f4f7f6',
  surface:     '#ffffff',
  surfaceMuted:'#f8fafc',
  surfaceHover:'#eef4f3',
  inputBg:     '#ffffff',

  // Borders
  border:      '#ebebeb',
  borderStrong:'#e5e7eb',

  // Text
  textPrimary:   '#0f172a',
  textSecondary: '#475569',
  textMuted:     '#64748b',

  // Brand
  brand:       '#0f766e',
  brandFg:     '#ffffff',
}

export const darkColors = {
  // Backgrounds — pure black palette
  pageBg:      '#000000',
  surface:     '#0f0f0f',
  surfaceMuted:'#141414',
  surfaceHover:'#1f1f1f',
  inputBg:     '#141414',

  // Borders
  border:      '#222222',
  borderStrong:'#2a2a2a',

  // Text — bright white for maximum contrast
  textPrimary:   '#ffffff',
  textSecondary: '#a0a0a0',
  textMuted:     '#666666',

  // Brand
  brand:       '#14b8a6',
  brandFg:     '#ffffff',
}

export type ThemeColors = typeof lightColors
