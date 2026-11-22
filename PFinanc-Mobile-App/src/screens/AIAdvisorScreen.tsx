import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Switch,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';

type Provider = 'OPENROUTER' | 'OPENAI' | 'GEMINI' | 'ANTHROPIC';

interface Props {
  onBack?: () => void;
  onNavigate?: (screen: string, params?: { filter?: string }) => void;
}

interface Config {
  aiProvider: Provider;
  modelName: string;
  apiKeyOverride?: string; // masked by the server, e.g. "••••abcd"
  hasApiKey: boolean;
  isEnabled: boolean;
  monthlySipBudgetInr?: number;
  monthlyStockBudgetInr?: number;
}

const PROVIDERS: { key: Provider; label: string; hint: string; keyUrl: string }[] = [
  { key: 'ANTHROPIC', label: 'Claude', hint: 'Anthropic API key (starts with sk-ant-)', keyUrl: 'console.anthropic.com' },
  { key: 'OPENAI', label: 'ChatGPT', hint: 'OpenAI API key (starts with sk-)', keyUrl: 'platform.openai.com/api-keys' },
  { key: 'GEMINI', label: 'Gemini', hint: 'Google AI Studio API key', keyUrl: 'aistudio.google.com/apikey' },
  { key: 'OPENROUTER', label: 'OpenRouter', hint: 'One key for many models (starts with sk-or-)', keyUrl: 'openrouter.ai/keys' },
];

const ACTION_LABEL: Record<string, string> = {
  BUY: 'Buy', SELL: 'Sell', HOLD: 'Keep holding', SIP: 'Start a monthly SIP', REBALANCE: 'Rebalance', AVOID: 'Avoid',
  SAVE_MORE: 'Save more', REDUCE_SPENDING: 'Spend less', PAY_DOWN_DEBT: 'Pay off debt',
  BUILD_EMERGENCY_FUND: 'Build emergency fund', TAX_PLANNING: 'Plan your tax', REVIEW_DATA: 'Fix your data',
};
const PRIORITY_COLOR: Record<string, { bg: string; fg: string; label: string }> = {
  HIGH: { bg: colors.errorContainer, fg: colors.onErrorContainer, label: 'Do first' },
  MEDIUM: { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer, label: 'Soon' },
  LOW: { bg: colors.surfaceContainer, fg: colors.onSurfaceVariant, label: 'Later' },
};
const SEVERITY: Record<string, { icon: any; color: string }> = {
  positive: { icon: 'check-circle', color: colors.primaryContainer },
  info: { icon: 'info', color: colors.tertiaryContainer },
  warning: { icon: 'warning', color: '#b45309' },
  critical: { icon: 'error', color: colors.error },
};

const rupees = (v?: number) => `₹${Math.round(v || 0).toLocaleString('en-IN')}`;
const scoreLabel = (s: number) => (s >= 75 ? 'Healthy' : s >= 50 ? 'Needs some care' : 'Needs attention');
const scoreColor = (s: number) => (s >= 75 ? colors.primaryContainer : s >= 50 ? '#b45309' : colors.error);

