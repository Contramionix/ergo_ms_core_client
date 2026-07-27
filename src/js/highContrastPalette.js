/**
 * Палитра «Высокий контраст» — синхрон с theme_seed_catalog.py (имя темы).
 * Используется как временный override при prefers-contrast / forced-colors.
 */

export const HIGH_CONTRAST_PALETTE = Object.freeze({
  light: {
    headerBackground: 'rgba(255, 255, 255, 0.9)',
    authBackground: 'rgba(255, 255, 255, 0.78)',
    background: '#FFFFFF',
    border: '#1A1A1A',
    primaryText: '#0A0A0A',
    secondaryText: '#333333',
    primaryBackground: '#FFFFFF',
    secondaryBackground: '#F0F0F0',
    hoverBackground: '#E0E0EE',
    accent: '#0000EE',
  },
  dark: {
    headerBackground: 'rgba(18, 18, 18, 0.92)',
    authBackground: 'rgba(0, 0, 0, 0.88)',
    background: '#000000',
    border: '#FFFFFF',
    primaryText: '#FFFFFF',
    secondaryText: '#E0E0E0',
    primaryBackground: '#121212',
    secondaryBackground: '#1E1E1E',
    hoverBackground: '#2A3340',
    accent: '#66B2FF',
  },
})

export function getHighContrastColors(baseTheme = 'light') {
  return HIGH_CONTRAST_PALETTE[baseTheme === 'dark' ? 'dark' : 'light']
}
