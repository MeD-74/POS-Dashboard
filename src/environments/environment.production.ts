/**
 * Production environment (swapped in via angular.json `fileReplacements`).
 *
 * The mock backend stays enabled here so the built demo remains fully
 * functional. In a real deployment set `useMockBackend: false` and point
 * `apiBaseUrl` at the live gateway.
 */
export const environment = {
  production: true,
  useMockBackend: true,
  apiBaseUrl: '/api',
};
