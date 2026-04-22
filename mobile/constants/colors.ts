export const Colors = {
  light: {
    primary: '#34699A',
    primaryDark: '#265580',
    accent: '#F59E0B',
    accentDark: '#D97706',
    background: '#F0F4F8',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    foreground: '#1A2332',
    secondary: '#64748B',
    muted: '#F1F5F9',
    border: '#E2E8F0',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    tabBar: '#FFFFFF',
    tabBarActive: '#34699A',
    tabBarInactive: '#94A3B8',
    gradient: ['#34699A', '#1E3A5F'] as const,
    radius: 12,
    hot: '#EF4444',
    almostFull: '#F59E0B',
  },
};

export type ColorScheme = typeof Colors.light;
