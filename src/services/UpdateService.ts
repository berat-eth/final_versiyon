// Lightweight OTA update helper using expo-updates (if available)
// Safe to import in non-Expo environments; uses dynamic import

export class UpdateService {
  static async checkAndApply(onEvent?: (event: string) => void): Promise<void> {
    try {
      // Geliştirme ortamında kapalı
      if (__DEV__) return;

      // Dynamically import to avoid bundling errors when not available
      // @ts-ignore
      const mod: any = await import('expo-updates').catch(() => null);
      if (!mod) {
        return; // Paket mevcut değilse sessizce çık
      }
      const Updates: any = (mod as any)?.default ?? mod;

      if (!Updates || typeof Updates.checkForUpdateAsync !== 'function') {
        return;
      }

      onEvent?.('checking');
      const update = await Updates.checkForUpdateAsync();
      if (update?.isAvailable) {
        onEvent?.('downloading');
        await Updates.fetchUpdateAsync();
        onEvent?.('reloading');
        await Updates.reloadAsync();
      } else {
        onEvent?.('up-to-date');
      }
    } catch (error) {
      // Silently ignore if Updates not configured or any error happens
      onEvent?.('error');
    }
  }

  static async checkOnLaunch(): Promise<void> {
    // Fire-and-forget on launch; avoid blocking UI
    try {
      await this.checkAndApply();
    } catch {}
  }
}

export default UpdateService;


