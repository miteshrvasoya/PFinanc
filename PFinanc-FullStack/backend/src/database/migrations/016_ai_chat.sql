-- Migration: 016_ai_chat.sql
-- Chat sessions with the AI advisor. Each session freezes a privacy-safe snapshot of the user's finances
-- when it is created, so a conversation is consistent; starting a new session takes a fresh snapshot.

CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL DEFAULT 'New chat',
    context       JSONB,
    ai_provider   VARCHAR(50),
    model_name    VARCHAR(150),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user
    ON ai_chat_sessions (user_id, household_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content       TEXT NOT NULL,
    tokens_total  INTEGER,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session
    ON ai_chat_messages (session_id, created_at);
