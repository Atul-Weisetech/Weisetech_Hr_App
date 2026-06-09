import { Platform, StyleSheet } from 'react-native';

export const colors = {
  background: '#f3f4f6',
  surface: '#ffffff',
  primary: '#CC0D49',
  primaryDark: '#9f0b38',
  danger: '#ef4444',
  border: '#e5e7eb',
  text: '#0f172a',
  muted: '#64748b',
  onPrimary: '#ffffff',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 16,
  xl: 24,
};

export const radius = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 18,
  round: 999,
};

export const sharedStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 2,
      },
    }),
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  buttonText: {
    color: colors.onPrimary,
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  mutedText: {
    color: colors.muted,
  },
  authRoot: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  authScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  authLogoContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  authLogoImage: {
    width: 200,
    height: 110,
  },
  authCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 26,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  authTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1d4ed8',
    textAlign: 'center',
    marginBottom: 8,
  },
  authFieldGroup: {
    marginBottom: 18,
  },
  authPasswordWrapper: {
    position: 'relative',
  },
  authPasswordInput: {
    paddingRight: 64,
  },
  authEyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  authEyeText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '700',
  },
  listHeaderCard: {
    marginBottom: 10,
    gap: 8,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  pageSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: -4,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
    backgroundColor: '#f8fafc',
    marginTop: 4,
  },
  tabsWrap: {
    marginBottom: 10,
  },
  tabsContent: {
    gap: 8,
    paddingRight: 4,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.round,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tabTextActive: {
    color: colors.onPrimary,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#94a3b8',
    fontWeight: '600',
  },

  /* Bottom tab bar — used by HRDashboardScreen (and EmployeeStack) */
  bottomTabContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bottomTabScreenContainer: {
    flex: 1,
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 6,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 10,
  },
  bottomTabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  bottomTabIndicator: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  bottomTabIcon: {
    marginTop: 2,
  },
  bottomTabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 3,
  },
  bottomTabLabelActive: {
    color: colors.primary,
  },
});

export default {
  colors,
  spacing,
  radius,
  sharedStyles,
};
