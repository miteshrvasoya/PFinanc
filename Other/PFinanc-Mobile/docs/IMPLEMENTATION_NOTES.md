# Implementation Notes: Stitch HTML to React Native Migration

This document outlines the engineering decisions and challenges overcome during the migration of the PFinanc web application (generated via Google Stitch) into a pure React Native experience.

## 1. Zero-WebView Policy
The strict requirement to avoid `react-native-webview` and `<iframe />` implementations required mapping complex web CSS layouts to Flexbox React Native components.
- **Challenge**: Converting web `grid` (e.g., `grid-cols-3` in the Cash Flow card) to React Native.
- **Solution**: Replaced CSS grid with `flexDirection: 'row'` alongside flex ratios (`flex: 1`) to achieve the exact uniform distribution across devices without using external grid libraries.

## 2. Design System Translation
The original `Tailwind.config` and `DESIGN.md` used specific web scales (`rem`, CSS vars). 
- **Challenge**: Translating Tailwind scales into React Native `StyleSheet` attributes.
- **Solution**: Created a strongly-typed `src/theme` system (`colors.ts`, `typography.ts`, `spacing.ts`) that converts `rem` to numeric React Native pixel densities (e.g., `1rem` = `16px`).

## 3. Expo Router Conflicts
- **Challenge**: The default Expo template initialized with `expo-router`, but the architectural requirements specified standard `@react-navigation/native` with custom entry points.
- **Solution**: 
  - Overrode the `main` entry point in `package.json` to `node_modules/expo/AppEntry.js`.
  - Replaced the App logic with `<NavigationContainer>`.
  - Used an `.env` file containing `EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1` to cleanly override Expo SDK 56's aggressive router validations without polluting the global environment.

## 4. Icons Migration
- **Challenge**: The Stitch layout used `Material Symbols Outlined` via Google Fonts, which does not map cleanly without downloading custom TTF files and mapping unicode glyphs.
- **Solution**: Migrated to `lucide-react-native` which offers a similarly clean, modern geometric icon set but runs completely natively as optimized SVG vectors inside React Native.

## 5. Financial Math Constraints
- **Challenge**: Avoiding floating point precision errors for financial values.
- **Solution**: Designed the `TransactionType` model in `mock/transactions.ts` using strictly `string` for amounts (e.g., `"1450.00"`). The UI layer simply appends the `₹` symbol directly without parsing it through JS floating point operators.
