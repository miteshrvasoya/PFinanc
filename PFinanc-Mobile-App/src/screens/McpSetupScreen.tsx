import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';

interface Setup {
  suggestedBaseUrl: string;
  warnings: string[];
  scopes: { id: string; description: string }[];
  tools: { name: string; description: string; scope: string }[];
  prompts: { name: string; title: string }[];
}
interface Connection {
  id: string; name: string; tokenHint: string; scopes: string[]; status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  lastUsedAt: string | null; useCount: number; expiresAt: string | null;
}
interface ActivityRow { id: string; tool: string; status: string; connection_name: string; created_at: string }

type Assistant = 'claude' | 'chatgpt' | 'other';
const URL_KEY = 'mcp_public_url';

const PROMPTS = [
  'Review my PFinanc portfolio. Which holdings should I consider selling or trimming, and what should I consider buying instead? Check current prices and recent news, and explain your reasoning.',
  'Check live prices for my holdings and tell me what moved the most.',
  'Do I have too much in one stock? Suggest a more balanced allocation for a long-term investor.',
  'I can invest ₹25,000 this month. How should I split it based on my portfolio and cash flow?',
];

const CopyBox: React.FC<{ value: string; label?: string; mono?: boolean; secret?: boolean }> = ({ value, label, mono = true, secret }) => {
  const [done, setDone] = useState(false);
  const copy = async () => {
    await Clipboard.setStringAsync(value);
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };
  return (
    <View style={{ gap: 4 }}>
      {!!label && <Text style={styles.boxLabel}>{label}</Text>}
      <View style={styles.box}>
        <Text style={[styles.boxText, mono && styles.mono, secret && { color: '#92400e' }]} selectable>{value}</Text>
        <Pressable onPress={copy} style={styles.copyBtn} hitSlop={6}>
          <MaterialIcons name={done ? 'check' : 'content-copy'} size={16} color={colors.primary} />
          <Text style={styles.copyText}>{done ? 'Copied' : 'Copy'}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const Step: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <View style={styles.card}>
    <View style={styles.stepHead}>
      <View style={styles.stepNum}><Text style={styles.stepNumText}>{n}</Text></View>
      <Text style={styles.stepTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

export const McpSetupScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [baseUrl, setBaseUrl] = useState('');
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['investments']);
  const [expires, setExpires] = useState<number | null>(90);
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Assistant>('claude');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, c, a, saved] = await Promise.all([
        apiClient.get('/api/mcp/setup'),
        apiClient.get('/api/mcp/connections'),
        apiClient.get('/api/mcp/activity?limit=20'),
        AsyncStorage.getItem(URL_KEY).catch(() => null),
      ]);
      setSetup(s.data);
      setConnections(c.data || []);
      setActivity(a.data || []);
      setBaseUrl((cur) => cur || saved || s.data.suggestedBaseUrl);
    } catch (e: any) {
      setError(e?.message || 'Could not load the connection settings.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const cleanBase = baseUrl.trim().replace(/\/+$/, '');
  const mcpUrl = `${cleanBase}/mcp`;
  const tokenForDocs = newToken || '<YOUR_TOKEN>';
  const urlWithToken = `${cleanBase}/mcp/t/${tokenForDocs}`;
  const isLocal = useMemo(() => /^https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(cleanBase), [cleanBase]);

  const setUrl = (v: string) => {
    setBaseUrl(v);
    AsyncStorage.setItem(URL_KEY, v).catch(() => {});
  };
  const toggleScope = (id: string) => setScopes((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const create = async () => {
    setError(null);
    setCreating(true);
    try {
      const res = await apiClient.post('/api/mcp/connections', { name, scopes: scopes.length ? scopes : ['investments'], expiresInDays: expires });
      setNewToken(res.data.token);
      setName('');
      load();
    } catch (e: any) {
      setError(e?.message || 'Could not create the connection.');
    } finally {
      setCreating(false);
    }
  };

  const revoke = (c: Connection) => {
    Alert.alert(`Revoke "${c.name}"?`, 'Any assistant using it loses access immediately.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Revoke', style: 'destructive', onPress: async () => {
          try { await apiClient.delete(`/api/mcp/connections/${c.id}`); load(); }
          catch (e: any) { Alert.alert('Could not revoke', e?.message || 'Please try again.'); }
        },
      },
    ]);
  };

  const desktopJson = JSON.stringify({
    mcpServers: { pfinanc: { command: 'npx', args: ['-y', 'mcp-remote', mcpUrl, '--header', 'Authorization:${PFINANC_AUTH}'], env: { PFINANC_AUTH: `Bearer ${tokenForDocs}` } } },
  }, null, 2);
  const curlTest = `curl -s ${mcpUrl} \\\n  -H "Authorization: Bearer ${tokenForDocs}" \\\n  -H "Content-Type: application/json" \\\n  -H "Accept: application/json, text/event-stream" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.headerBtn} hitSlop={8}><MaterialIcons name="arrow-back" size={22} color={colors.primary} /></Pressable>
        <Text style={styles.headerTitle}>Connect your AI</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <MaterialIcons name="hub" size={26} color={colors.primaryFixed} />
            <Text style={styles.heroTitle}>Let Claude or ChatGPT read your portfolio</Text>
            <Text style={styles.heroText}>
              PFinanc includes an MCP server. Your assistant can read your holdings, fetch live prices, research your stocks and suggest what to hold, sell or buy. It is read-only and can never change your data. The address is your own server.
            </Text>
          </View>

          {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
          {setup?.warnings?.map((w, i) => (
            <View key={i} style={styles.warnBox}><MaterialIcons name="warning-amber" size={18} color="#92400e" /><Text style={styles.warnText}>{w}</Text></View>
          ))}

          <Step n={1} title="Your server address">
            <Text style={styles.help}>The public HTTPS address of your PFinanc backend. Set PUBLIC_BASE_URL on the server to pre-fill this.</Text>
            <TextInput style={styles.input} value={baseUrl} onChangeText={setUrl} placeholder="https://finance.example.com" placeholderTextColor={colors.outline} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
            <CopyBox label="Your MCP endpoint" value={mcpUrl} />
            {isLocal && <Text style={styles.warnInline}>This is a local address. Claude.ai and ChatGPT connect from the internet, so use a public HTTPS URL or a tunnel (Cloudflare Tunnel, ngrok).</Text>}
          </Step>

          <Step n={2} title="Create a connection">
            {newToken && (
              <View style={styles.tokenBox}>
                <Text style={styles.tokenWarn}>Copy your access token now. It is shown only once.</Text>
                <CopyBox value={newToken} secret />
                <Pressable onPress={() => setNewToken(null)}><Text style={styles.linkText}>I have saved it</Text></Pressable>
              </View>
            )}
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder='Name, e.g. "Claude" or "ChatGPT"' placeholderTextColor={colors.outline} maxLength={100} />
            <View style={styles.chipWrap}>
              {([[30, '30 days'], [90, '90 days'], [365, '1 year'], [null, 'Never']] as [number | null, string][]).map(([d, label]) => (
                <Pressable key={label} style={[styles.chip, expires === d && styles.chipOn]} onPress={() => setExpires(d)}>
                  <Text style={[styles.chipText, expires === d && styles.chipTextOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            {(setup?.scopes || []).map((s) => {
              const on = scopes.includes(s.id);
              return (
                <Pressable key={s.id} style={styles.scopeRow} onPress={() => s.id !== 'investments' && toggleScope(s.id)}>
                  <MaterialIcons name={on ? 'check-box' : 'check-box-outline-blank'} size={22} color={on ? colors.primaryContainer : colors.outline} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scopeTitle}>{s.id}</Text>
                    <Text style={styles.help}>{s.description}</Text>
                  </View>
                </Pressable>
              );
            })}
            <Pressable style={[styles.primaryBtn, (!name.trim() || creating) && { opacity: 0.5 }]} disabled={!name.trim() || creating} onPress={create}>
              {creating ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryBtnText}>Create connection</Text>}
            </Pressable>

            {connections.map((c) => (
              <View key={c.id} style={styles.connRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.connName}>{c.name} <Text style={styles.mono}>{c.tokenHint}</Text></Text>
                  <Text style={styles.help}>
                    {c.scopes.join(', ')} · {c.useCount} calls · {c.lastUsedAt ? `used ${new Date(c.lastUsedAt).toLocaleDateString('en-IN')}` : 'never used'}
                  </Text>
                </View>
                <View style={[styles.statusPill, c.status !== 'ACTIVE' && { backgroundColor: colors.surfaceContainerHigh }]}>
                  <Text style={[styles.statusText, c.status !== 'ACTIVE' && { color: colors.onSurfaceVariant }]}>{c.status}</Text>
                </View>
                {c.status === 'ACTIVE' && (
                  <Pressable onPress={() => revoke(c)} hitSlop={8}><MaterialIcons name="delete-outline" size={22} color={colors.outline} /></Pressable>
                )}
              </View>
            ))}
          </Step>

          <Step n={3} title="Connect your assistant">
            <View style={styles.tabs}>
              {([['claude', 'Claude'], ['chatgpt', 'ChatGPT'], ['other', 'Other']] as const).map(([id, label]) => (
                <Pressable key={id} style={[styles.tab, platform === id && styles.tabOn]} onPress={() => setPlatform(id)}>
                  <Text style={[styles.tabText, platform === id && { color: colors.onPrimary }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            {!newToken && <Text style={styles.warnInline}>Create a connection above and these snippets fill in your token.</Text>}

            {platform === 'claude' && (
              <View style={{ gap: 12 }}>
                <Text style={styles.sub}>Claude on web or desktop (custom connector)</Text>
                <Text style={styles.help}>1. Open Claude, then Settings, Connectors, Add custom connector (needs a plan that supports it).{'\n'}2. Name it PFinanc and paste this URL. The token is inside it, so keep it private.{'\n'}3. In a chat, enable PFinanc and ask a question.</Text>
                <CopyBox value={urlWithToken} secret={!!newToken} />
                <Text style={styles.sub}>Claude Code (terminal)</Text>
                <CopyBox value={`claude mcp add --transport http pfinanc ${mcpUrl} --header "Authorization: Bearer ${tokenForDocs}"`} />
                <Text style={styles.sub}>Claude Desktop config (also works with a local server)</Text>
                <Text style={styles.help}>Add to claude_desktop_config.json. Needs Node.js; uses the mcp-remote bridge.</Text>
                <CopyBox value={desktopJson} />
              </View>
            )}
            {platform === 'chatgpt' && (
              <View style={{ gap: 12 }}>
                <Text style={styles.help}>1. In ChatGPT open Settings, Connectors, Advanced and turn on Developer mode (depends on plan and region).{'\n'}2. Create a connector named PFinanc and paste the URL below as the MCP server URL.{'\n'}3. Choose "No authentication". The token inside the URL protects it.{'\n'}4. In a new chat, add the PFinanc connector and ask your question.</Text>
                <CopyBox value={urlWithToken} secret={!!newToken} />
                <Text style={styles.help}>ChatGPT calls your server from the internet, so the address must be public HTTPS.</Text>
              </View>
            )}
            {platform === 'other' && (
              <View style={{ gap: 12 }}>
                <Text style={styles.help}>Any assistant that supports MCP over Streamable HTTP works. Use the endpoint with a Bearer header, or the URL that already contains the token.</Text>
                <CopyBox label="Endpoint" value={mcpUrl} />
                <CopyBox label="Header" value={`Authorization: Bearer ${tokenForDocs}`} secret={!!newToken} />
                <CopyBox label="Test from a terminal (should list the tools)" value={curlTest} />
                <Pressable onPress={() => Linking.openURL('https://modelcontextprotocol.io')}><Text style={styles.linkText}>About MCP</Text></Pressable>
              </View>
            )}
          </Step>

          <Step n={4} title="Ask for the analysis">
            <Text style={styles.help}>Copy one of these into your assistant. It will call the PFinanc tools, then add its own research.</Text>
            {PROMPTS.map((p) => <CopyBox key={p} value={p} mono={false} />)}
          </Step>

          <View style={styles.card}>
            <Text style={styles.stepTitle}>What an assistant can read</Text>
            {(setup?.tools || []).map((t) => (
              <Text key={t.name} style={styles.help}><Text style={styles.toolName}>{t.name}</Text>  {t.description}</Text>
            ))}
            <Text style={styles.help}>Never shared: passwords, account numbers, raw SMS, merchant names. Nothing can be changed or traded.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.stepTitle}>Recent access</Text>
            {activity.length === 0 ? <Text style={styles.help}>No assistant has used a connection yet.</Text> : activity.map((a) => (
              <View key={a.id} style={styles.actRow}>
                <Text style={styles.actTool} numberOfLines={1}>{a.tool} · {a.connection_name}</Text>
                <Text style={[styles.help, a.status !== 'OK' && { color: '#92400e' }]}>
                  {a.status !== 'OK' ? `${a.status} · ` : ''}{new Date(a.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.disclaimer}>An AI assistant's analysis is not financial advice. Treat tokens like passwords.</Text>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainerLow },
  headerTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: colors.primary },
  pad: { paddingHorizontal: 20, gap: 14 },
  hero: { backgroundColor: colors.primaryContainer, borderRadius: 22, padding: 20, gap: 8 },
  heroTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 19, color: colors.onPrimary },
  heroText: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, color: colors.onPrimaryContainer },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: 'rgba(193,200,194,0.4)' },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.onPrimary },
  stepTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: colors.onSurface },
  sub: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.onSurface },
  help: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18, color: colors.onSurfaceVariant },
  input: { height: 50, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant, fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.onSurface },
  boxLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.onSurfaceVariant },
  box: { backgroundColor: colors.surfaceContainerLow, borderRadius: 12, padding: 10, gap: 8, borderWidth: 1, borderColor: colors.outlineVariant },
  boxText: { fontSize: 12, lineHeight: 18, color: colors.onSurface },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.surfaceContainer },
  copyText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.primary },
  tokenBox: { gap: 8, padding: 12, borderRadius: 14, backgroundColor: colors.primaryFixed },
  tokenWarn: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.onPrimaryFixed },
  linkText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.primaryContainer },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surfaceContainer },
  chipOn: { backgroundColor: colors.primaryContainer },
  chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.onSurface },
  chipTextOn: { color: colors.onPrimary },
  scopeRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  scopeTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.onSurface },
  primaryBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryContainer },
  primaryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.onPrimary },
  connRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.surfaceContainerLow },
  connName: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.onSurface },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.primaryFixed },
  statusText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: colors.onPrimaryFixed },
  tabs: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: 14, backgroundColor: colors.surfaceContainer },
  tab: { flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.primaryContainer },
  tabText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.onSurfaceVariant },
  warnBox: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 14, backgroundColor: colors.secondaryContainer },
  warnText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18, color: colors.onSecondaryContainer },
  warnInline: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#92400e' },
  errorBox: { padding: 12, borderRadius: 14, backgroundColor: colors.errorContainer },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onErrorContainer },
  toolName: { fontFamily: 'Inter_700Bold', color: colors.primaryContainer },
  actRow: { gap: 2 },
  actTool: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.onSurface },
  disclaimer: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.outline, textAlign: 'center' },
});
