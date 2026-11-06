export const theme = {
  colors: {
    primary: '#1b4d3e',
    primaryDark: '#113329',
    primaryLight: '#e0f2f1',
    background: '#f5f7f8',
    cardBackground: '#ffffff',
    textPrimary: '#222222',
    textSecondary: '#666666',
    border: '#cccccc',
    success: '#2e7d32',
    error: '#c62828',
    white: '#ffffff',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12,
    pill: 999,
  },
  typography: {
    sizes: {
      xs: 12,
      sm: 14,
      md: 15,
      lg: 17,
      xl: 20,
      xxl: 22,
    },
    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
};

export type Theme = typeof theme;