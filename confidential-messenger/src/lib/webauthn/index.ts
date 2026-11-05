export function getPlatformInfo() {
  return { platform: 'unknown', biometricType: 'none', label: 'Unlock with Passkey' };
}
export function generateChallenge() {
  return Math.random().toString(36).substring(2, 38);
}
