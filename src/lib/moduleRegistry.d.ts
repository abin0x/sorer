export const CORE_MODULE: string;
export const ADDON_MODULES: string[];
export const MODULE_KEYS: string[];
export const MODULE_ALIASES: Record<string, string>;
export function normalizeModuleKey(key: string): string;
export const MODULE_PAGES: Record<string, string[]>;
export const MODULE_ENTITIES: Record<string, string[]>;
export function moduleForEntity(name: string): string | null;
export function moduleForAction(name: string): string | null;
