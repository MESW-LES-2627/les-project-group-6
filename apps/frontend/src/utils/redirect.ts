/** Only same-site paths are followed after login (no open redirects). */
export function safeRedirect(raw: unknown): string | null {
  return typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
}
