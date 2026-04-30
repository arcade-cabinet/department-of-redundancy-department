import { describe, expect, it } from 'vitest';
import {
	exportSaveBlob,
	importSaveBlob,
	isValidSaveBlob,
	SAVE_BLOB_VERSION,
	type SaveBlob,
} from './saveBlob';

const sample: SaveBlob = {
	version: SAVE_BLOB_VERSION,
	worldSeed: 'test-seed',
	currentFloor: 3,
	threat: 4.5,
	kills: 12,
	deaths: 1,
	playedSeconds: 300,
	defeatedFloors: [5],
	checksum: '',
};

describe('save blob round-trip (PRQ-RC2)', () => {
	it('exports a JSON string with checksum', () => {
		const json = exportSaveBlob(sample);
		const parsed = JSON.parse(json) as SaveBlob;
		expect(parsed.checksum.length).toBeGreaterThan(0);
		expect(parsed.worldSeed).toBe('test-seed');
	});

	it('imports an exported blob', () => {
		const json = exportSaveBlob(sample);
		const restored = importSaveBlob(json);
		expect(restored).not.toBeNull();
		if (!restored) return;
		expect(restored.worldSeed).toBe(sample.worldSeed);
		expect(restored.currentFloor).toBe(sample.currentFloor);
	});

	it('returns null on corrupted JSON', () => {
		expect(importSaveBlob('not-json')).toBeNull();
	});

	it('returns null on tampered checksum', () => {
		const json = exportSaveBlob(sample);
		const tampered = json.replace(/"kills":12/, '"kills":999');
		expect(importSaveBlob(tampered)).toBeNull();
	});

	it('returns null on wrong version', () => {
		const wrong = { ...sample, version: SAVE_BLOB_VERSION + 999 };
		const json = exportSaveBlob(wrong);
		expect(importSaveBlob(json)).toBeNull();
	});

	it('isValidSaveBlob rejects null + missing fields', () => {
		expect(isValidSaveBlob(null)).toBe(false);
		expect(isValidSaveBlob({})).toBe(false);
		expect(isValidSaveBlob({ version: 1, worldSeed: 'x' })).toBe(false);
	});
});
