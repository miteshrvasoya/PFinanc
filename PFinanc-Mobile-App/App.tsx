import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Text, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { 
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold
} from '@expo-google-fonts/inter';
import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold
} from '@expo-google-fonts/plus-jakarta-sans';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { PortfolioScreen } from './src/screens/PortfolioScreen';
import { MoreScreen } from './src/screens/MoreScreen';
import { InsightsScreen } from './src/screens/InsightsScreen';
import { BudgetsScreen } from './src/screens/BudgetsScreen';
import { AIAdvisorScreen } from './src/screens/AIAdvisorScreen';
import { StatementImportScreen } from './src/screens/StatementImportScreen';
import { SecurityScreen } from './src/screens/SecurityScreen';
import { FamilyMemberScreen } from './src/screens/FamilyMemberScreen';
import { AuditLogScreen } from './src/screens/AuditLogScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { LockScreen } from './src/screens/LockScreen';
import { SMSReviewScreen } from './src/screens/SMSReviewScreen';
import { AccountsScreen } from './src/screens/AccountsScreen';
import { BottomNav } from './src/components/BottomNav';
import { QuickAddModal } from './src/components/QuickAddModal';
import { QuickActionMenu, QuickActionType } from './src/components/QuickActionMenu';
import { VoiceAIModal } from './src/components/VoiceAIModal';
import { SplashScreen } from './src/screens/SplashScreen';
import { VaultIntroductionScreen } from './src/screens/VaultIntroductionScreen';
import { VaultSecuritySetupScreen } from './src/screens/VaultSecuritySetupScreen';
import { VaultReadyScreen } from './src/screens/VaultReadyScreen';
import { VaultOverviewScreen } from './src/screens/VaultOverviewScreen';
import { AddPasswordScreen } from './src/screens/AddPasswordScreen';
import { PasswordDetailsScreen } from './src/screens/PasswordDetailsScreen';
import { colors } from './src/theme/colors';

type Tab = 'home' | 'history' | 'portfolio' | 'more';

const MainNavigator = () => {
  const { user, isLoading } = useAuth();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [quickActionVisible, setQuickActionVisible] = useState(false);
  const [voiceAIVisible, setVoiceAIVisible] = useState(false);
  const [quickAddInitialTab, setQuickAddInitialTab] = useState<string>('Expense');
  
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [activeScreen, setActiveScreen] = useState('none');
  const [isUnlocked, setIsUnlocked] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  const openAdd = (type: 'expense' | 'income' | 'transfer') => {
    setQuickAddInitialTab(type === 'income' ? 'Income' : type === 'transfer' ? 'Transfer' : 'Expense');
    setModalVisible(true);
  };

  const [txnFilter, setTxnFilter] = useState<{ value: string; nonce: number }>({ value: 'All', nonce: 0 });

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setActiveScreen('none');
    if (tab === 'history') setTxnFilter({ value: 'All', nonce: Date.now() });
  };

  // Central navigation: tab names switch tabs (optionally with a Transactions filter),
  // anything else opens a full-screen page.
  const navigate = (target: string, params?: { filter?: string }) => {
    if (target === 'home' || target === 'history' || target === 'portfolio' || target === 'more') {
      setActiveTab(target);
      setActiveScreen('none');
      if (target === 'history') setTxnFilter({ value: params?.filter ?? 'All', nonce: Date.now() });
      return;
    }
    setActiveScreen(target);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (!isUnlocked) {
    return <LockScreen onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <View style={styles.container}>
      {activeScreen === 'none' && activeTab === 'home' && <HomeScreen onNavigate={navigate} onAddEntry={openAdd} refreshKey={refreshKey} />}
      {activeScreen === 'none' && activeTab === 'history' && <TransactionsScreen onNavigate={navigate} initialFilter={txnFilter} onAddEntry={openAdd} refreshKey={refreshKey} />}
      {activeScreen === 'none' && activeTab === 'portfolio' && <PortfolioScreen onNavigate={navigate} />}
      {activeScreen === 'none' && activeTab === 'more' && <MoreScreen onNavigate={navigate} />}

      {activeScreen === 'insights' && <InsightsScreen onBack={() => setActiveScreen('none')} />}
      {activeScreen === 'budgets' && <BudgetsScreen onBack={() => setActiveScreen('none')} />}
      {activeScreen === 'advisor' && <AIAdvisorScreen onBack={() => setActiveScreen('none')} onNavigate={navigate} />}
      {activeScreen === 'imports' && <StatementImportScreen onBack={() => setActiveScreen('none')} onNavigate={navigate} />}
      {activeScreen === 'security' && <SecurityScreen onBack={() => setActiveScreen('none')} />}
      {activeScreen === 'familyMember' && <FamilyMemberScreen onBack={() => setActiveScreen('none')} onNavigate={navigate} />}
      {activeScreen === 'audit' && <AuditLogScreen onBack={() => setActiveScreen('none')} onNavigate={navigate} />}
      {activeScreen === 'notifications' && <NotificationsScreen onBack={() => setActiveScreen('none')} onNavigate={navigate} />}
      {activeScreen === 'smsReview' && <SMSReviewScreen onBack={() => setActiveScreen('none')} />}
      {activeScreen === 'accounts' && <AccountsScreen onBack={() => setActiveScreen('none')} />}
      {activeScreen === 'vaultIntro' && <VaultIntroductionScreen onBack={() => setActiveScreen('none')} onNavigate={navigate} />}
      {activeScreen === 'vaultSecuritySetup' && <VaultSecuritySetupScreen onBack={() => setActiveScreen('vaultIntro')} onNavigate={navigate} />}
      {activeScreen === 'vaultReady' && <VaultReadyScreen onBack={() => setActiveScreen('none')} onNavigate={navigate} />}
      {activeScreen === 'vaultOverview' && <VaultOverviewScreen onBack={() => setActiveScreen('none')} onNavigate={navigate} />}
      {activeScreen === 'addPassword' && <AddPasswordScreen onBack={() => setActiveScreen('vaultOverview')} onNavigate={navigate} />}
      {activeScreen === 'passwordDetails' && <PasswordDetailsScreen onBack={() => setActiveScreen('vaultOverview')} onNavigate={navigate} />}

      <BottomNav 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onQuickAddPress={() => setQuickActionVisible(true)} 
      />
      <QuickActionMenu
        visible={quickActionVisible}
        onClose={() => setQuickActionVisible(false)}
        onActionSelect={(action) => {
          if (action === 'voice_ai') {
            setVoiceAIVisible(true);
          } else if (action === 'expense') {
            setQuickAddInitialTab('Expense');
            setModalVisible(true);
          } else if (action === 'income') {
            setQuickAddInitialTab('Income');
            setModalVisible(true);
          } else if (action === 'transfer') {
            setQuickAddInitialTab('Transfer');
            setModalVisible(true);
          } else if (action === 'scan') {
            Alert.alert('Scan receipt', 'Receipt scanning is coming soon. Use Statement Import to add transactions in bulk.', [
              { text: 'Not now', style: 'cancel' },
              { text: 'Open Imports', onPress: () => navigate('imports') },
            ]);
          }
        }}
      />
      <QuickAddModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        initialTab={quickAddInitialTab}
        onSaved={() => setRefreshKey(k => k + 1)}
      />
      <VoiceAIModal
        visible={voiceAIVisible}
        onClose={() => setVoiceAIVisible(false)}
      />
    </View>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [splashDone, setSplashDone] = useState(false);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }} />
    );
  }

  if (!splashDone) {
    return (
      <SplashScreen onAnimationFinish={() => setSplashDone(true)} />
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <MainNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});
