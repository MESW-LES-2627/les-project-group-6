const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

export async function getHealth(): Promise<string> {
  const response = await fetch(`${baseUrl}/health`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const body: unknown = await response.json();
  if (
    typeof body !== 'object' ||
    body === null ||
    !('status' in body) ||
    typeof body.status !== 'string'
  ) {
    throw new Error('Invalid health response');
  }

  return body.status;
}
