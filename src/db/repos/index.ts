/**
 * Typed CRUD repositories for every persisted table. Spec §8.1 + plan
 * note: "No raw SQL outside repos." The runtime gets the drizzle
 * handle from `getDb()` (src/db/client.ts) and passes it to whichever
 * repo it needs.
 *
 * Why pass the handle instead of importing `getDb()` here: tests
 * (src/db/repos/*.test.ts) construct an in-memory sql.js DB directly,
 * skipping the dispatcher's Capacitor probe — the repo functions stay
 * pure and adapter-agnostic.
 */

export * as chunks from './chunks';
export * as coolers from './coolers';
export * as inventory from './inventory';
export * as journal from './journal';
export * as kills from './kills';
export * as recipes from './recipes';
export * as structures from './structures';
export * as weapons from './weapons';
export * as world from './world';
