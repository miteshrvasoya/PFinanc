import CryptoJS from 'crypto-js';

export class VaultCrypto {
  /**
   * Generates a 256-bit encryption key from a user's master password/PIN
   */
  static deriveKey(masterPin: string, salt: string): string {
    // PBKDF2 with SHA256, 10000 iterations, 256-bit key length
    const key = CryptoJS.PBKDF2(masterPin, salt, {
      keySize: 256 / 32,
      iterations: 10000,
      hasher: CryptoJS.algo.SHA256
    });
    return key.toString(CryptoJS.enc.Hex);
  }

  /**
   * Encrypts data using AES (AES-CBC with HMAC simulated GCM)
   */
  static encryptData(plaintext: string, keyHex: string): { ciphertext: string, iv: string, authTag: string } {
    const key = CryptoJS.enc.Hex.parse(keyHex);
    const iv = CryptoJS.lib.WordArray.random(128 / 8);

    const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    const hmac = CryptoJS.HmacSHA256(encrypted.ciphertext, key);

    return {
      ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
      iv: iv.toString(CryptoJS.enc.Hex),
      authTag: hmac.toString(CryptoJS.enc.Hex)
    };
  }

  /**
   * Decrypts AES data.
   */
  static decryptData(ciphertextBase64: string, keyHex: string, ivHex: string, authTagHex: string): string {
    const key = CryptoJS.enc.Hex.parse(keyHex);
    const iv = CryptoJS.enc.Hex.parse(ivHex);

    const ciphertextWordArray = CryptoJS.enc.Base64.parse(ciphertextBase64);
    const expectedHmac = CryptoJS.HmacSHA256(ciphertextWordArray, key).toString(CryptoJS.enc.Hex);
    
    if (expectedHmac !== authTagHex) {
      throw new Error("Integrity check failed: Data may have been tampered with.");
    }

    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertextWordArray } as CryptoJS.lib.CipherParams,
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );

    return decrypted.toString(CryptoJS.enc.Utf8);
  }
}
