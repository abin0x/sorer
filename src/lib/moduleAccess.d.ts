export function canonicalModuleKey(key: string): string;
export function moduleHasAccess(record: any, now?: Date): boolean;
export function tenantModuleHasAccess(club: any, modules: any[], key: string): boolean;
export function moduleRecord(modules: any[], key: string): any;
export function baseSubscriptionHasAccess(club: any, now?: Date): boolean;
