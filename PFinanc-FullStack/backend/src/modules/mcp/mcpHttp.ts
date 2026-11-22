import { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { config } from '../../config/env.js';
import { createPfinancMcpServer } from './mcpServer.js';
import { McpTokensService } from './mcpTokens.service.js';

const RATE_LIMIT_PER_MINUTE = 60;
const hits = new Map<string, number[]>();

function rateLimited(tokenId: string): number | null {
  const now = Date.now();
  const recent = (hits.get(tokenId) || []).filter((t) => now - t < 60_000);
  if (recent.length >= RATE_LIMIT_PER_MINUTE) {
    hits.set(tokenId, recent);
    return Math.ceil((60_000 - (now - recent[0])) / 1000);
  }
  recent.push(now);
  hits.set(tokenId, recent);
  return null;
}
// Keep the map from growing without bound.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (v.every((t) => now - t >= 60_000)) hits.delete(k);
}, 5 * 60_000).unref();

const rpcError = (res: Response, status: number, code: number, message: string) =>
  res.status(status).json({ jsonrpc: '2.0', error: { code, message }, id: null });

/**
 * POST /mcp            (Authorization: Bearer pfmcp_...)
 * POST /mcp/t/:token   (token in the URL, for connector UIs that only accept a URL)
 *
 * Stateless Streamable HTTP: each request builds a fresh server bound to the token holder, which makes the
 * endpoint safe behind load balancers and trivially restart-proof for self-hosters.
 */
export async function handleMcpRequest(req: Request, res: Response) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return rpcError(res, 405, -32000, 'Method not allowed. Use POST (stateless Streamable HTTP).');
    }

    // Browsers send Origin; a legitimate assistant backend does not. Reject foreign browser origins
    // (DNS-rebinding protection from the MCP spec).
    const origin = req.headers.origin;
    if (origin && origin !== config.corsOrigin) {
      return rpcError(res, 403, -32000, 'Origin not allowed.');
    }

    const header = req.headers.authorization;
    const raw = header?.startsWith('Bearer ') ? header.slice(7).trim() : (req.params as any)?.token;
    if (!raw) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="pfinanc-mcp"');
      return rpcError(res, 401, -32001, 'Missing access token. Create a connection in PFinanc (AI Advisor > Connect AI) and send it as a Bearer token.');
    }

    const auth = await McpTokensService.verify(raw);
    if (!auth) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="pfinanc-mcp", error="invalid_token"');
      return rpcError(res, 401, -32001, 'Invalid, expired or revoked access token.');
    }

    const wait = rateLimited(auth.tokenId);
    if (wait !== null) {
      res.setHeader('Retry-After', String(wait));
      return rpcError(res, 429, -32002, 'Too many requests. Slow down and retry shortly.');
    }

    const server = createPfinancMcpServer(auth);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err: any) {
    console.error('[MCP] request failed:', err?.message || err);
    if (!res.headersSent) rpcError(res, 500, -32603, 'Internal server error.');
  }
}
