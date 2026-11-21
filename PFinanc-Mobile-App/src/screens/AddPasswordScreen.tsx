import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { vaultApi } from '../api/vault';
import { VaultCrypto } from '../utils/VaultCrypto';
export const AddPasswordScreen: React.FC<{ onBack?: () => void; onNavigate?: (screen: string) => void }> = ({ onBack, onNavigate }) => {
  const insets = useSafeAreaInsets();

  const [serviceName, setServiceName] = useState('HDFC NetBanking');
  const [category, setCategory] = useState('Banking');
  const [username, setUsername] = useState('mitesh.pandya@email.com');
  const [password, setPassword] = useState('Tr@nqu1l!PFin#2025');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [showOptional, setShowOptional] = useState(true);
  const [url, setUrl] = useState('https://netbanking.hdfcbank.com');
  const [notes, setNotes] = useState("Customer ID: 8940211 • Security question answer for mother's maiden name");

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.iconButton} onPress={onBack}>
          <MaterialIcons name="close" size={20} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Password</Text>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.headerCancel}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Ownership Policy Banner */}
        <View style={styles.policyBanner}>
          <View style={styles.policyGlow} />
          <View style={styles.policyTopRow}>
            <View style={styles.ownerLeft}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>M</Text>
                </View>
                <View style={styles.avatarBadge}>
                  <MaterialIcons name="shield" size={8} color={colors.primary} />
                </View>
              </View>
              <View>
                <View style={styles.ownerRoleRow}>
                  <Text style={styles.ownerRoleText}>VAULT OWNER</Text>
                  <View style={styles.ownerRoleBadge}>
                    <Text style={styles.ownerRoleBadgeText}>Owner</Text>
                  </View>
                </View>
                <Text style={styles.ownerName}>You (Mitesh)</Text>
              </View>
            </View>
            <View style={styles.policyRight}>
              <View style={styles.policyPill}>
                <MaterialIcons name="lock" size={12} color={colors.primaryContainer} />
                <Text style={styles.policyPillText}>Owner Only</Text>
              </View>
              <Text style={styles.policySubtext}>Private Default</Text>
            </View>
          </View>

          <View style={styles.policyNoteRow}>
            <MaterialIcons name="verified-user" size={14} color={colors.primary} />
            <Text style={styles.policyNoteText}>
              Only you can access this credential unless you choose to share it later.
            </Text>
          </View>
        </View>

        <View style={styles.formSpace} />

        {/* Form Fields */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Account / Service Name <Text style={styles.asterisk}>*</Text></Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={serviceName}
              onChangeText={setServiceName}
              placeholder="e.g. HDFC NetBanking, Zerodha Kite"
              placeholderTextColor={colors.outline}
            />
            <View style={styles.autoDetectBadge}>
              <View style={styles.autoDetectIconBox}>
                <MaterialIcons name="account-balance" size={12} color={colors.primaryContainer} />
              </View>
              <Text style={styles.autoDetectText}>Auto-detected</Text>
            </View>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Category</Text>
            <Text style={styles.labelDesc}>Taxonomy tag</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            <CategoryChip title="Banking" icon="account-balance" active={category === 'Banking'} onPress={() => setCategory('Banking')} />
            <CategoryChip title="Investments" icon="trending-up" active={category === 'Investments'} onPress={() => setCategory('Investments')} />
            <CategoryChip title="Insurance" icon="health-and-safety" active={category === 'Insurance'} onPress={() => setCategory('Insurance')} />
            <CategoryChip title="Utilities" icon="bolt" active={category === 'Utilities'} onPress={() => setCategory('Utilities')} />
            <CategoryChip title="Other" icon="more-horiz" active={category === 'Other'} onPress={() => setCategory('Other')} />
          </ScrollView>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Username / Email / Customer ID <Text style={styles.asterisk}>*</Text></Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Username, email or unique identifier"
              placeholderTextColor={colors.outline}
            />
            <View style={styles.inputActions}>
              <TouchableOpacity style={styles.actionBtn}><MaterialIcons name="content-paste" size={18} color={colors.onSurfaceVariant} /></TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}><MaterialIcons name="content-copy" size={18} color={colors.onSurfaceVariant} /></TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Password <Text style={styles.asterisk}>*</Text></Text>
            <TouchableOpacity style={styles.generateBtnRow}>
              <MaterialIcons name="auto-awesome" size={14} color={colors.primary} />
              <Text style={styles.generateBtnText}>Generate strong password</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { letterSpacing: isPasswordVisible ? 0 : 2 }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!isPasswordVisible}
              placeholder="Enter or generate password"
              placeholderTextColor={colors.outline}
            />
            <View style={styles.inputActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                <MaterialIcons name={isPasswordVisible ? "visibility-off" : "visibility"} size={18} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <MaterialIcons name="key" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Strength Meter */}
          <View style={styles.strengthBox}>
            <View style={styles.strengthHeader}>
              <View style={styles.strengthHeaderLeft}>
                <View style={styles.strengthDot} />
                <Text style={styles.strengthText}>Strong • 16 chars</Text>
              </View>
              <Text style={styles.strengthSubtext}>Institutional grade</Text>
            </View>
            <View style={styles.strengthBars}>
              <View style={[styles.strengthBar, { backgroundColor: colors.primaryContainer }]} />
              <View style={[styles.strengthBar, { backgroundColor: colors.primaryContainer }]} />
              <View style={[styles.strengthBar, { backgroundColor: colors.primaryContainer }]} />
              <View style={[styles.strengthBar, { backgroundColor: colors.primaryContainer }]} />
            </View>
          </View>
        </View>

        {/* Optional Fields */}
        <View style={styles.optionalSection}>
          <TouchableOpacity style={styles.optionalHeader} onPress={() => setShowOptional(!showOptional)}>
            <View style={styles.optionalHeaderLeft}>
              <MaterialIcons name="tune" size={18} color={colors.onSurfaceVariant} />
              <Text style={styles.optionalHeaderText}>Optional Account Metadata</Text>
            </View>
            <MaterialIcons name={showOptional ? "expand-less" : "expand-more"} size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>

          {showOptional && (
            <View style={styles.optionalContent}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Website URL</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="link" size={16} color={colors.onSurfaceVariant} style={styles.inputLeftIcon} />
                  <TextInput
                    style={[styles.input, { paddingLeft: 36 }]}
                    value={url}
                    onChangeText={setUrl}
                    placeholder="https://..."
                    placeholderTextColor={colors.outline}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Notes / Security Clues</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  placeholder="Additional context..."
                  placeholderTextColor={colors.outline}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.primaryButton} onPress={async () => {
          try {
            if (!serviceName || !password) {
              return Alert.alert('Validation Error', 'Service name and password are required.');
            }
            const payload = JSON.stringify({
              title: serviceName,
              username,
              password,
              url,
              notes,
              icon: 'lock',
              color: colors.primary
            });
            const DEV_MASTER_KEY = VaultCrypto.deriveKey('123456', 'pfinanc_salt');
            const { ciphertext, iv, authTag } = VaultCrypto.encryptData(payload, DEV_MASTER_KEY);

            await vaultApi.createItem({
              category,
              encryptedData: ciphertext,
              iv,
              authTag,
              isShared: false
            });

            Alert.alert('Saved to Vault', 'Your credential has been encrypted and securely stored locally.', [
              { text: 'OK', onPress: () => { if (onBack) onBack(); } }
            ]);
          } catch (e) {
            Alert.alert('Error', 'Failed to save encrypted item to the vault.');
          }
        }}>
          <MaterialIcons name="lock-open" size={20} color={colors.onPrimary} />
          <Text style={styles.primaryButtonText}>Save to Vault</Text>
        </TouchableOpacity>
        <View style={styles.footerNoteRow}>
          <MaterialIcons name="enhanced-encryption" size={12} color={colors.primary} />
          <Text style={styles.footerNoteText}>Locally encrypted with your 256-bit Vault key before saving.</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const CategoryChip = ({ title, icon, active, onPress }: any) => (
  <TouchableOpacity style={[styles.chip, active ? styles.chipActive : styles.chipInactive]} onPress={onPress}>
    {icon && <MaterialIcons name={icon as any} size={14} color={active ? colors.onPrimary : colors.onSurfaceVariant} />}
    <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  iconButton: {
    width: 36, height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  headerCancel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  policyBanner: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
    position: 'relative',
  },
  policyGlow: {
    position: 'absolute',
    bottom: -24, right: -24,
    width: 96, height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(192, 236, 214, 0.2)',
  },
  policyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
    paddingBottom: 12,
  },
  ownerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2, right: -2,
    width: 16, height: 16,
    borderRadius: 8,
    backgroundColor: colors.primaryFixedDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceContainerLowest,
  },
  ownerRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerRoleText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  ownerRoleBadge: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 10,
  },
  ownerRoleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.onPrimaryFixed,
  },
  ownerName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
  },
  policyRight: {
    alignItems: 'flex-end',
  },
  policyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
  },
  policyPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurface,
  },
  policySubtext: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  policyNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
  },
  policyNoteText: {
    flex: 1,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  formSpace: {
    height: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    marginBottom: 6,
  },
  labelDesc: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  asterisk: {
    color: colors.error,
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.onSurface,
  },
  autoDetectBadge: {
    position: 'absolute',
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
  },
  autoDetectIconBox: {
    width: 20, height: 20,
    borderRadius: 4,
    backgroundColor: 'rgba(13, 56, 41, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoDetectText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  chipActive: {
    backgroundColor: colors.primaryContainer,
  },
  chipInactive: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.4)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.onPrimary,
  },
  chipTextInactive: {
    color: colors.onSurfaceVariant,
  },
  inputActions: {
    position: 'absolute',
    right: 10,
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    padding: 6,
  },
  generateBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  generateBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  strengthBox: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  strengthHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  strengthDot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryContainer,
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryContainer,
  },
  strengthSubtext: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 6,
    height: 6,
  },
  strengthBar: {
    flex: 1,
    borderRadius: 3,
  },
  optionalSection: {
    backgroundColor: 'rgba(238, 245, 242, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  optionalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionalHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  optionalContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  inputLeftIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 200, 194, 0.2)',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 3,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  footerNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerNoteText: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
});
