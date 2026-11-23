import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';
import { RichText } from './RichText';

type Focus = 'general' | 'investments' | 'spending';

interface Props {
  onOpenSettings: () => void;
  onOpenConnect?: () => void;
  providerLabel?: string;
  modelName?: string;
}

interface Msg { id: string; role: 'user' | 'assistant'; content: string }
interface SessionRow { id: string; title: string; focus: Focus; updated_at: string; message_count: number }

const FOCUSES: { id: Focus; label: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[] = [
  { id: 'investments', label: 'Investments', icon: 'show-chart' },
  { id: 'spending', label: 'Spending', icon: 'receipt-long' },
  { id: 'general', label: 'Everything', icon: 'dashboard' },
];

const STARTERS: Record<Focus, string[]> = {
  investments: [
    'Which of my holdings should I consider reducing?',
    'What should I add to balance my portfolio?',
    'Are any lots close to turning long-term for tax?',
  ],
  spending: ['Where am I spending the most?', 'How much can I safely invest this month?', 'Which recurring payments could I trim?'],
  general: ['How healthy are my finances right now?', 'Is my emergency fund enough?', 'How can I save more each month?'],
};

export const AIChatPanel: React.FC<Props> = ({ onOpenSettings, onOpenConnect, providerLabel, modelName }) => {
  const [mode, setMode] = useState<'chat' | 'history'>('chat');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [title, setTitle] = useState('New chat');
  const [focus, setFocus] = useState<Focus>('investments');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [input, setInput] = useState('');
  const [loadingSession, setLoadingSession] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configIssue, setConfigIssue] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToEnd = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);

  const loadSessions = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/ai-advisor/chat/sessions');
      setSessions(res?.data || []);
    } catch { /* history is a convenience */ }
  }, []);
  useEffect(() => { loadSessions(); }, [loadSessions]);

  const openSession = async (id: string) => {
    setError(null);
    setLoadingSession(true);
    try {
      const res = await apiClient.get(`/api/ai-advisor/chat/sessions/${id}`);
      setSessionId(res.data.id);
      setTitle(res.data.title);
      setFocus(res.data.focus || 'general');
      setMessages(res.data.messages || []);
      setMode('chat');
      scrollToEnd();
    } catch (e: any) {
      Alert.alert('Could not open chat', e?.message || 'Please try again.');
    } finally {
      setLoadingSession(false);
    }
  };

  // A new session simply means "clear the screen"; the server snapshots your latest finances on the first message.
  const newChat = () => {
    setSessionId(null);
    setTitle('New chat');
    setMessages([]);
    setInput('');
    setError(null);
    setConfigIssue(false);
    setMode('chat');
  };

  const failWith = (e: any) => {
    const msg: string = e?.message || 'Could not get a reply.';
    setError(msg);
    setConfigIssue(/api key|not configured|rejected|unauthor|invalid/i.test(msg));
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    setError(null);
    setConfigIssue(false);
    setInput('');
    setSending(true);
    const temp: Msg = { id: `tmp-${Date.now()}`, role: 'user', content };
    setMessages((m) => [...m, temp]);
    scrollToEnd();
    try {
      const res = await apiClient.post('/api/ai-advisor/chat/message', { content, sessionId: sessionId || undefined, focus });
      setSessionId(res.data.sessionId);
      setTitle(res.data.title);
      setMessages((m) => [...m, res.data.message]);
      loadSessions();
      scrollToEnd();
    } catch (e: any) {
      setMessages((m) => m.filter((x) => x.id !== temp.id)); // roll back so the text can be retried
      setInput(content);
      failWith(e);
    } finally {
      setSending(false);
    }
  };

  const regenerate = async () => {
    if (!sessionId || sending) return;
    setError(null);
    setSending(true);
    try {
      const res = await apiClient.post(`/api/ai-advisor/chat/sessions/${sessionId}/regenerate`, {});
      setMessages((m) => [...m.slice(0, -1), res.data.message]);
      scrollToEnd();
    } catch (e: any) {
      failWith(e);
    } finally {
      setSending(false);
    }
  };

  const copy = async (m: Msg) => {
    await Clipboard.setStringAsync(m.content);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const confirmDelete = (s: SessionRow) => {
    Alert.alert('Delete this chat?', s.title, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await apiClient.delete(`/api/ai-advisor/chat/sessions/${s.id}`);
            setSessions((list) => list.filter((x) => x.id !== s.id));
            if (s.id === sessionId) newChat();
          } catch (e: any) {
            Alert.alert('Could not delete', e?.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;

  // ── History ──────────────────────────────────────────────────────────────────
  if (mode === 'history') {
    return (
      <View style={styles.flex}>
        <View style={styles.bar}>
          <Pressable onPress={() => setMode('chat')} hitSlop={8} style={styles.barBtn}>
            <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
            <Text style={styles.barBtnText}>Back to chat</Text>
          </Pressable>
          <Pressable style={styles.newBtn} onPress={newChat}>
            <MaterialIcons name="add" size={18} color={colors.onPrimary} />
            <Text style={styles.newBtnText}>New chat</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
          {loadingSession && <ActivityIndicator color={colors.primary} />}
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
        <Pressable style={styles.newBtn} onPress={newChat}>
          <MaterialIcons name="add" size={18} color={colors.onPrimary} />
          <Text style={styles.newBtnText}>New chat</Text>
        </Pressable>
      </View>

      {!!modelName && (
        <Pressable style={styles.modelChip} onPress={onOpenSettings}>
          <MaterialIcons name="memory" size={14} color={colors.primaryContainer} />
          <Text style={styles.modelChipText} numberOfLines={1}>Chatting with {providerLabel} · {modelName}</Text>
          <Text style={styles.modelChipLink}>Change</Text>
        </Pressable>
      )}

      {!sessionId && (
        <View style={styles.focusRow}>
          {FOCUSES.map((f) => (
            <Pressable key={f.id} style={[styles.focusChip, focus === f.id && styles.focusChipOn]} onPress={() => setFocus(f.id)}>
              <MaterialIcons name={f.icon} size={15} color={focus === f.id ? colors.onPrimary : colors.onSurfaceVariant} />
              <Text style={[styles.focusText, focus === f.id && { color: colors.onPrimary }]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {sessionId && <Text style={styles.chatTitle} numberOfLines={1}>{title}</Text>}

      <ScrollView ref={scrollRef} contentContainerStyle={styles.msgList} keyboardShouldPersistTaps="handled">
        {messages.length === 0 && (
          <View style={{ gap: 10 }}>
            <View style={styles.introIcon}><MaterialIcons name="forum" size={28} color={colors.primaryFixed} /></View>
            <Text style={styles.introTitle}>Ask about your money</Text>
            <Text style={styles.introDesc}>
              Type your own question below, or tap one. Each new chat starts from your latest accounts and holdings.
            </Text>
            {STARTERS[focus].map((q) => (
              <Pressable key={q} style={styles.suggestion} onPress={() => send(q)}>
                <Text style={styles.suggestionText}>{q}</Text>
                <MaterialIcons name="arrow-forward" size={16} color={colors.primaryContainer} />
              </Pressable>
            ))}
            {!!onOpenConnect && (
              <Pressable style={styles.connectCard} onPress={onOpenConnect}>
                <MaterialIcons name="hub" size={20} color={colors.primaryContainer} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.connectTitle}>Use Claude or ChatGPT instead</Text>
                  <Text style={styles.connectDesc}>Let your own AI assistant read your portfolio and research prices.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
              </Pressable>
            )}
          </View>
        )}

        {messages.map((m) => (
          <View key={m.id} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            {m.role === 'user'
              ? <Text style={[styles.userText]}>{m.content}</Text>
              : <RichText text={m.content} />}
            {m.role === 'assistant' && (
              <View style={styles.bubbleActions}>
                <Pressable onPress={() => copy(m)} hitSlop={8} style={styles.actionBtn}>
                  <MaterialIcons name={copiedId === m.id ? 'check' : 'content-copy'} size={14} color={colors.outline} />
                  <Text style={styles.actionText}>{copiedId === m.id ? 'Copied' : 'Copy'}</Text>
                </Pressable>
                {m.id === lastAssistantId && (
                  <Pressable onPress={regenerate} disabled={sending} hitSlop={8} style={styles.actionBtn}>
                    <MaterialIcons name="refresh" size={14} color={colors.outline} />
                    <Text style={styles.actionText}>Try again</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        ))}

        {sending && (
          <View style={[styles.bubble, styles.aiBubble, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.thinking}>Thinking…</Text>
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

      {/* Always visible: type your own question at any time */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask anything about your money"
          placeholderTextColor={colors.outline}
          multiline
          maxLength={2000}
          editable={!sending}
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
  focusRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 4 },
  focusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surfaceContainer },
  focusChipOn: { backgroundColor: colors.primaryContainer },
  focusText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.onSurfaceVariant },
  empty: { fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 30 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: 'rgba(193,200,194,0.4)' },
  sessionActive: { borderColor: colors.primaryContainer },
  sessionTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.onSurface },
  sessionSub: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  introIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  introTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: colors.onSurface, textAlign: 'center' },
  introDesc: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 19 },
  suggestion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, backgroundColor: colors.surfaceContainer },
  suggestionText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.onSurface },
  connectCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.outlineVariant, borderStyle: 'dashed', marginTop: 4 },
  connectTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.onSurface },
  connectDesc: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  chatTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: colors.onSurfaceVariant, paddingHorizontal: 20, paddingBottom: 4 },
  msgList: { padding: 20, gap: 10 },
  bubble: { maxWidth: '90%', padding: 12, borderRadius: 18 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primaryContainer, borderBottomRightRadius: 6 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: colors.surfaceContainer, borderBottomLeftRadius: 6 },
  userText: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 21, color: colors.onPrimary },
  thinking: { fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.onSurfaceVariant },
  bubbleActions: { flexDirection: 'row', gap: 16, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(193,200,194,0.5)' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.outline },
  errorBox: { padding: 12, borderRadius: 14, backgroundColor: colors.errorContainer, gap: 6 },
  errorBoxText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onErrorContainer },
  errorLink: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.onErrorContainer, textDecorationLine: 'underline' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 8 },
  input: { flex: 1, maxHeight: 110, minHeight: 46, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, borderRadius: 23, backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant, fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.onSurface },
  sendBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryContainer },
  footnote: { fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.outline, textAlign: 'center', paddingVertical: 6 },
});
