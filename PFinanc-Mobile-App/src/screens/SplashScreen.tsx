import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

interface SplashScreenProps {
  onAnimationFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationFinish }) => {
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(16)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(350),
        Animated.parallel([
          Animated.timing(textOpacity, { toValue: 1, duration: 450, easing: ease, useNativeDriver: true }),
          Animated.timing(textY, { toValue: 0, duration: 450, easing: ease, useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(footerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(progress, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();

    const finish = Animated.sequence([
      Animated.delay(2200),
      Animated.timing(screenOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]);
    finish.start(({ finished }) => { if (finished) onAnimationFinish(); });

    return () => { loop.stop(); finish.stop(); };
  }, []);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });
  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[colors.primaryContainer, colors.primary, '#00110b']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />

      <View style={styles.center}>
        <View style={styles.logoWrap}>
          <Animated.View style={[styles.pulseRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
          <Animated.View style={[styles.logo, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
            <Text style={styles.monogram}>P₹</Text>
          </Animated.View>
        </View>

        <Animated.View style={{ alignItems: 'center', opacity: textOpacity, transform: [{ translateY: textY }] }}>
          <Text style={styles.appName}>PFinanc</Text>
          <Text style={styles.tagline}>Your family's wealth, in one place</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
        <View style={styles.track}>
          <Animated.View style={[styles.bar, { width: barWidth }]} />
        </View>
        <Text style={styles.footerText}>Secure • Private • AI-powered</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  orbTop: {
    position: 'absolute', top: -90, right: -90, width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(192, 236, 214, 0.07)',
  },
  orbBottom: {
    position: 'absolute', bottom: -120, left: -100, width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(172, 202, 227, 0.06)',
  },
  logoWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  pulseRing: {
    position: 'absolute', width: 96, height: 96, borderRadius: 32,
    borderWidth: 2, borderColor: colors.primaryFixed,
  },
  logo: {
    width: 96, height: 96, borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(192,236,214,0.4)',
  },
  monogram: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 38, color: colors.primaryFixed },
  appName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 38, color: colors.onPrimary, letterSpacing: -1 },
  tagline: { fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.onPrimaryContainer, marginTop: 8 },
  footer: { alignItems: 'center', paddingBottom: 48, gap: 14 },
  track: { width: 120, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: colors.primaryFixed, borderRadius: 2 },
  footerText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.6 },
});
