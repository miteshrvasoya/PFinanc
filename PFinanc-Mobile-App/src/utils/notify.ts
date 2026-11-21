import { Alert } from 'react-native';

/** Placeholder feedback for actions whose backend flow isn't built yet, so no tap is ever silent. */
export const comingSoon = (feature: string) =>
  Alert.alert(feature, 'This action is coming soon.');
