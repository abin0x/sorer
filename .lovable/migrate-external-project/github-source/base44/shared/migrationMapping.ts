// Re-export barrel — keeps existing imports working after the split into
// migrationCleaning, migrationTemplates, and migrationTransform.
export * from './migrationCleaning.ts';
export * from './migrationTemplates.ts';
export * from './migrationTransform.ts';