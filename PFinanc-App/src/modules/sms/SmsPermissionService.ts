import { PermissionsAndroid, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { NativeModules } from 'react-native';

const { SmsModule } = NativeModules;

export class SmsPermissionService {
  private static PERMISSION_KEY = 'sms_permission_shown';

  static async hasShownEducationScreen(): Promise<boolean> {
    const value = await SecureStore.getItemAsync(this.PERMISSION_KEY);
    return value === 'true';
  }

  static async markEducationScreenShown(): Promise<void> {
    await SecureStore.setItemAsync(this.PERMISSION_KEY, 'true');
  }

  static async hasSmsPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    
    // Check both standard permission and our native module 
    // Native module handles it explicitly
    if (SmsModule) {
      return await SmsModule.hasSmsPermission();
    }
    
    return (
      (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS)) &&
      (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS))
    );
  }

  static async requestSmsPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        PermissionsAndroid.PERMISSIONS.READ_SMS,
      ]);

      return (
        granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (err) {
      console.warn('Failed to request SMS permission', err);
      return false;
    }
  }

  static async getDeviceId(): Promise<string> {
      if (Platform.OS !== 'android') return 'unknown_device';
      if (SmsModule) {
          return await SmsModule.getDeviceId();
      }
      return 'fallback_device_id_' + Math.random().toString(36).substring(7);
  }
}
