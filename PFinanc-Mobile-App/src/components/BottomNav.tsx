import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

type Tab = 'home' | 'history' | 'portfolio' | 'more';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onQuickAddPress: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, onQuickAddPress }) => {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <BlurView intensity={85} tint="light" style={styles.navBar}>
        <View style={styles.navBarInner}>
          {/* Home */}
          <Pressable 
            style={({ pressed }) => [
              activeTab === 'home' ? styles.activeTab : styles.inactiveTab, 
              pressed && styles.pressed
            ]}
            onPress={() => onTabChange('home')}
          >
            <MaterialIcons 
              name="home" 
              size={activeTab === 'home' ? 20 : 22} 
              color={activeTab === 'home' ? colors.onPrimary : '#506359'} 
            />
            {activeTab === 'home' && <Text style={styles.activeTabText}>Home</Text>}
          </Pressable>

          {/* History */}
          <Pressable 
            style={({ pressed }) => [
              activeTab === 'history' ? styles.activeTab : styles.inactiveTab, 
              pressed && styles.pressed
            ]}
            onPress={() => onTabChange('history')}
          >
            <MaterialIcons 
              name="receipt-long" 
              size={activeTab === 'history' ? 20 : 22} 
              color={activeTab === 'history' ? colors.onPrimary : '#506359'} 
            />
            {activeTab === 'history' && <Text style={styles.activeTabText}>History</Text>}
          </Pressable>

          {/* Quick Add FAB */}
          <View style={styles.fabContainer}>
            <Pressable 
              style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
              onPress={onQuickAddPress}
            >
              <MaterialIcons name="add" size={24} color={colors.onPrimary} />
            </Pressable>
          </View>

          {/* Portfolio */}
          <Pressable 
            style={({ pressed }) => [
              activeTab === 'portfolio' ? styles.activeTab : styles.inactiveTab, 
              pressed && styles.pressed
            ]}
            onPress={() => onTabChange('portfolio')}
          >
            <MaterialIcons 
              name="trending-up" 
              size={activeTab === 'portfolio' ? 20 : 22} 
              color={activeTab === 'portfolio' ? colors.onPrimary : '#506359'} 
            />
            {activeTab === 'portfolio' && <Text style={styles.activeTabText}>Portfolio</Text>}
          </Pressable>

          {/* More */}
          <Pressable 
            style={({ pressed }) => [
              activeTab === 'more' ? styles.activeTab : styles.inactiveTab, 
              pressed && styles.pressed
            ]}
            onPress={() => onTabChange('more')}
          >
            <MaterialIcons 
              name="more-horiz" 
              size={activeTab === 'more' ? 20 : 22} 
              color={activeTab === 'more' ? colors.onPrimary : '#506359'} 
            />
            {activeTab === 'more' && <Text style={styles.activeTabText}>More</Text>}
          </Pressable>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    alignItems: 'center',
    zIndex: 40,
  },
  navBar: {
    width: '100%',
    maxWidth: 370,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(27, 61, 47, 0.1)',
    shadowColor: 'rgba(11, 28, 21, 0.14)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 10,
  },
  navBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  activeTab: {
    backgroundColor: '#0d3829', // primaryContainer
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
  },
  activeTabText: {
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.04 * 12,
  },
  inactiveTab: {
    padding: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabContainer: {
    marginTop: -24,
    marginBottom: -12,
  },
  fab: {
    width: 48,
    height: 48,
    backgroundColor: '#0d3829',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#f4fbf7', // surface color
    shadowColor: 'rgba(13, 56, 41, 0.35)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
