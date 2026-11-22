import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';

interface Props {
  onOpenSettings: () => void;
  providerLabel?: string;
  modelName?: string;
}

interface Msg { id: string; role: 'user' | 'assistant'; content: string; created_at?: string }
interface SessionRow { id: string; title: string; updated_at: string; message_count: number }

const SUGGESTIONS = [
  'Where am I spending the most?',
  'Is my emergency fund enough?',
  'How can I save more each month?',
  'Can I start a ₹5,000 monthly SIP?',
];

export const AIChatPanel: React.FC<Props> = ({ onOpenSettings, providerLabel, modelName }) => {
  const [mode, setMode] = useState<'chat' | 'history'>('chat');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [title, setTitle] = useState('New chat');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [input, setInput] = useState('');
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configIssue, setConfigIssue] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToEnd = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

  const loadSessions = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/ai-advisor/chat/sessions');
      setSessions(res?.data || []);
    } catch { /* history is a convenience; ignore */ }
  }, []);

  const openSession = async (id: string) => {
    setError(null);
    setStarting(true);
    try {
      const res = await apiClient.get(`/api/ai-advisor/chat/sessions/${id}`);
      setSessionId(res.data.id);
      setTitle(res.data.title);
      setMessages(res.data.messages || []);
      setMode('chat');
      scrollToEnd();
    } catch (e: any) {
      Alert.alert('Could not open chat', e?.message || 'Please try again.');
    } finally {
      setStarting(false);
    }
  };

  // Start a brand-new session (takes a fresh snapshot of your finances on the server)
  const startNewSession = async (firstMessage?: string) => {
    setError(null);
    setConfigIssue(false);
    setStarting(true);
    try {
      const res = await apiClient.post('/api/ai-advisor/chat/sessions', {});
      setSessionId(res.data.id);
      setTitle('New chat');
      setMessages([]);
      setInput('');
      setMode('chat');
      loadSessions();
      if (firstMessage) await send(firstMessage, res.data.id);
    } catch (e: any) {
      setError(e?.message || 'Could not start a new chat.');
    } finally {
      setStarting(false);
    }
  };

  const send = async (text: string, forSession?: string) => {
    const id = forSession || sessionId;
    const content = text.trim();
    if (!id || !content || sending) return;
    setError(null);
    setConfigIssue(false);
    setInput('');
    setSending(true);
    const temp: Msg = { id: `tmp-${Date.now()}`, role: 'user', content };
    setMessages((m) => [...m, temp]);
    scrollToEnd();
    try {
      const res = await apiClient.post(`/api/ai-advisor/chat/sessions/${id}/messages`, { content });
      setMessages((m) => [...m, res.data.message]);
      setTitle(res.data.title);
      loadSessions();
      scrollToEnd();
    } catch (e: any) {
      // Roll back the optimistic message so the user can retry
      setMessages((m) => m.filter((x) => x.id !== temp.id));
      setInput(content);
      const msg: string = e?.message || 'Could not get a reply.';
      setError(msg);
      setConfigIssue(/api key|not configured|auth|invalid|unauthor/i.test(msg));
    } finally {
      setSending(false);
    }
  };

  const confirmDelete = (s: SessionRow) => {
    Alert.alert('Delete this chat?', s.title, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await apiClient.delete(`/api/ai-advisor/chat/sessions/${s.id}`);
            setSessions((list) => list.filter((x) => x.id !== s.id));
            if (s.id === sessionId) { setSessionId(null); setMessages([]); setTitle('New chat'); }
          } catch (e: any) {
            Alert.alert('Could not delete', e?.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // ── History list ─────────────────────────────────────────────────────────────
  if (mode === 'history') {
    return (
      <View style={styles.flex}>
        <View style={styles.bar}>
          <Pressable onPress={() => setMode('chat')} hitSlop={8} style={styles.barBtn}>
            <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
            <Text style={styles.barBtnText}>Back to chat</Text>
          </Pressable>
          <Pressable style={styles.newBtn} onPress={() => startNewSession()} disabled={starting}>
            <MaterialIcons name="add" size={18} color={colors.onPrimary} />
            <Text style={styles.newBtnText}>New chat</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
          {sessions.length === 0 ? (
            <Text style={styles.empty}>No past chats yet.</Text>
          ) : sessions.map((s) => (
            <Pressable key={s.id} style={[styles.sessionRow, s.id === sessionId && styles.sessionActive]} onPress={() => openSession(s.id)}>
              <MaterialIcons name="chat-bubble-outline" size={20} color={colors.primaryContainer} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionTitle} numberOfLines={1}>{s.title}</Text>
                <Text style={styles.sessionSub}>
                  {s.message_count} message{s.message_count === 1 ? '' : 's'} · {new Date(s.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <Pressable onPress={() => confirmDelete(s)} hitSlop={10} accessibilityLabel="Delete chat">
                <MaterialIcons name="delete-outline" size={22} color={colors.outline} />
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ── Chat ─────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <View style={styles.bar}>
        <Pressable onPress={() => { loadSessions(); setMode('history'); }} hitSlop={8} style={styles.barBtn}>
          <MaterialIcons name="history" size={20} color={colors.primary} />
          <Text style={styles.barBtnText}>Past chats</Text>
        </Pressable>
        <Pressable style={styles.newBtn} onPress={() => startNewSession()} disabled={starting}>
          {starting ? <ActivityIndicator size="small" color={colors.onPrimary} /> : (
            <>
              <MaterialIcons name="add" size={18} color={colors.onPrimary} />
              <Text style={styles.newBtnText}>New chat</Text>
            </>
          )}
        </Pressable>
      </View>

      {!!modelName && (
        <Pressable style={styles.modelChip} onPress={onOpenSettings}>
          <MaterialIcons name="memory" size={14} color={colors.primaryContainer} />
          <Text style={styles.modelChipText} numberOfLines={1}>Chatting with {providerLabel} · {modelName}</Text>
          <Text style={styles.modelChipLink}>Change</Text>
        </Pressable>
      )}

      {!sessionId ? (
        <ScrollView contentContainerStyle={styles.intro}>
          <View style={styles.introIcon}><MaterialIcons name="forum" size={30} color={colors.primaryFixed} /></View>
          <Text style={styles.introTitle}>Ask about your money</Text>
          <Text style={styles.introDesc}>
            Each chat starts with a fresh look at your latest accounts, spending and investments. Pick a question or type your own.
          </Text>
          {SUGGESTIONS.map((q) => (
            <Pressable key={q} style={styles.suggestion} disabled={starting} onPress={() => startNewSession(q)}>
              <Text style={styles.suggestionText}>{q}</Text>
              <MaterialIcons name="arrow-forward" size={16} color={colors.primaryContainer} />
            </Pressable>
          ))}
          <Pressable style={styles.startBtn} disabled={starting} onPress={() => startNewSession()}>
            {starting ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.startBtnText}>Start a new chat</Text>}
          </Pressable>
          {starting && <Text style={styles.introDesc}>Getting your latest numbers ready…</Text>}
          {error && <Text style={styles.errorInline}>{error}</Text>}
        </ScrollView>
      ) : (
        <>
          <Text style={styles.chatTitle} numberOfLines={1}>{title}</Text>
          <ScrollView ref={scrollRef} contentContainerStyle={styles.msgList} keyboardShouldPersistTaps="handled">
            {messages.length === 0 && (
              <View style={{ gap: 8 }}>
                <Text style={styles.introDesc}>Your finances are loaded. What would you like to know?</Text>
                {SUGGESTIONS.map((q) => (
                  <Pressable key={q} style={styles.suggestion} onPress={() => send(q)}>
                    <Text style={styles.suggestionText}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {messages.map((m) => (
              <View key={m.id} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.bubbleText, m.role === 'user' && { color: colors.onPrimary }]}>{m.content}</Text>
              </View>
            ))}
            {sending && (
              <View style={[styles.bubble, styles.aiBubble, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.bubbleText}>Thinking…</Text>
              </View>
            )}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{error}</Text>
                {configIssue && (
                  <Pressable onPress={onOpenSettings}><Text style={styles.errorLink}>Check AI settings</Text></Pressable>
                )}
              </View>
            )}
          </ScrollView>
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask anything about your money"
              placeholderTextColor={colors.outline}
              multiline
              maxLength={2000}
            />
            <Pressable
              style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}
              disabled={!input.trim() || sending}
              onPress={() => send(input)}
              accessibilityLabel="Send"
            >
              <MaterialIcons name="send" size={20} color={colors.onPrimary} />
            </Pressable>
          </View>
          <Text style={styles.footnote}>AI guidance, not professional financial advice.</Text>
        </>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
  barBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.primary },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, height: 38, borderRadius: 19, backgroundColor: colors.primaryContainer, minWidth: 96, justifyContent: 'center' },
  newBtnText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.onPrimary },
  modelChip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 20, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.surfaceContainerLow },
  modelChipText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceVariant },
  modelChipLink: { fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.primaryContainer },
  empty: { fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 30 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: 'rgba(193,200,194,0.4)' },
  sessionActive: { borderColor: colors.primaryContainer },
  sessionTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.onSurface },
  sessionSub: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  intro: { padding: 20, gap: 10, alignItems: 'stretch' },
  introIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  introTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: colors.onSurface, textAlign: 'center' },
  introDesc: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 19 },
  suggestion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, backgroundColor: colors.surfaceContainer },
  suggestionText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.onSurface },
  startBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryContainer, marginTop: 6 },
  startBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.onPrimary },
  errorInline: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.error, textAlign: 'center' },
  chatTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: colors.onSurfaceVariant, paddingHorizontal: 20, paddingBottom: 4 },
  msgList: { padding: 20, gap: 10 },
  bubble: { maxWidth: '86%', padding: 12, borderRadius: 18 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primaryContainer, borderBottomRightRadius: 6 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: colors.surfaceContainer, borderBottomLeftRadius: 6 },
  bubbleText: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20, color: colors.onSurface },
  errorBox: { padding: 12, borderRadius: 14, backgroundColor: colors.errorContainer, gap: 6 },
  errorBoxText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onErrorContainer },
  errorLink: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.onErrorContainer, textDecorationLine: 'underline' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 8 },
  input: { flex: 1, maxHeight: 110, minHeight: 46, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, borderRadius: 23, backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant, fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.onSurface },
  sendBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryContainer },
  footnote: { fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.outline, textAlign: 'center', paddingVertical: 6 },
});
