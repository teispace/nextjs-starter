/**
 * Theme configuration shared by the anti-flash script rendered in `<head>`
 * and the `<ThemeProvider>`. Keeping them in one object guarantees the script
 * and the provider agree on attribute, default, and system handling; if they
 * drifted, the first paint could disagree with React's idea of the theme.
 */
export const themeScriptConfig = {
  attribute: 'class',
  defaultTheme: 'system',
  enableSystem: true,
} as const;

export const themeProviderConfig = {
  ...themeScriptConfig,
  // Runtime-only concern: suppress CSS transitions while a theme switch applies.
  disableTransitionOnChange: true,
} as const;
