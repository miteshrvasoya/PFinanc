import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationFinish }) => {
  // Background gradient rings
  const ring1Scale = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0)).current;
  const ring3Scale = useRef(new Animated.Value(0)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const ring3Opacity = useRef(new Animated.Value(0)).current;

  // Logo container
  const logoContainerScale = useRef(new Animated.Value(0.3)).current;
  const logoContainerOpacity = useRef(new Animated.Value(0)).current;

  // Inner logo icon
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;

  // Text animations
  const titleTranslateY = useRef(new Animated.Value(24)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(16)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(10)).current;

  // Bottom details
  const bottomOpacity = useRef(new Animated.Value(0)).current;
  const bottomTranslateY = useRef(new Animated.Value(20)).current;

  // Floating currency symbols
  const float1Y = useRef(new Animated.Value(0)).current;
  const float2Y = useRef(new Animated.Value(0)).current;
  const float3Y = useRef(new Animated.Value(0)).current;
  const float1Opacity = useRef(new Animated.Value(0)).current;
  const float2Opacity = useRef(new Animated.Value(0)).current;
  const float3Opacity = useRef(new Animated.Value(0)).current;

  // Overall fade out at end
  const screenOpacity = useRef(new Animated.Value(1)).current;

  // Shimmer line
  const shimmerX = useRef(new Animated.Value(-width)).current;

  const spin = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    const startAnimation = () => {
      // Phase 1: Rings expand
      Animated.parallel([
        Animated.sequence([
          Animated.delay(0),
          Animated.parallel([
            Animated.spring(ring1Scale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
            Animated.timing(ring1Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(150),
          Animated.parallel([
            Animated.spring(ring2Scale, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }),
            Animated.timing(ring2Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(300),
          Animated.parallel([
            Animated.spring(ring3Scale, { toValue: 1, tension: 35, friction: 7, useNativeDriver: true }),
            Animated.timing(ring3Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          ]),
        ]),
      ]).start();

      // Phase 2: Logo pops in
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.spring(logoContainerScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
          Animated.timing(logoContainerOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        ]),
      ]).start();

      // Phase 3: Icon spin-in
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.spring(iconScale, { toValue: 1, tension: 70, friction: 5, useNativeDriver: true }),
          Animated.timing(iconOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(iconRotate, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      ]).start();

      // Phase 4: Shimmer
      Animated.sequence([
        Animated.delay(600),
        Animated.loop(
          Animated.timing(shimmerX, {
            toValue: width * 2,
            duration: 1200,
            useNativeDriver: true,
          }),
          { iterations: 2 }
        ),
      ]).start();

      // Phase 5: Title
      Animated.sequence([
        Animated.delay(650),
        Animated.parallel([
          Animated.spring(titleTranslateY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
          Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ]).start();

      // Phase 6: Subtitle
      Animated.sequence([
        Animated.delay(800),
        Animated.parallel([
          Animated.spring(subtitleTranslateY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
          Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ]).start();

      // Phase 7: Tagline
      Animated.sequence([
        Animated.delay(1000),
        Animated.parallel([
          Animated.spring(taglineTranslateY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
          Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
      ]).start();

      // Phase 8: Floating coins
      Animated.sequence([
        Animated.delay(900),
        Animated.parallel([
          Animated.timing(float1Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(float2Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(float3Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.loop(
            Animated.sequence([
              Animated.timing(float1Y, { toValue: -12, duration: 1400, useNativeDriver: true }),
              Animated.timing(float1Y, { toValue: 0, duration: 1400, useNativeDriver: true }),
            ])
          ),
          Animated.loop(
            Animated.sequence([
              Animated.timing(float2Y, { toValue: -8, duration: 1800, useNativeDriver: true }),
              Animated.timing(float2Y, { toValue: 0, duration: 1800, useNativeDriver: true }),
            ])
          ),
          Animated.loop(
            Animated.sequence([
              Animated.timing(float3Y, { toValue: -14, duration: 1200, useNativeDriver: true }),
              Animated.timing(float3Y, { toValue: 0, duration: 1200, useNativeDriver: true }),
            ])
          ),
        ]),
      ]).start();

      // Phase 9: Bottom details
      Animated.sequence([
        Animated.delay(1100),
        Animated.parallel([
          Animated.timing(bottomOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.spring(bottomTranslateY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        ]),
      ]).start();

      // Phase 10: Fade out & call onAnimationFinish
      Animated.sequence([
        Animated.delay(2800),
        Animated.timing(screenOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start(() => {
        onAnimationFinish();
      });
    };

    startAnimation();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

      {/* Decorative background rings */}
      <Animated.View style={[styles.ring, styles.ring3, { transform: [{ scale: ring3Scale }], opacity: ring3Opacity }]} />
      <Animated.View style={[styles.ring, styles.ring2, { transform: [{ scale: ring2Scale }], opacity: ring2Opacity }]} />
      <Animated.View style={[styles.ring, styles.ring1, { transform: [{ scale: ring1Scale }], opacity: ring1Opacity }]} />

      {/* Floating ambient orbs */}
      <View style={styles.orbTopRight} />
      <View style={styles.orbBottomLeft} />

      {/* Floating currency tags */}
      <Animated.View style={[styles.floatTag, styles.floatTag1, { transform: [{ translateY: float1Y }], opacity: float1Opacity }]}>
        <Text style={styles.floatTagText}>₹ 850</Text>
      </Animated.View>
      <Animated.View style={[styles.floatTag, styles.floatTag2, { transform: [{ translateY: float2Y }], opacity: float2Opacity }]}>
        <Text style={styles.floatTagText}>+12.4%</Text>
      </Animated.View>
      <Animated.View style={[styles.floatTag, styles.floatTag3, { transform: [{ translateY: float3Y }], opacity: float3Opacity }]}>
        <Text style={styles.floatTagText}>₹ 38L</Text>
      </Animated.View>

      {/* Center content */}
      <View style={styles.center}>
        {/* Logo Container */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: logoContainerScale }],
              opacity: logoContainerOpacity,
            },
          ]}
        >
          {/* Shimmer overlay */}
          <Animated.View
            style={[
              styles.shimmer,
              { transform: [{ translateX: shimmerX }] },
            ]}
          />

          {/* PF Monogram */}
          <Animated.View style={{ transform: [{ scale: iconScale }], opacity: iconOpacity }}>
            <Text style={styles.monogram}>P₹</Text>
          </Animated.View>
        </Animated.View>

        {/* App Name */}
        <Animated.Text
          style={[
            styles.appName,
            {
              transform: [{ translateY: titleTranslateY }],
              opacity: titleOpacity,
            },
          ]}
        >
          PFinanc
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          style={[
            styles.subtitle,
            {
              transform: [{ translateY: subtitleTranslateY }],
              opacity: subtitleOpacity,
            },
          ]}
        >
          Family Wealth Command Center
        </Animated.Text>

        {/* Tagline */}
        <Animated.View
          style={[
            styles.taglineContainer,
            {
              transform: [{ translateY: taglineTranslateY }],
              opacity: taglineOpacity,
            },
          ]}
        >
          <View style={styles.taglineDot} />
          <Text style={styles.tagline}>Smart • Secure • Family-First</Text>
          <View style={styles.taglineDot} />
        </Animated.View>
      </View>

      {/* Bottom section */}
      <Animated.View
        style={[
          styles.bottomSection,
          {
            opacity: bottomOpacity,
            transform: [{ translateY: bottomTranslateY }],
          },
        ]}
      >
        <View style={styles.featureRow}>
          <View style={styles.featurePill}>
            <Text style={styles.featurePillIcon}>🔐</Text>
            <Text style={styles.featurePillText}>Encrypted</Text>
          </View>
          <View style={styles.featurePill}>
            <Text style={styles.featurePillIcon}>🤖</Text>
            <Text style={styles.featurePillText}>AI Powered</Text>
          </View>
          <View style={styles.featurePill}>
            <Text style={styles.featurePillIcon}>👨‍👩‍👧</Text>
            <Text style={styles.featurePillText}>Family Hub</Text>
          </View>
        </View>
        <Text style={styles.versionText}>v1.0 · PFinanc Technologies</Text>
      </Animated.View>
    </Animated.View>
  );
};

const RING_CENTER_SIZE = 160;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Decorative rings
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'center',
  },
  ring1: {
    width: RING_CENTER_SIZE + 80,
    height: RING_CENTER_SIZE + 80,
    borderColor: 'rgba(192, 236, 214, 0.2)',
    backgroundColor: 'rgba(192, 236, 214, 0.05)',
  },
  ring2: {
    width: RING_CENTER_SIZE + 180,
    height: RING_CENTER_SIZE + 180,
    borderColor: 'rgba(192, 236, 214, 0.12)',
    backgroundColor: 'transparent',
  },
  ring3: {
    width: RING_CENTER_SIZE + 300,
    height: RING_CENTER_SIZE + 300,
    borderColor: 'rgba(192, 236, 214, 0.07)',
    backgroundColor: 'transparent',
  },
  // Ambient orbs
  orbTopRight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(13, 56, 41, 0.6)',
  },
  orbBottomLeft: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(20, 52, 71, 0.5)',
  },
  // Floating tags
  floatTag: {
    position: 'absolute',
    backgroundColor: 'rgba(192, 236, 214, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(192, 236, 214, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  floatTag1: {
    top: height * 0.2,
    left: 28,
  },
  floatTag2: {
    top: height * 0.3,
    right: 24,
  },
  floatTag3: {
    top: height * 0.55,
    left: 36,
  },
  floatTagText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: 'rgba(192, 236, 214, 0.85)',
  },
  // Center
  center: {
    alignItems: 'center',
    zIndex: 10,
  },
  // Logo hexagonal container
  logoContainer: {
    width: RING_CENTER_SIZE,
    height: RING_CENTER_SIZE,
    borderRadius: 36,
    backgroundColor: 'rgba(192, 236, 214, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(192, 236, 214, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    overflow: 'hidden',
    shadowColor: '#c0ecd6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 80,
    height: RING_CENTER_SIZE,
    backgroundColor: 'rgba(255,255,255,0.1)',
    transform: [{ skewX: '-20deg' }],
  },
  monogram: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 52,
    color: colors.primaryFixed,
    letterSpacing: -2,
  },
  // Text
  appName: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 42,
    color: colors.primaryFixed,
    letterSpacing: -1.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: 'rgba(192, 236, 214, 0.75)',
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  taglineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taglineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(192, 236, 214, 0.4)',
  },
  tagline: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: 'rgba(192, 236, 214, 0.55)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  // Bottom
  bottomSection: {
    position: 'absolute',
    bottom: 52,
    alignItems: 'center',
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 10,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(192, 236, 214, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192, 236, 214, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  featurePillIcon: {
    fontSize: 12,
  },
  featurePillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: 'rgba(192, 236, 214, 0.7)',
  },
  versionText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(192, 236, 214, 0.35)',
    letterSpacing: 0.3,
  },
});
