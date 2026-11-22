import crypto from 'crypto';
import { QueryHelper } from '../../database/queryHelper.js';

export const MCP_SCOPES = ['investments', 'cashflow', 'household'] as const;
export type McpScope = (typeof MCP_SCOPES)[number];

export const MCP_SCOPE_INFO: Record<McpScope, string> = {
  investments: 'Holdings, trades, portfolio performance, live prices and AI report (your own accounts)',
  cashflow: 'Aggregated income, spending and savings figures (no transaction details)',
  household: 'Also include other family members\' investments (household-wide view)',
};

const TOKEN_PREFIX = 'pfmcp_';
const MAX_ACTIVE_TOKENS_PER_USER = 10;

export interface McpAuthContext {
  tokenId: string;
  userId: string;
  householdId: string;
  scopes: McpScope[];
  tokenName: string;
}

const hashToken = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex');

function httpError(status: number, code: string, message: string) {
  const e: any = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

export class McpTokensService {
  static async createToken(
    userId: string,
    householdId: string,
    input: { name?: string; scopes?: string[]; expiresInDays?: number | null }
  ) {
    const name = (input.name || '').trim().slice(0, 100);
    if (!name) throw httpError(400, 'NAME_REQUIRED', 'Give the connection a name, for example "Claude" or "ChatGPT".');

    const scopes = Array.from(new Set((input.scopes && input.scopes.length ? input.scopes : ['investments']))) as string[];
    const invalid = scopes.filter((s) => !(MCP_SCOPES as readonly string[]).includes(s));
    if (invalid.length) throw httpError(400, 'INVALID_SCOPE', `Unknown scope: ${invalid.join(', ')}`);
    if (scopes.includes('household') && !scopes.includes('investments')) scopes.push('investments');

    let expiresAt: Date | null = null;
    if (input.expiresInDays != null) {
      const days = Number(input.expiresInDays);
      if (!Number.isFinite(days) || days < 1 || days > 365) throw httpError(400, 'INVALID_EXPIRY', 'Expiry must be between 1 and 365 days.');
      expiresAt = new Date(Date.now() + days * 86_400_000);
    }

    const active = await QueryHelper.queryOne<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM mcp_access_tokens
       WHERE user_id = $1 AND household_id = $2 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId, householdId]
    );
    if (Number(active?.n || 0) >= MAX_ACTIVE_TOKENS_PER_USER) {
      throw httpError(400, 'TOO_MANY_TOKENS', `You can have up to ${MAX_ACTIVE_TOKENS_PER_USER} active connections. Revoke one first.`);
    }

    const raw = TOKEN_PREFIX + crypto.randomBytes(32).toString('base64url');
    const row = await QueryHelper.queryOne<any>(
      `INSERT INTO mcp_access_tokens (user_id, household_id, name, token_hash, token_prefix, scopes, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, token_prefix, scopes, expires_at, created_at`,
      [userId, householdId, name, hashToken(raw), raw.slice(0, 10), scopes, expiresAt]
    );
    // The plaintext token is returned exactly once and never stored.
    return { token: raw, connection: this.publicRow(row) };
  }

  static async listTokens(userId: string, householdId: string) {
    const rows = await QueryHelper.query<any>(
      `SELECT id, name, token_prefix, scopes, expires_at, revoked_at, last_used_at, use_count, created_at
       FROM mcp_access_tokens WHERE user_id = $1 AND household_id = $2
       ORDER BY created_at DESC LIMIT 50`,
      [userId, householdId]
    );
    return rows.map((r) => this.publicRow(r));
  }

  static async revokeToken(id: string, userId: string, householdId: string) {
    const row = await QueryHelper.queryOne<any>(
      `UPDATE mcp_access_tokens SET revoked_at = NOW()
       WHERE id = $1 AND user_id = $2 AND household_id = $3 AND revoked_at IS NULL RETURNING id`,
      [id, userId, householdId]
    );
    if (!row) throw httpError(404, 'TOKEN_NOT_FOUND', 'Connection not found or already revoked.');
  }

  /** Resolve a presented token to an auth context, or null when it is unknown, revoked, expired or its user is inactive. */
  static async verify(raw: string): Promise<McpAuthContext | null> {
    if (!raw || !raw.startsWith(TOKEN_PREFIX) || raw.length > 200) return null;
    const row = await QueryHelper.queryOne<any>(
      `SELECT t.id, t.name, t.user_id, t.household_id, t.scopes
       FROM mcp_access_tokens t
       JOIN users u ON u.id = t.user_id AND u.status = 'ACTIVE'
       JOIN household_members hm ON hm.user_id = t.user_id AND hm.household_id = t.household_id
       WHERE t.token_hash = $1 AND t.revoked_at IS NULL AND (t.expires_at IS NULL OR t.expires_at > NOW())`,
      [hashToken(raw)]
    );
    if (!row) return null;
    // Best-effort bookkeeping; never fail a request because of it.
    QueryHelper.query(`UPDATE mcp_access_tokens SET last_used_at = NOW(), use_count = use_count + 1 WHERE id = $1`, [row.id]).catch(() => {});
    return { tokenId: row.id, userId: row.user_id, householdId: row.household_id, scopes: row.scopes as McpScope[], tokenName: row.name };
  }

  static async logActivity(tokenId: string, tool: string, status: 'OK' | 'ERROR' | 'DENIED', durationMs: number) {
    await QueryHelper.query(`INSERT INTO mcp_activity (token_id, tool, status, duration_ms) VALUES ($1, $2, $3, $4)`, [
      tokenId, tool.slice(0, 100), status, Math.round(durationMs),
    ]).catch(() => {});
  }

  static async listActivity(userId: string, householdId: string, limit = 50) {
    return QueryHelper.query<any>(
      `SELECT a.id, a.tool, a.status, a.duration_ms, a.created_at, t.name AS connection_name
       FROM mcp_activity a JOIN mcp_access_tokens t ON t.id = a.token_id
       WHERE t.user_id = $1 AND t.household_id = $2
       ORDER BY a.created_at DESC LIMIT $3`,
      [userId, householdId, Math.min(Math.max(limit, 1), 200)]
    );
  }

  private static publicRow(r: any) {
    const expired = r.expires_at && new Date(r.expires_at).getTime() <= Date.now();
    return {
      id: r.id,
      name: r.name,
      tokenHint: `${r.token_prefix}…`,
      scopes: r.scopes,
      expiresAt: r.expires_at,
      revokedAt: r.revoked_at ?? null,
      lastUsedAt: r.last_used_at ?? null,
      useCount: r.use_count ?? 0,
      createdAt: r.created_at,
      status: r.revoked_at ? 'REVOKED' : expired ? 'EXPIRED' : 'ACTIVE',
    };
  }
}
