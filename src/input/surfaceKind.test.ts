import { describe, expect, it } from 'vitest';
import { BLOCK_IDS } from '@/world/blocks/BlockRegistry';
import { classifySurface } from './surfaceKind';

describe('surface classifier', () => {
	it('null hit → null', () => {
		expect(classifySurface(null)).toBeNull();
	});

	it('air voxel → null (no radial action on empty space)', () => {
		expect(classifySurface({ kind: 'voxel', blockId: BLOCK_IDS.air })).toBeNull();
	});

	it('ceiling-tile → null (no radial; spec doesnt define ceiling actions)', () => {
		expect(classifySurface({ kind: 'voxel', blockId: BLOCK_IDS['ceiling-tile'] })).toBeNull();
	});

	it('carpet-floor → floor', () => {
		expect(classifySurface({ kind: 'voxel', blockId: BLOCK_IDS['carpet-floor'] })).toBe('floor');
	});

	it('cubicle-wall + drywall + supply-closet-wall → wall-world', () => {
		expect(classifySurface({ kind: 'voxel', blockId: BLOCK_IDS['cubicle-wall'] })).toBe(
			'wall-world',
		);
		expect(classifySurface({ kind: 'voxel', blockId: BLOCK_IDS.drywall })).toBe('wall-world');
		expect(classifySurface({ kind: 'voxel', blockId: BLOCK_IDS['supply-closet-wall'] })).toBe(
			'wall-world',
		);
	});

	it('placed-wall + placed-stair → wall-placed', () => {
		expect(classifySurface({ kind: 'voxel', blockId: BLOCK_IDS['placed-wall-block'] })).toBe(
			'wall-placed',
		);
		expect(classifySurface({ kind: 'voxel', blockId: BLOCK_IDS['placed-stair-block'] })).toBe(
			'wall-placed',
		);
	});

	it('laminate-desk + placed-desk → desk', () => {
		expect(classifySurface({ kind: 'voxel', blockId: BLOCK_IDS['laminate-desk-block'] })).toBe(
			'desk',
		);
		expect(classifySurface({ kind: 'voxel', blockId: BLOCK_IDS['placed-desk-block'] })).toBe(
			'desk',
		);
	});

	it('placed-terminal → terminal', () => {
		expect(classifySurface({ kind: 'voxel', blockId: BLOCK_IDS['placed-terminal'] })).toBe(
			'terminal',
		);
	});

	it('up-door-frame + down-door-frame → door', () => {
		expect(classifySurface({ kind: 'voxel', blockId: BLOCK_IDS['up-door-frame'] })).toBe('door');
		expect(classifySurface({ kind: 'voxel', blockId: BLOCK_IDS['down-door-frame'] })).toBe('door');
	});

	it('unknown block id → null (defensive)', () => {
		expect(classifySurface({ kind: 'voxel', blockId: 9999 })).toBeNull();
	});

	it('entity hit → uses the tag verbatim', () => {
		expect(classifySurface({ kind: 'entity', tag: 'enemy' })).toBe('enemy');
		expect(classifySurface({ kind: 'entity', tag: 'printer' })).toBe('printer');
		expect(classifySurface({ kind: 'entity', tag: 'door' })).toBe('door');
	});
});
