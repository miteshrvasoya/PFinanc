import { PoolClient, QueryResultRow } from 'pg';
import { pool } from './db.js';

export interface QueryExecutor {
  query<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<{ rows: T[]; rowCount: number | null }>;
}

export class QueryHelper {
  /**
   * Execute raw parameterized SQL query on the pool or client
   */
  static async query<T extends QueryResultRow = any>(
    sql: string,
    params: any[] = [],
    client?: PoolClient
  ): Promise<T[]> {
    const executor: QueryExecutor = client || pool;
    const res = await executor.query<T>(sql, params);
    return res.rows;
  }

  /**
   * Execute raw parameterized SQL query and return the first row or null
   */
  static async queryOne<T extends QueryResultRow = any>(
    sql: string,
    params: any[] = [],
    client?: PoolClient
  ): Promise<T | null> {
    const rows = await this.query<T>(sql, params, client);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Safe parameterized INSERT returning the newly created row
   */
  static async insert<T extends QueryResultRow = any>(
    tableName: string,
    data: Record<string, any>,
    client?: PoolClient
  ): Promise<T> {
    const keys = Object.keys(data).filter((k) => data[k] !== undefined);
    if (keys.length === 0) {
      throw new Error(`Cannot insert empty object into ${tableName}`);
    }

    const columns = keys.map((k) => `"${k}"`).join(', ');
    const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
    const values = keys.map((k) => data[k]);

    const sql = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders}) RETURNING *`;
    const res = await this.query<T>(sql, values, client);
    return res[0];
  }

  /**
   * Safe parameterized UPDATE returning the updated row
   */
  static async update<T extends QueryResultRow = any>(
    tableName: string,
    id: string,
    data: Record<string, any>,
    additionalWhere = '',
    additionalParams: any[] = [],
    client?: PoolClient
  ): Promise<T | null> {
    const keys = Object.keys(data).filter((k) => data[k] !== undefined && k !== 'id');
    if (keys.length === 0) {
      return this.queryOne<T>(`SELECT * FROM "${tableName}" WHERE id = $1`, [id], client);
    }

    const setClauses = keys.map((k, idx) => `"${k}" = $${idx + 1}`).join(', ');
    const values = keys.map((k) => data[k]);

    const idParamIndex = values.length + 1;
    values.push(id);

    let whereSql = `WHERE id = $${idParamIndex}`;
    if (additionalWhere) {
      const offset = values.length;
      let adjustedWhere = additionalWhere;
      additionalParams.forEach((param, pIdx) => {
        values.push(param);
        adjustedWhere = adjustedWhere.replace(new RegExp(`\\$${pIdx + 1}`, 'g'), `$${offset + pIdx + 1}`);
      });
      whereSql += ` AND (${adjustedWhere})`;
    }

    const sql = `UPDATE "${tableName}" SET ${setClauses}, updated_at = NOW() ${whereSql} RETURNING *`;
    return this.queryOne<T>(sql, values, client);
  }

  /**
   * Safe parameterized DELETE by ID
   */
  static async delete(
    tableName: string,
    id: string,
    additionalWhere = '',
    additionalParams: any[] = [],
    client?: PoolClient
  ): Promise<boolean> {
    const values: any[] = [id];
    let whereSql = `WHERE id = $1`;

    if (additionalWhere) {
      additionalParams.forEach((param, pIdx) => {
        values.push(param);
        whereSql += ` AND (${additionalWhere.replace(new RegExp(`\\$${pIdx + 1}`, 'g'), `$${pIdx + 2}`)})`;
      });
    }

    const executor: QueryExecutor = client || pool;
    const res = await executor.query(`DELETE FROM "${tableName}" ${whereSql}`, values);
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Execute multiple operations atomically within a PostgreSQL transaction
   */
  static async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
