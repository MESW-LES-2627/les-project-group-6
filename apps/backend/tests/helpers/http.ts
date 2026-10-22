import type { AddressInfo } from 'node:net';
import type { Express } from 'express';

export async function withApp(
  app: Express,
  callback: (url: string) => Promise<void>,
): Promise<void> {
  const server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}
