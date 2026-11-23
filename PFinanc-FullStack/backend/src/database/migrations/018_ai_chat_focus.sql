-- Migration: 018_ai_chat_focus.sql
-- Chat sessions get a focus (what the conversation is mainly about), which tunes the assistant's context and style.
ALTER TABLE ai_chat_sessions ADD COLUMN IF NOT EXISTS focus VARCHAR(20) NOT NULL DEFAULT 'general';
