import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { vaultApi, VaultItem } from '../api/vault';
import { VaultCrypto } from '../utils/VaultCrypto';

export const VaultOverviewScreen: React.FC<{ onBack?: () => void; onNavigate?: (screen: string) => void }> = ({ onBack, onNavigate }) => {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('All');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // In production, the masterKey should be stored securely in context/memory after PIN unlock
  const DEV_MASTER_KEY = VaultCrypto.deriveKey('123456', 'pfinanc_salt');

  useEffect(() => {
    const fetchVault = async () => {
      try {
        const data = await vaultApi.getItems();
        const decryptedItems = data.map(item => {
          try {
            const jsonStr = VaultCrypto.decryptData(item.encryptedData, DEV_MASTER_KEY, item.iv, item.authTag);
            const parsed = JSON.parse(jsonStr);
            return {
              id: item._id,
              title: parsed.title || 'Untitled',
              category: item.category,
              username: parsed.username || '',
              icon: parsed.icon || 'lock',
              color: parsed.color || colors.primary,
              updated: new Date(item.updatedAt).toLocaleDateString(),
              auth: false,
              shareable: item.isShared,
              raw: parsed
            };
          } catch (err) {
            console.error('Decryption failed for item', item._id);
            return null;
          }
        }).filter(Boolean);
        setItems(decryptedItems);
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch vault items');
      } finally {
        setLoading(false);
      }
    };
    fetchVault();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.profileSection} onPress={onBack}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCjlmnBoTr0_CO-_RV9ZD29XHG30Hw6cQQMTnBxr8dJkVxR8KQHo-jOdlZ-i5cfQuupfBSLJ1lGb_-6QQei2-UjOrjGEqMxzFjPGJxUaC_rqLHCAwUaYwl1Pzp9DP6tjMUrsaIk84lTRJkDlrSvRhlO1TR9yaCyTrvANh7NwYqFkni8xgG1JXPEdxSQ69iXjV33lJ9ySGWc8fpVBxmaYMbrTS5e1vncMv62ZoEB66jiWLngSEdGz_0tIw' }} 
              style={styles.avatar} 
            />
            <View style={styles.avatarBadge} />
          </View>
          <View>
            <Text style={styles.appBarTitle}>Vault</Text>
            <View style={styles.appBarSubtitleRow}>
              <MaterialIcons name="cottage" size={11} color={colors.onSurfaceVariant} />
              <Text style={styles.appBarSubtitle}> Pandya Household</Text>
            </View>
          </View>
        </TouchableOpacity>
        
        <View style={styles.appBarActions}>
          <View style={styles.timerPill}>
            <MaterialIcons name="lock-open" size={14} color={colors.primaryContainer} />
            <Text style={styles.timerText}>1m</Text>
          </View>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialIcons name="settings" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]} showsVerticalScrollIndicator={false}>
        
        {/* Hardware Security Assurance */}
        <View style={styles.assuranceBanner}>
          <View style={styles.assuranceLeft}>
            <View style={styles.assuranceIcon}>
              <MaterialIcons name="security" size={18} color={colors.primaryContainer} />
            </View>
            <View>
              <Text style={styles.assuranceTitle}>Hardware Key Encrypted</Text>
              <Text style={styles.assuranceDesc}>Zero-knowledge Indian cloud backup</Text>
            </View>
          </View>
          <View style={styles.secureBadge}>
            <Text style={styles.secureBadgeText}>Secure</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color={colors.outline} style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search logins, banks, portals..."
            placeholderTextColor={colors.outline}
          />
          <MaterialIcons name="mic" size={18} color={colors.outline} style={styles.micIcon} />
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          <CategoryChip title="All" count="6" active={activeCategory === 'All'} onPress={() => setActiveCategory('All')} />
          <CategoryChip title="Banking" icon="account-balance" count="2" active={activeCategory === 'Banking'} onPress={() => setActiveCategory('Banking')} />
          <CategoryChip title="Investments" icon="show-chart" count="2" active={activeCategory === 'Investments'} onPress={() => setActiveCategory('Investments')} />
          <CategoryChip title="Utilities" icon="electric-bolt" count="1" active={activeCategory === 'Utilities'} onPress={() => setActiveCategory('Utilities')} />
          <CategoryChip title="Personal" icon="person" count="1" active={activeCategory === 'Personal'} onPress={() => setActiveCategory('Personal')} />
        </ScrollView>

        {/* Viewing Scope Toggle */}
        <View style={styles.scopeToggleRow}>
          <TouchableOpacity style={styles.scopeToggleBtn}>
            <MaterialIcons name="badge" size={16} color={colors.primary} />
            <Text style={styles.scopeToggleText}>Viewing: Your Credentials</Text>
            <View style={styles.scopeCountBadge}>
              <Text style={styles.scopeCountText}>6</Text>
            </View>
            <MaterialIcons name="expand-more" size={16} color={colors.outline} />
          </TouchableOpacity>
          <View style={styles.privateStatus}>
            <View style={styles.pulseDot} />
            <Text style={styles.privateStatusText}>Private Vault</Text>
          </View>
        </View>

        {/* Cards */}
        <View style={styles.cardsList}>
          {items.map(item => (
            <TouchableOpacity key={item.id} style={styles.card} onPress={() => onNavigate?.('passwordDetails')}>
              <View style={styles.cardTop}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardIconBox, { backgroundColor: item.color + '1A', borderColor: item.color + '33' }]}>
                    <MaterialIcons name={item.icon as any} size={24} color={item.color} />
                  </View>
                  <View>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <View style={styles.cardCategoryPill}>
                        <Text style={styles.cardCategoryText}>{item.category}</Text>
                      </View>
                    </View>
                    <View style={styles.cardUsernameRow}>
                      <Text style={styles.cardUsername}>{item.username}</Text>
                      <MaterialIcons name="content-copy" size={14} color={colors.outline} style={{ marginLeft: 4 }} />
                    </View>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
              </View>
              
              <View style={styles.cardDivider} />
              
              <View style={styles.cardBottom}>
                <View style={styles.cardMetadataLeft}>
                  <View style={styles.ownerBadge}>
                    <MaterialIcons name="person" size={11} color={colors.onPrimaryFixed} />
                    <Text style={styles.ownerBadgeText}>Owner: You</Text>
                  </View>
                  <View style={styles.privateBadge}>
                    <MaterialIcons name={item.shareable ? "group-add" : "lock"} size={12} color={colors.onSurfaceVariant} />
                    <Text style={styles.privateBadgeText}>{item.shareable ? 'Shareable' : 'Private'}</Text>
                  </View>
                </View>
                {item.auth ? (
                  <View style={styles.authBadge}>
                    <MaterialIcons name="verified-user" size={11} color={colors.onPrimaryFixedVariant} />
                    <Text style={styles.authBadgeText}>{item.updated}</Text>
                  </View>
                ) : (
                  <Text style={styles.updatedText}>{item.updated}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Invite Tile */}
        <View style={styles.inviteTile}>
          <View style={styles.inviteLeft}>
            <View style={styles.inviteIconBox}>
              <MaterialIcons name="group-add" size={18} color={colors.primaryContainer} />
            </View>
            <View>
              <Text style={styles.inviteTitle}>Add Family Member Access</Text>
              <Text style={styles.inviteDesc}>Securely delegate utilities</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.inviteBtn}>
            <Text style={styles.inviteBtnText}>Invite</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FAB */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.fab} onPress={() => onNavigate?.('addPassword')}>
          <MaterialIcons name="add" size={20} color={colors.onPrimary} />
          <Text style={styles.fabText}>Add Password</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const CategoryChip = ({ title, icon, count, active, onPress }: any) => (
  <TouchableOpacity style={[styles.chip, active ? styles.chipActive : styles.chipInactive]} onPress={onPress}>
    {icon && <MaterialIcons name={icon} size={14} color={active ? colors.onPrimary : colors.onSurfaceVariant} />}
    <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>{title}</Text>
    <Text style={[styles.chipCount, active ? styles.chipCountActive : styles.chipCountInactive]}>{icon ? count : `(${count})`}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.2)',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(13, 56, 41, 0.2)',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 12, height: 12,
    borderRadius: 6,
    backgroundColor: colors.primaryContainer,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  appBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  appBarSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  appBarSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  appBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(227, 234, 230, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primaryContainer,
  },
  iconButton: {
    width: 36, height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  assuranceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  assuranceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  assuranceIcon: {
    width: 32, height: 32,
    borderRadius: 12,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assuranceTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  assuranceDesc: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  secureBadge: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10,
  },
  secureBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#F3F3EE',
    borderRadius: 12,
    paddingVertical: 12,
    paddingLeft: 40,
    paddingRight: 40,
    fontSize: 14,
    color: colors.onSurface,
  },
  searchIcon: {
    position: 'absolute',
    left: 12, top: 12,
  },
  micIcon: {
    position: 'absolute',
    right: 12, top: 12,
  },
  categoriesScroll: {
    marginBottom: 16,
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
    borderColor: 'rgba(193, 200, 194, 0.3)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.onPrimary,
  },
  chipTextInactive: {
    color: colors.onSurfaceVariant,
  },
  chipCount: {
    fontSize: 10,
  },
  chipCountActive: {
    color: 'rgba(255,255,255,0.7)',
  },
  chipCountInactive: {
    color: colors.outline,
  },
  scopeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scopeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scopeToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  scopeCountBadge: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 10,
  },
  scopeCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onPrimaryFixed,
  },
  privateStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pulseDot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  privateStatusText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  cardsList: {
    gap: 12,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardIconBox: {
    width: 48, height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  cardCategoryPill: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 4,
  },
  cardCategoryText: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  cardUsernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardUsername: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.onSurface,
    fontFamily: 'monospace',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(193, 200, 194, 0.2)',
    marginVertical: 12,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMetadataLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(192, 236, 214, 0.6)',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10,
  },
  ownerBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.onPrimaryFixed,
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  privateBadgeText: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  updatedText: {
    fontSize: 10,
    color: colors.outline,
  },
  authBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(164, 208, 187, 0.4)',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10,
  },
  authBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.onPrimaryFixedVariant,
  },
  inviteTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(227, 234, 230, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    borderRadius: 16,
    padding: 14,
  },
  inviteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inviteIconBox: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  inviteDesc: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  inviteBtn: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  inviteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  fabContainer: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 24,
    elevation: 4,
    shadowColor: colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onPrimary,
  }
});
