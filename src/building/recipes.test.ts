import { describe, expect, it } from 'vitest';
import {
	canCraftRecipe,
	discoverRecipe,
	freshRecipeBook,
	knownRecipeSlugs,
	RECIPES,
	type RecipeSlug,
} from './recipes';

describe('recipe discovery (PRQ-B1)', () => {
	it('fresh book is empty', () => {
		const book = freshRecipeBook();
		expect(book.discovered.size).toBe(0);
	});

	it('discoverRecipe adds a slug', () => {
		let book = freshRecipeBook();
		book = discoverRecipe(book, 'placed-stair-block');
		expect(book.discovered.has('placed-stair-block')).toBe(true);
	});

	it('discovering twice is idempotent', () => {
		let book = freshRecipeBook();
		book = discoverRecipe(book, 'placed-wall-block');
		book = discoverRecipe(book, 'placed-wall-block');
		expect(book.discovered.size).toBe(1);
	});

	it('knownRecipeSlugs lists every defined recipe', () => {
		const slugs = knownRecipeSlugs();
		expect(slugs.length).toBeGreaterThan(0);
		// Every entry must be a known recipe.
		for (const s of slugs) expect(RECIPES[s as RecipeSlug]).toBeDefined();
	});

	it('canCraftRecipe requires the player to have discovered it', () => {
		const book = freshRecipeBook();
		expect(canCraftRecipe(book, 'placed-stair-block', { wood: 4 })).toBe(false);
		const discovered = discoverRecipe(book, 'placed-stair-block');
		// Has discovery + meets cost.
		expect(canCraftRecipe(discovered, 'placed-stair-block', { wood: 4 })).toBe(true);
		// Has discovery + insufficient resources.
		expect(canCraftRecipe(discovered, 'placed-stair-block', { wood: 1 })).toBe(false);
	});
});
