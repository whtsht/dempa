export class Storage {
  static setSecretKey(secretKey: string): void {
    localStorage.setItem("secretKey", secretKey);
  }

  static getSecretKey(): string | null {
    return localStorage.getItem("secretKey");
  }

  static removeSecretKey(): void {
    localStorage.removeItem("secretKey");
  }

  static setRelayUrl(relayUrl: string): void {
    localStorage.setItem("relayUrl", relayUrl);
  }

  static getRelayUrl(): string | null {
    return localStorage.getItem("relayUrl");
  }

  static removeRelayUrl(): void {
    localStorage.removeItem("relayUrl");
  }

  static setPublicKey(pubkey: string): void {
    localStorage.setItem("pubkey", pubkey);
  }

  static getPublicKey(): string | null {
    return localStorage.getItem("pubkey");
  }

  static removePublicKey(): void {
    localStorage.removeItem("pubkey");
  }

  static clearUserData(): void {
    this.removeSecretKey();
    this.removePublicKey();
    this.removeRelayUrl();
  }
}
