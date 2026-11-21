import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput, Platform, ScrollView, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface VoiceAIModalProps {
  visible: boolean;
  onClose: () => void;
}

export const VoiceAIModal: React.FC<VoiceAIModalProps> = ({ visible, onClose }) => {
  const [isListening, setIsListening] = useState(true);
  const [mode, setMode] = useState<'voice' | 'text'>('voice');

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />
          
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrapper}>
                <MaterialIcons name="graphic-eq" size={16} color={colors.onPrimaryFixed} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Voice & Natural Language</Text>
                <View style={styles.headerSubtitleRow}>
                  <MaterialIcons name="lock" size={12} color={colors.primary} />
                  <Text style={styles.headerSubtitle}>Encrypted NLP • EN/HI/Hinglish</Text>
                </View>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Mode Switcher */}
            <View style={styles.modeSwitcherRow}>
              <View style={styles.modeSwitcher}>
                <Pressable 
                  style={[styles.modeBtn, mode === 'voice' && styles.modeBtnActive]}
                  onPress={() => setMode('voice')}
                >
                  <MaterialIcons name="mic" size={14} color={mode === 'voice' ? colors.primary : colors.onSurfaceVariant} />
                  <Text style={[styles.modeBtnText, mode === 'voice' && styles.modeBtnTextActive]}>Voice (Active)</Text>
                </Pressable>
                <Pressable 
                  style={[styles.modeBtn, mode === 'text' && styles.modeBtnActive]}
                  onPress={() => setMode('text')}
                >
                  <MaterialIcons name="keyboard" size={14} color={mode === 'text' ? colors.primary : colors.onSurfaceVariant} />
                  <Text style={[styles.modeBtnText, mode === 'text' && styles.modeBtnTextActive]}>Text Prompt</Text>
                </Pressable>
              </View>
              <View style={styles.langBadge}>
                <MaterialIcons name="translate" size={14} color={colors.surfaceTint} />
                <Text style={styles.langBadgeText}>EN / Hinglish / हिंदी</Text>
              </View>
            </View>

            {/* Listening State */}
            <View style={styles.listeningContainer}>
              <View style={styles.listeningHeader}>
                <View style={styles.listeningStatus}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.listeningText}>Listening...</Text>
                  <Text style={styles.listeningSubtext}>(Tap mic to pause)</Text>
                </View>
                <View style={styles.timerBadge}>
                  <View style={styles.timerDot} />
                  <Text style={styles.timerText}>0:03</Text>
                </View>
              </View>

              {/* Fake Waveform */}
              <View style={styles.waveformContainer}>
                {[1, 2, 3, 2, 1, 4, 2, 3, 2, 1, 3, 2].map((h, i) => (
                  <View key={i} style={[styles.waveBar, { height: h * 8 }]} />
                ))}
              </View>

              {/* Speech Bubble */}
              <View style={styles.speechBubble}>
                <MaterialIcons name="textsms" size={20} color={colors.surfaceTint} style={{ marginTop: 2 }} />
                <Text style={styles.speechText}>
                  "Paid <Text style={styles.speechHighlight}>850 rupees</Text> at <Text style={styles.speechHighlight}>Blue Tokai</Text> for cold brew and sandwiches using <Text style={styles.speechHighlight}>HDFC debit card</Text>"
                </Text>
              </View>
            </View>

            {/* Auto Structured Breakdown */}
            <View style={styles.breakdownHeader}>
              <Text style={styles.breakdownTitle}>AUTO-STRUCTURED BREAKDOWN</Text>
              <View style={styles.confidenceBadge}>
                <MaterialIcons name="verified" size={13} color={colors.surfaceTint} />
                <Text style={styles.confidenceText}>High Confidence (99.4%)</Text>
              </View>
            </View>

            <View style={styles.breakdownCard}>
              <View style={styles.breakdownHero}>
                <View>
                  <Text style={styles.outflowLabel}>Detected Outflow</Text>
                  <Text style={styles.outflowValue}>₹850.00</Text>
                </View>
                <View style={styles.budgetStatus}>
                  <View style={styles.budgetBadge}>
                    <MaterialIcons name="shield" size={13} color={colors.onPrimaryFixed} />
                    <Text style={styles.budgetBadgeText}>Safe • 82%</Text>
                  </View>
                  <Text style={styles.budgetText}>₹1,850 left in Dining budget</Text>
                </View>
              </View>

              <View style={styles.bentoGrid}>
                <View style={styles.bentoCard}>
                  <Text style={styles.bentoLabel}><MaterialIcons name="category" size={12} /> Category</Text>
                  <View style={styles.bentoValueRow}>
                    <MaterialIcons name="restaurant" size={16} color={colors.secondary} />
                    <Text style={styles.bentoValue}>Dining Out & Cafes</Text>
                  </View>
                </View>
                <View style={styles.bentoCard}>
                  <Text style={styles.bentoLabel}><MaterialIcons name="store" size={12} /> Merchant</Text>
                  <View style={styles.bentoValueRow}>
                    <MaterialIcons name="storefront" size={16} color={colors.tertiary} />
                    <Text style={styles.bentoValue}>Blue Tokai Coffee</Text>
                  </View>
                </View>
                <View style={styles.bentoCard}>
                  <Text style={styles.bentoLabel}><MaterialIcons name="event" size={12} /> Date & Time</Text>
                  <View style={styles.bentoValueRow}>
                    <MaterialIcons name="schedule" size={16} color={colors.primary} />
                    <Text style={styles.bentoValue}>Today, 2:14 PM</Text>
                  </View>
                </View>
                <View style={styles.bentoCard}>
                  <Text style={styles.bentoLabel}><MaterialIcons name="account-balance" size={12} /> Account</Text>
                  <View style={styles.bentoValueRow}>
                    <MaterialIcons name="credit-card" size={16} color={colors.primary} />
                    <Text style={styles.bentoValue}>HDFC Bank</Text>
                  </View>
                </View>
              </View>
            </View>

            <Pressable style={styles.primaryBtn} onPress={onClose}>
              <MaterialIcons name="check-circle" size={20} color={colors.onPrimary} />
              <Text style={styles.primaryBtnText}>Confirm & Save</Text>
            </Pressable>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 17, 15, 0.5)',
  },
  sheetContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(193, 200, 194, 0.6)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: colors.primary,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.surfaceTint,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
  },
  modeSwitcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  modeBtnActive: {
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  modeBtnTextActive: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  langBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
  },
  langBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  listeningContainer: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    marginBottom: 16,
  },
  listeningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  listeningStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
  },
  listeningText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.primary,
  },
  listeningSubtext: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
  },
  timerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceTint,
  },
  timerText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.primary,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    marginBottom: 14,
  },
  waveBar: {
    width: 6,
    backgroundColor: colors.primaryContainer,
    borderRadius: 3,
  },
  speechBubble: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
  },
  speechText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary,
    flex: 1,
  },
  speechHighlight: {
    fontFamily: 'Inter_600SemiBold',
    textDecorationLine: 'underline',
    textDecorationColor: colors.primaryFixedDim,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  breakdownTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.onSurfaceVariant,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confidenceText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.surfaceTint,
  },
  breakdownCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    marginBottom: 24,
  },
  breakdownHero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.2)',
    marginBottom: 12,
  },
  outflowLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  outflowValue: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 28,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  budgetStatus: {
    alignItems: 'flex-end',
  },
  budgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  budgetBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onPrimaryFixed,
  },
  budgetText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bentoCard: {
    width: '48%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
  },
  bentoLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  bentoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bentoValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
  },
  primaryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onPrimary,
  }
});
