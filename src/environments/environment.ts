/**
 * Development / default environment.
 *
 * `useMockBackend` gates the MSW mock backend and the realtime simulation, so a
 * real deployment flips a single flag (and swaps the `RealtimeGateway` provider)
 * to talk to live services. `apiBaseUrl` is the single place every API service
 * reads its base URL from.
 */
export const environment = {
  production: false,
  useMockBackend: true,
  apiBaseUrl: '/api',
};
