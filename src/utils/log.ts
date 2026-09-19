/**
 * Debug tracing that disappears from release builds.
 *
 * The import path logs filenames from the user's library to make timing
 * problems traceable. Device logs are readable from a connected Mac and end up
 * in sysdiagnose bundles, so those traces stay in development builds only.
 * Warnings and errors are kept everywhere — they describe genuine failures and
 * carry no library contents.
 */
export const log = {
  debug: __DEV__ ? console.log : () => {},
  warn: console.warn,
  error: console.error,
};
