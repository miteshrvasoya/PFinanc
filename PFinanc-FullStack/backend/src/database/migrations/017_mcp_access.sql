-- Migration: 017_mcp_access.sql
-- Access tokens that let an external AI client (Claude, ChatGPT, any MCP-capable assistant) read a user's
-- investment data through the built-in MCP server. Only a SHA-256 hash of each token is stored; the
-- plaintext is shown once at creation. Tokens are read-only, scoped, revocable and optionally expiring.

CREATE TABLE IF NOT EXISTS mcp_access_tokens (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    token_hash    CHAR(64) NOT NULL UNIQUE,
    token_prefix  VARCHAR(20) NOT NULL,
    scopes        TEXT[] NOT NULL DEFAULT ARRAY['investments'],
    expires_at    TIMESTAMPTZ,
    revoked_at    TIMESTAMPTZ,
    last_used_at  TIMESTAMPTZ,
    use_count     INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_tokens_user ON mcp_access_tokens (user_id, household_id);

-- What external assistants actually asked for (tool names only, never the returned data), so the owner can audit access.
CREATE TABLE IF NOT EXISTS mcp_activity (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id     UUID NOT NULL REFERENCES mcp_access_tokens(id) ON DELETE CASCADE,
    tool         VARCHAR(100) NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'OK' CHECK (status IN ('OK', 'ERROR', 'DENIED')),
    duration_ms  INTEGER,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_activity_token ON mcp_activity (token_id, created_at DESC);
