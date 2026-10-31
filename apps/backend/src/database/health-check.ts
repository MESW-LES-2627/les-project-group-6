import type pg from 'pg';

export class DatabaseHealthCheck {
  constructor(private readonly pool: pg.Pool) {}

  async isHealthy(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
