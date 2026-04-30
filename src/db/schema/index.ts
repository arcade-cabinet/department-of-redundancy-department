/**
 * Aggregate exports for drizzle-kit. drizzle.config.ts points at this
 * file (`schema: './src/db/schema/index.ts'`); each table file lives
 * separately for clarity but the codegen pipeline reads them all
 * through this barrel.
 */
export * from './chunks';
export * from './coolers';
export * from './inventory';
export * from './journal';
export * from './kills';
export * from './recipes';
export * from './structures';
export * from './weapons';
export * from './world';
