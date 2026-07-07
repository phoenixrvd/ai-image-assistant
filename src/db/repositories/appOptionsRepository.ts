import { db } from "../database";
import type { AppOptionEntity, JsonValue, ThemeMode } from "../entities";
import { nowIso } from "../id";

export const appOptionsRepository = {
  async get<T extends JsonValue>(key: string): Promise<T | undefined> {
    const option = await db.appOptions.get(key);
    return option?.value as T | undefined;
  },

  async set(key: string, value: JsonValue): Promise<AppOptionEntity> {
    const option = { key, value, updatedAt: nowIso() };
    await db.appOptions.put(option);
    return option;
  },

  async getTheme(): Promise<ThemeMode> {
    return (await this.get<ThemeMode>("theme")) ?? "system";
  }
};
