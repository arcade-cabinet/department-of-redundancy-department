/**
 * Recipe discovery (PRQ-B1, M4) + skill gates (PRQ-B8).
 *
 * The Supply Closet bench from spec §22.2 lets the player combine
 * picked-up resources into placeable structures. Recipes start
 * undiscovered; combining the right ingredients adds them to the
 * recipe book; from then on the radial menu shows the place option.
 *
 * Skill gates: each recipe optionally lists a `tierRequired` (mirrors
 * the threat-tier scale) — placing the structure requires the player
 * to have killed at least one enemy of that tier. Today this is a
 * soft gate (canCraftRecipe returns false); the radial UI would
 * display it grayed out.
 */

export type RecipeSlug =
	| 'placed-stair-block'
	| 'placed-wall-block'
	| 'placed-desk-block'
	| 'placed-terminal';

export interface ResourcePile {
	wood?: number;
	metal?: number;
	paper?: number;
	plastic?: number;
}

export interface Recipe {
	slug: RecipeSlug;
	cost: ResourcePile;
	tierRequired: number; // 0 = no gate
}

export const RECIPES: Readonly<Record<RecipeSlug, Recipe>> = Object.freeze({
	'placed-stair-block': {
		slug: 'placed-stair-block',
		cost: { wood: 4 },
		tierRequired: 0,
	},
	'placed-wall-block': {
		slug: 'placed-wall-block',
		cost: { wood: 2, paper: 1 },
		tierRequired: 0,
	},
	'placed-desk-block': {
		slug: 'placed-desk-block',
		cost: { wood: 6, metal: 1 },
		tierRequired: 1,
	},
	'placed-terminal': {
		slug: 'placed-terminal',
		cost: { metal: 4, plastic: 2 },
		tierRequired: 2,
	},
});

export interface RecipeBook {
	discovered: Set<RecipeSlug>;
}

export function freshRecipeBook(): RecipeBook {
	return { discovered: new Set() };
}

export function discoverRecipe(book: RecipeBook, slug: RecipeSlug): RecipeBook {
	if (book.discovered.has(slug)) return book;
	const next = new Set(book.discovered);
	next.add(slug);
	return { discovered: next };
}

export function knownRecipeSlugs(): readonly string[] {
	return Object.keys(RECIPES);
}

export function canCraftRecipe(
	book: RecipeBook,
	slug: RecipeSlug,
	resources: ResourcePile,
): boolean {
	if (!book.discovered.has(slug)) return false;
	const recipe = RECIPES[slug];
	for (const [k, v] of Object.entries(recipe.cost)) {
		if ((resources[k as keyof ResourcePile] ?? 0) < (v ?? 0)) return false;
	}
	return true;
}
