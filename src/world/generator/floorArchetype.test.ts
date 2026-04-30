import { describe, expect, it } from 'vitest';
import { type FloorArchetype, floorArchetypeFor, knownFloorArchetypes } from './floorArchetype';

describe('floor archetypes (PRQ-B2)', () => {
	it('floor 1 is open-plan', () => {
		expect(floorArchetypeFor(1)).toBe('open-plan');
	});

	it('cycles through 4 archetypes deterministically', () => {
		const archetypes: FloorArchetype[] = [];
		for (let i = 1; i <= 8; i++) archetypes.push(floorArchetypeFor(i));
		// 4-element cycle: open-plan / executive-corridor / basement / break-room
		expect(archetypes).toEqual([
			'open-plan',
			'executive-corridor',
			'basement',
			'break-room',
			'open-plan',
			'executive-corridor',
			'basement',
			'break-room',
		]);
	});

	it('knownFloorArchetypes lists all 4', () => {
		expect(knownFloorArchetypes()).toEqual([
			'open-plan',
			'executive-corridor',
			'basement',
			'break-room',
		]);
	});
});
