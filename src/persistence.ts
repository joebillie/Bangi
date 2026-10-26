import { restore, Settings } from "./settings";
export const SETTINGS_KEY = "bangi:settings:v1";
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
}
export class PreferencesRepository {
  private writes: Promise<unknown> = Promise.resolve();
  constructor(private storage: StorageAdapter) {}
  async load() {
    return restore(await this.storage.getItem(SETTINGS_KEY));
  }
  save(settings: Settings) {
    const snapshot = JSON.stringify(settings);
    const result = this.writes.then(() =>
      this.storage.setItem(SETTINGS_KEY, snapshot),
    );
    this.writes = result.catch(() => {});
    return result;
  }
}
