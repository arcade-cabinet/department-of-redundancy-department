CREATE TABLE `chunks` (
	`floor` integer NOT NULL,
	`chunk_x` integer NOT NULL,
	`chunk_z` integer NOT NULL,
	`dirty_blob` blob NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`floor`, `chunk_x`, `chunk_z`)
);
--> statement-breakpoint
CREATE TABLE `claimed_water_coolers` (
	`floor` integer NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`z` integer NOT NULL,
	`claimed_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`floor`, `x`, `y`, `z`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`slot` integer PRIMARY KEY NOT NULL,
	`item_slug` text NOT NULL,
	`qty` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`floor` integer NOT NULL,
	`ts` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kills` (
	`slug` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`last_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipes_known` (
	`slug` text PRIMARY KEY NOT NULL,
	`discovered_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `placed_structures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`floor` integer NOT NULL,
	`slug` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`z` real NOT NULL,
	`rot` real DEFAULT 0 NOT NULL,
	`hp` integer DEFAULT 100 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `weapons_owned` (
	`slug` text PRIMARY KEY NOT NULL,
	`ammo` integer DEFAULT 0 NOT NULL,
	`unlocked_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `world_meta` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`seed` text NOT NULL,
	`current_floor` integer DEFAULT 1 NOT NULL,
	`threat` real DEFAULT 0 NOT NULL,
	`deaths` integer DEFAULT 0 NOT NULL,
	`kills` integer DEFAULT 0 NOT NULL,
	`played_seconds` integer DEFAULT 0 NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
