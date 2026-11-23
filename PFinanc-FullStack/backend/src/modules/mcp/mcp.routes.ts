import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';
import { getHouseholdId } from '../../utils/request.js';
import { config } from '../../config/env.js';
import { MCP_PROMPT_CATALOG, MCP_SCOPE_INFO, MCP_TOOL_CATALOG } from './mcpCatalog.js';
import { McpTokensService } from './mcpTokens.service.js';

/** Management API used by the web and mobile "Connect AI (MCP)" screens. Requires a normal PFinanc login. */
export const mcpManagementRouter = Router();
mcpManagementRouter.use(authenticate, requireHouseholdAccess());

const fail = (res: Response, err: any) =>
  res.status(err?.status || 500).json({ success: false, error: { code: err?.code || 'MCP_ERROR', message: err?.message || 'Something went wrong' } });

/** The public address assistants should call. Deployers set PUBLIC_BASE_URL; otherwise it is inferred from the request. */
function resolveBaseUrl(req: Request) {
  if (config.publicBaseUrl) return { baseUrl: config.publicBaseUrl.replace(/\/+$/, ''), source: 'PUBLIC_BASE_URL' as const };
  const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim() || req.protocol;
  const host = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim() || req.get('host') || 'localhost';
  return { baseUrl: `${proto}://${host}`, source: 'request' as const };
}

const isPrivateHost = (url: string) => /^https?:\/\/(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])/i.test(url);

mcpManagementRouter.get('/setup', (req, res) => {
  const { baseUrl, source } = resolveBaseUrl(req);
  const reachableFromInternet = !isPrivateHost(baseUrl) && baseUrl.startsWith('https://');
  res.json({
    success: true,
    data: {
      suggestedBaseUrl: baseUrl,
      suggestedBaseUrlSource: source,
      mcpPath: '/mcp',
      reachableFromInternet,
      warnings: [
        ...(isPrivateHost(baseUrl) ? ['This address is only reachable on your own network. Claude.ai and ChatGPT connect from the internet, so they need a public HTTPS URL (your domain, or a tunnel such as Cloudflare Tunnel or ngrok). Desktop and CLI assistants on this same network can still use it.'] : []),
        ...(!isPrivateHost(baseUrl) && !baseUrl.startsWith('https://') ? ['Use HTTPS so the access token is encrypted in transit.'] : []),
      ],
      scopes: Object.entries(MCP_SCOPE_INFO).map(([id, description]) => ({ id, description })),
      tools: MCP_TOOL_CATALOG,
      prompts: MCP_PROMPT_CATALOG,
    },
  });
});

mcpManagementRouter.get('/connections', async (req, res) => {
  try {
    res.json({ success: true, data: await McpTokensService.listTokens(req.user!.id, getHouseholdId(req)) });
  } catch (err) { fail(res, err); }
});

mcpManagementRouter.post('/connections', async (req, res) => {
  try {
    const { name, scopes, expiresInDays } = req.body || {};
    const data = await McpTokensService.createToken(req.user!.id, getHouseholdId(req), { name, scopes, expiresInDays: expiresInDays ?? null });
    res.status(201).json({ success: true, data });
  } catch (err) { fail(res, err); }
});

mcpManagementRouter.delete('/connections/:id', async (req, res) => {
  try {
    await McpTokensService.revokeToken(req.params.id as string, req.user!.id, getHouseholdId(req));
    res.json({ success: true });
  } catch (err) { fail(res, err); }
});

mcpManagementRouter.get('/activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    res.json({ success: true, data: await McpTokensService.listActivity(req.user!.id, getHouseholdId(req), limit) });
  } catch (err) { fail(res, err); }
});
