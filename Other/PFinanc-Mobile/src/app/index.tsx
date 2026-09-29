/**
 * App entry — redirects to login screen.
 */
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/login" />;
}
