export class Storage {
  static setSecretKey(secretKey: string): void {
    localStorage.setItem("secretKey", secretKey);
  }

  static getSecretKey(): string | null {
    return localStorage.getItem("secretKey");
  }

  static setRelayUrl(relayUrl: string): void {
    localStorage.setItem("relayUrl", relayUrl);
  }

  static getRelayUrl(): string | null {
    return localStorage.getItem("relayUrl");
  }

  static setPublicKey(pubkey: string): void {
    localStorage.setItem("pubkey", pubkey);
  }

  static getPublicKey(): string | null {
    return localStorage.getItem("pubkey");
  }
}
