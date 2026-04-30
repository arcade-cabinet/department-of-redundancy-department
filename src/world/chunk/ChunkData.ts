/**
 * Single chunk of voxel data: 16×16×16 = 4096 cells, each storing a
 * 16-bit block id from `BlockRegistry`. The flat Uint16Array layout
 * matches the `chunks.dirty_blob` save column from spec §8.1, so
 * persistence is just `chunk.toBuffer()` → SQLite blob.
 *
 * Coordinate convention: x = east, y = up, z = south. Index formula:
 *   `(y * CHUNK_SIZE + z) * CHUNK_SIZE + x`
 * — y-major so vertical slabs (carpet floor, ceiling tiles) land in
 * contiguous memory and the greedy mesher's outer loop can iterate
 * them efficiently.
 */

export const CHUNK_SIZE = 16;
export const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE;

export class ChunkData {
	private buf: Uint16Array;
	private _dirty = false;

	constructor() {
		this.buf = new Uint16Array(CHUNK_VOLUME);
	}

	/** Adopt an existing buffer (e.g. from SQLite). Zero-copy: mutations
	 *  through the chunk write back to `buf`, which the persistence layer
	 *  may then re-blob without an intermediate clone. */
	static fromBuffer(buf: Uint16Array): ChunkData {
		if (buf.length !== CHUNK_VOLUME) {
			throw new Error(`ChunkData buffer size ${buf.length} ≠ expected ${CHUNK_VOLUME}`);
		}
		const c = new ChunkData();
		c.buf = buf;
		return c;
	}

	private static index(x: number, y: number, z: number): number {
		if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) {
			throw new RangeError(`chunk coord out of bounds: (${x},${y},${z})`);
		}
		return (y * CHUNK_SIZE + z) * CHUNK_SIZE + x;
	}

	get(x: number, y: number, z: number): number {
		return this.buf[ChunkData.index(x, y, z)] ?? 0;
	}

	set(x: number, y: number, z: number, id: number): void {
		const i = ChunkData.index(x, y, z);
		if (this.buf[i] === id) return; // no-op writes don't dirty
		this.buf[i] = id;
		this._dirty = true;
	}

	get dirty(): boolean {
		return this._dirty;
	}

	markDirty(): void {
		this._dirty = true;
	}

	clearDirty(): void {
		this._dirty = false;
	}

	/** Underlying buffer, suitable for blob persistence. Caller must not
	 *  resize. Mutations bypass the dirty flag — callers wanting that
	 *  should use `set()` per-cell or explicitly `markDirty()` afterward. */
	toBuffer(): Uint16Array {
		return this.buf;
	}
}