export const AIAdvisorScreen: React.FC<Props> = ({ onBack, onNavigate }) => {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<'report' | 'settings'>('report');
  const [config, setConfig] = useState<Config | null>(null);
  const [models, setModels] = useState<Record<string, { id: string; name: string }[]>>({});
  const [report, setReport] = useState<any>(null);   // the ai_advisor_reports row
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // settings form
  const [provider, setProvider] = useState<Provider>('ANTHROPIC');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');          // only set when the user types a new key
  const [clearKey, setClearKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [sipBudget, setSipBudget] = useState('');
  const [stockBudget, setStockBudget] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  useEffect(() => stopPolling, []);

  const applyConfig = (c: Config) => {
    setConfig(c);
    setProvider(c.aiProvider);
    setModel(c.modelName);
    setEnabled(c.isEnabled);
    setSipBudget(c.monthlySipBudgetInr ? String(c.monthlySipBudgetInr) : '');
    setStockBudget(c.monthlyStockBudgetInr ? String(c.monthlyStockBudgetInr) : '');
    setApiKey('');
    setClearKey(false);
  };

  const loadLatest = useCallback(async () => {
    const res = await apiClient.get('/api/ai-advisor/reports/latest');
    setReport(res?.data || null);
  }, []);

  const watchRun = useCallback((runId: string) => {
    stopPolling();
    setRunning(true);
    setRunError(null);
    const started = Date.now();
    pollRef.current = setInterval(async () => {
      try {
        const res = await apiClient.get('/api/ai-advisor/runs?limit=5');
        const run = (res?.data || []).find((r: any) => r.id === runId);
        if (run && run.status !== 'RUNNING') {
          stopPolling();
          setRunning(false);
          if (run.status === 'COMPLETED') await loadLatest();
          else setRunError(run.error_message || 'The analysis did not finish.');
        } else if (Date.now() - started > 5 * 60 * 1000) {
          stopPolling();
          setRunning(false);
          setRunError('This is taking longer than usual. Pull down to check again in a minute.');
        }
      } catch { /* keep polling through brief network blips */ }
    }, 3000);
  }, [loadLatest]);

  const init = useCallback(async () => {
    try {
      const [cfg, mdl] = await Promise.all([
        apiClient.get('/api/ai-advisor/config'),
        apiClient.get('/api/ai-advisor/models'),
      ]);
      if (cfg?.data) applyConfig(cfg.data);
      if (mdl?.data) setModels(mdl.data);
      await loadLatest();
      const runs = await apiClient.get('/api/ai-advisor/runs?limit=1');
      const latestRun = runs?.data?.[0];
      if (latestRun?.status === 'RUNNING') watchRun(latestRun.id);
    } catch (e: any) {
      setRunError(e?.message || 'Could not load the advisor.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadLatest, watchRun]);

  useEffect(() => { init(); }, [init]);

  const startAnalysis = async () => {
    setRunError(null);
    setRunning(true);
    try {
      const res = await apiClient.post('/api/ai-advisor/run', {});
      if (res?.data?.runId) watchRun(res.data.runId);
      else setRunning(false);
    } catch (e: any) {
      // 409 = one is already in progress: pick it up instead of failing
      try {
        const runs = await apiClient.get('/api/ai-advisor/runs?limit=1');
        if (runs?.data?.[0]?.status === 'RUNNING') { watchRun(runs.data[0].id); return; }
      } catch {}
      setRunning(false);
      setRunError(e?.message || 'Could not start the analysis.');
    }
  };

  const saveSettings = async (thenRun = false) => {
    if (apiKey && apiKey.trim().length < 20) {
      Alert.alert('Check your key', 'That key looks too short. Copy the full key from your AI provider.');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, any> = {
        aiProvider: provider,
        modelName: model || undefined,
        isEnabled: enabled,
        monthlySipBudgetInr: sipBudget || undefined,
        monthlyStockBudgetInr: stockBudget || undefined,
      };
      if (clearKey) body.apiKeyOverride = '';
      else if (apiKey.trim()) body.apiKeyOverride = apiKey.trim();
      const res = await apiClient.put('/api/ai-advisor/config', body);
      if (res?.data) applyConfig(res.data);
      setView('report');
      if (thenRun) startAnalysis();
      else Alert.alert('Saved', 'Your AI settings have been updated.');
    } catch (e: any) {
      Alert.alert('Could not save', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const r = report?.report; // full structured report (schema v2)
  const providerInfo = PROVIDERS.find((p) => p.key === provider)!;
  const providerModels = models[provider] || [];

  // ── Settings view ────────────────────────────────────────────────────────────
  const renderSettings = () => (
    <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>1. Choose your AI</Text>
      <View style={styles.chipWrap}>
        {PROVIDERS.map((p) => (
          <Pressable
            key={p.key}
            style={[styles.chip, provider === p.key && styles.chipOn]}
            onPress={() => { setProvider(p.key); setModel(models[p.key]?.[0]?.id || ''); setApiKey(''); setClearKey(false); }}
          >
            <Text style={[styles.chipText, provider === p.key && styles.chipTextOn]}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      {providerModels.length > 0 && (
        <>
          <Text style={styles.label}>Model</Text>
          <View style={styles.chipWrap}>
            {providerModels.map((m) => (
              <Pressable key={m.id} style={[styles.chip, model === m.id && styles.chipOn]} onPress={() => setModel(m.id)}>
                <Text style={[styles.chipText, model === m.id && styles.chipTextOn]}>{m.name}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text style={styles.stepTitle}>2. Add your API key</Text>
      <Text style={styles.help}>{providerInfo.hint}. Get one at {providerInfo.keyUrl}. Your key is stored securely and is never shown in full again.</Text>
      {config?.hasApiKey && provider === config.aiProvider && !clearKey && !apiKey && (
        <View style={styles.keyBox}>
          <MaterialIcons name="vpn-key" size={18} color={colors.primaryContainer} />
          <Text style={styles.keyBoxText}>Saved key: {config.apiKeyOverride}</Text>
          <Pressable onPress={() => setClearKey(true)} hitSlop={8}><Text style={styles.removeText}>Remove</Text></Pressable>
        </View>
      )}
      {clearKey && <Text style={[styles.help, { color: colors.error }]}>The saved key will be removed when you save.</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder={config?.hasApiKey && provider === config.aiProvider ? 'Paste a new key to replace it' : 'Paste your API key'}
          placeholderTextColor={colors.outline}
          secureTextEntry={!showKey}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable onPress={() => setShowKey((v) => !v)} hitSlop={8}>
          <MaterialIcons name={showKey ? 'visibility-off' : 'visibility'} size={20} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>

      <Text style={styles.stepTitle}>3. Your investing budget (optional)</Text>
      <Text style={styles.help}>Helps the advisor suggest amounts that fit you.</Text>
      <Text style={styles.label}>Monthly SIP (mutual funds)</Text>
      <TextInput style={styles.inputSolo} value={sipBudget} onChangeText={(t) => setSipBudget(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="e.g. 10000" placeholderTextColor={colors.outline} />
      <Text style={styles.label}>Monthly stocks</Text>
      <TextInput style={styles.inputSolo} value={stockBudget} onChangeText={(t) => setStockBudget(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="e.g. 5000" placeholderTextColor={colors.outline} />

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchTitle}>Check my finances every day</Text>
          <Text style={styles.help}>A fresh report and a notification each morning.</Text>
        </View>
        <Switch value={enabled} onValueChange={setEnabled} trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }} thumbColor={colors.onPrimary} />
      </View>

      <Pressable style={[styles.primaryBtn, saving && { opacity: 0.7 }]} disabled={saving} onPress={() => saveSettings(true)}>
        {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryBtnText}>Save & check my finances</Text>}
      </Pressable>
      <Pressable style={styles.ghostBtn} disabled={saving} onPress={() => saveSettings(false)}>
        <Text style={styles.ghostBtnText}>Save only</Text>
      </Pressable>
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  // ── Report view ──────────────────────────────────────────────────────────────
  const renderReport = () => (
    <ScrollView
      contentContainerStyle={styles.pad}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); init(); }} tintColor={colors.primary} />}
    >
      {/* Run card */}
      <View style={styles.runCard}>
        <View style={styles.runIcon}><MaterialIcons name="auto-awesome" size={26} color={colors.primaryFixed} /></View>
        <Text style={styles.runTitle}>{r ? 'Your money check-up' : 'Get your money check-up'}</Text>
        <Text style={styles.runDesc}>
          {running
            ? 'Looking at your accounts, spending and investments. This usually takes under a minute.'
            : r
              ? `Last checked ${new Date(report.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`
              : 'The advisor studies your accounts, spending and investments, then tells you what is going well and what to do next.'}
        </Text>
        <Pressable style={[styles.runBtn, running && { opacity: 0.8 }]} disabled={running} onPress={startAnalysis}>
          {running ? <ActivityIndicator color={colors.primary} /> : (
            <>
              <MaterialIcons name="refresh" size={18} color={colors.primary} />
              <Text style={styles.runBtnText}>{r ? 'Check again' : 'Check my finances'}</Text>
            </>
          )}
        </Pressable>
        {!config?.hasApiKey && !running && (
          <Pressable onPress={() => setView('settings')}>
            <Text style={styles.runHint}>No API key added yet — tap to add yours</Text>
          </Pressable>
        )}
      </View>

      {runError && (
        <View style={styles.errorBox}>
          <MaterialIcons name="error-outline" size={20} color={colors.onErrorContainer} />
          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>We couldn't finish the check-up</Text>
            <Text style={styles.errorText}>{runError}</Text>
            <Pressable onPress={() => setView('settings')}><Text style={styles.errorLink}>Check AI settings</Text></Pressable>
          </View>
        </View>
      )}

      {r && (
        <>
          {/* Score */}
          <View style={styles.card}>
            <View style={styles.scoreRow}>
              <View style={[styles.scoreCircle, { borderColor: scoreColor(r.financialHealthScore) }]}>
                <Text style={[styles.scoreNum, { color: scoreColor(r.financialHealthScore) }]}>{r.financialHealthScore}</Text>
                <Text style={styles.scoreOf}>out of 100</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scoreLabel}>{scoreLabel(r.financialHealthScore)}</Text>
                <Text style={styles.summary}>{r.summary}</Text>
              </View>
            </View>
            {r.scoreBreakdown && (
              <View style={styles.breakdown}>
                {([['cashflow', 'Monthly cash'], ['liquidity', 'Ready cash'], ['debt', 'Loans'], ['investments', 'Investments']] as const).map(([k, label]) => (
                  <View key={k} style={styles.barRow}>
                    <Text style={styles.barLabel}>{label}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${r.scoreBreakdown[k]}%`, backgroundColor: scoreColor(r.scoreBreakdown[k]) }]} />
                    </View>
                    <Text style={styles.barNum}>{r.scoreBreakdown[k]}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Insights */}
          <Text style={styles.sectionTitle}>What we found</Text>
          <View style={styles.card}>
            {(r.keyInsights || []).map((i: any, idx: number) => {
              const sev = SEVERITY[i.severity] || SEVERITY.info;
              return (
                <View key={idx} style={[styles.insight, idx > 0 && styles.insightBorder]}>
                  <MaterialIcons name={sev.icon} size={22} color={sev.color} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.insightTitle}>{i.title}</Text>
                    <Text style={styles.insightDetail}>{i.detail}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Suggestions */}
          {(r.recommendations || []).length > 0 && (
            <>
              <Text style={styles.sectionTitle}>What you can do</Text>
              {r.recommendations.map((rec: any, idx: number) => {
                const pr = PRIORITY_COLOR[rec.priority] || PRIORITY_COLOR.LOW;
                return (
                  <View key={idx} style={styles.card}>
                    <View style={styles.recTop}>
                      <View style={[styles.pill, { backgroundColor: pr.bg }]}><Text style={[styles.pillText, { color: pr.fg }]}>{pr.label}</Text></View>
                      <Text style={styles.recAction}>{ACTION_LABEL[rec.action] || rec.action}</Text>
                    </View>
                    <Text style={styles.recTitle}>{rec.title}</Text>
                    {!!rec.security && rec.securityType !== 'GENERAL' && <Text style={styles.recSecurity}>{rec.security}</Text>}
                    <Text style={styles.insightDetail}>{rec.reason}</Text>
                    {rec.suggestedAmountInr > 0 && <Text style={styles.recAmount}>Suggested: {rupees(rec.suggestedAmountInr)}</Text>}
                  </View>
                );
              })}
            </>
          )}

          {/* Investing plan */}
          {((r.monthlySipPlan || []).length > 0 || (r.monthlyStockPlan || []).length > 0) && (
            <>
              <Text style={styles.sectionTitle}>Monthly investing plan</Text>
              <View style={styles.card}>
                {(r.monthlySipPlan || []).map((p: any, idx: number) => (
                  <View key={`s${idx}`} style={styles.planRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.insightTitle}>{p.fund}</Text>
                      <Text style={styles.insightDetail}>{p.reason}</Text>
                    </View>
                    <Text style={styles.planAmt}>{rupees(p.amount)}</Text>
                  </View>
                ))}
                {(r.monthlyStockPlan || []).map((p: any, idx: number) => (
                  <View key={`k${idx}`} style={styles.planRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.insightTitle}>{p.stock}</Text>
                      <Text style={styles.insightDetail}>{p.reason}</Text>
                    </View>
                    <Text style={styles.planAmt}>{rupees(p.amount)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Go deeper */}
          <View style={styles.linkRow}>
            <Pressable style={styles.linkBtn} onPress={() => onNavigate && onNavigate('portfolio')}>
              <MaterialIcons name="show-chart" size={18} color={colors.primary} />
              <Text style={styles.linkText}>See my investments</Text>
            </Pressable>
            <Pressable style={styles.linkBtn} onPress={() => onNavigate && onNavigate('budgets')}>
              <MaterialIcons name="savings" size={18} color={colors.primary} />
              <Text style={styles.linkText}>Set a budget</Text>
            </Pressable>
          </View>

          {(r.dataCaveats || []).length > 0 && (
            <View style={styles.caveat}>
              <Text style={styles.caveatTitle}>Things to keep in mind</Text>
              {r.dataCaveats.map((c: string, i: number) => <Text key={i} style={styles.caveatText}>• {c}</Text>)}
            </View>
          )}
          <Text style={styles.disclaimer}>
            This is AI-generated guidance based on your data, not professional financial advice. Check important decisions with a qualified advisor.
          </Text>
        </>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable onPress={view === 'settings' ? () => setView('report') : onBack} style={styles.headerBtn} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{view === 'settings' ? 'AI settings' : 'AI Advisor'}</Text>
        {view === 'report' ? (
          <Pressable onPress={() => setView('settings')} style={styles.headerBtn} hitSlop={8} accessibilityLabel="AI settings">
            <MaterialIcons name="settings" size={22} color={colors.primary} />
          </Pressable>
        ) : <View style={styles.headerBtn} />}
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : view === 'settings' ? renderSettings() : renderReport()}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainerLow },
  headerTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: colors.primary },
  pad: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  // run card
  runCard: { backgroundColor: colors.primaryContainer, borderRadius: 24, padding: 22, alignItems: 'center', gap: 8 },
  runIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  runTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: colors.onPrimary },
  runDesc: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onPrimaryContainer, textAlign: 'center' },
  runBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 22, height: 48, borderRadius: 14, backgroundColor: colors.primaryFixed, minWidth: 180, justifyContent: 'center' },
  runBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.primary },
  runHint: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.primaryFixed, marginTop: 6, textDecorationLine: 'underline' },
  errorBox: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.errorContainer },
  errorTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.onErrorContainer },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onErrorContainer, marginTop: 2 },
  errorLink: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.onErrorContainer, marginTop: 8, textDecorationLine: 'underline' },
  // report cards
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(193,200,194,0.4)' },
  scoreRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  scoreCircle: { width: 96, height: 96, borderRadius: 48, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 32 },
  scoreOf: { fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.onSurfaceVariant },
  scoreLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: colors.onSurface },
  summary: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onSurfaceVariant, marginTop: 4, lineHeight: 19 },
  breakdown: { marginTop: 16, gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 88, fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceVariant },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surfaceContainerHigh, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barNum: { width: 28, textAlign: 'right', fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.onSurface },
  sectionTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: colors.onSurface, marginTop: 8 },
  insight: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  insightBorder: { borderTopWidth: 1, borderTopColor: 'rgba(193,200,194,0.3)' },
  insightTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.onSurface },
  insightDetail: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onSurfaceVariant, marginTop: 2, lineHeight: 19 },
  recTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  recAction: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.onSurfaceVariant },
  recTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: colors.onSurface },
  recSecurity: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.primaryContainer, marginTop: 2 },
  recAmount: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.primaryContainer, marginTop: 8 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  planAmt: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: colors.primary },
  linkRow: { flexDirection: 'row', gap: 10 },
  linkBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.surfaceContainer },
  linkText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.primary },
  caveat: { padding: 14, borderRadius: 14, backgroundColor: colors.secondaryContainer, gap: 4 },
  caveatTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.onSecondaryContainer },
  caveatText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSecondaryContainer },
  disclaimer: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.outline, textAlign: 'center' },
  // settings
  stepTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17, color: colors.onSurface, marginTop: 10 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.onSurfaceVariant, marginTop: 4 },
  help: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceVariant, lineHeight: 18 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.surfaceContainer },
  chipOn: { backgroundColor: colors.primaryContainer },
  chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.onSurface },
  chipTextOn: { color: colors.onPrimary },
  keyBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.primaryFixed },
  keyBoxText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.onPrimaryFixed },
  removeText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.error },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant },
  input: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.onSurface },
  inputSolo: { height: 50, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant, fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.onSurface },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  switchTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.onSurface },
  primaryBtn: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryContainer, marginTop: 12 },
  primaryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.onPrimary },
  ghostBtn: { height: 48, alignItems: 'center', justifyContent: 'center' },
  ghostBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.primaryContainer },
});
