import { BLOCK_REGISTRY } from '../blocks/BlockRegistry';
import { TILESET_TILE_UV_SIZE } from '../blocks/tileset';
import { CHUNK_SIZE, type ChunkData } from './ChunkData';

/**
 * Greedy mesher for a single 16³ chunk. Each quad emits 4 fresh vertices
 * + 2 triangles — no vertex sharing across quads, since coalesced quads
 * carry per-face UV ranges spanning multiple cells and sharing would
 * smear UVs.
 *
 * Algorithm: classic Mikola Lysenko greedy mesh. For each axis and each
 * slice plane, build a mask of `(blockId, faceDir)` keys where a face
 * is exposed (one side solid, the other not — or both solid but
 * different ids, in which case BOTH visible faces are emitted via two
 * passes).
 *
 * Air (id 0) and non-solid blocks (door frames) never emit faces and
 * never occlude their neighbors.
 *
 * Per-quad UV: tile from the block's faceUVs origin, scaled by the
 * coalesced quad's (width, height) cell count so each cell-width samples
 * one tile of the atlas. Repeats via `RepeatWrapping` on the texture.
 */

export interface ChunkMesh {
	positions: Float32Array;
	normals: Float32Array;
	uvs: Float32Array;
	indices: Uint32Array;
}

type Axis = 0 | 1 | 2;
type FaceKey = 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz';

interface QuadOut {
	positions: number[];
	normals: number[];
	uvs: number[];
	indices: number[];
	vertexCount: number;
}

function isSolid(id: number): boolean {
	return BLOCK_REGISTRY[id]?.solid === true;
}

/** Pack `(blockId, faceDir)` into a signed int. Sign carries direction:
 *  positive = +axis face, negative = −axis face. 0 = no face. */
function maskKey(id: number, positive: boolean): number {
	if (id === 0 || !isSolid(id)) return 0;
	return positive ? id : -id;
}

export function greedyMesh(chunk: ChunkData): ChunkMesh {
	const out: QuadOut = {
		positions: [],
		normals: [],
		uvs: [],
		indices: [],
		vertexCount: 0,
	};

	for (let axis = 0; axis < 3; axis++) {
		sweepAxis(chunk, axis as Axis, out);
	}

	return {
		positions: new Float32Array(out.positions),
		normals: new Float32Array(out.normals),
		uvs: new Float32Array(out.uvs),
		indices: new Uint32Array(out.indices),
	};
}

/** Read a chunk cell with bounds-clipping (out-of-chunk reads as air). */
function readCell(chunk: ChunkData, x: number, y: number, z: number): number {
	if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) {
		return 0;
	}
	return chunk.get(x, y, z);
}

/** Resolve the cell coordinates on either side of a slice plane. */
function cellsAtSlice(
	axis: Axis,
	u: Axis,
	v: Axis,
	slice: number,
	ui: number,
	vi: number,
): { aCoord: [number, number, number]; bCoord: [number, number, number] } {
	const aCoord: [number, number, number] = [0, 0, 0];
	const bCoord: [number, number, number] = [0, 0, 0];
	aCoord[axis] = slice - 1;
	aCoord[u] = ui;
	aCoord[v] = vi;
	bCoord[axis] = slice;
	bCoord[u] = ui;
	bCoord[v] = vi;
	return { aCoord, bCoord };
}

/** Pass 1: for the cells on the −axis side of the seam, the +axis face
 *  is emitted when the −axis cell is solid and the +axis cell is not,
 *  OR both are solid with different ids. */
function buildPositiveMask(
	chunk: ChunkData,
	axis: Axis,
	u: Axis,
	v: Axis,
	slice: number,
): Int32Array {
	const mask = new Int32Array(CHUNK_SIZE * CHUNK_SIZE);
	for (let vi = 0; vi < CHUNK_SIZE; vi++) {
		for (let ui = 0; ui < CHUNK_SIZE; ui++) {
			const { aCoord, bCoord } = cellsAtSlice(axis, u, v, slice, ui, vi);
			const idA = readCell(chunk, aCoord[0], aCoord[1], aCoord[2]);
			const idB = readCell(chunk, bCoord[0], bCoord[1], bCoord[2]);
			const aSolid = isSolid(idA);
			const bSolid = isSolid(idB);
			if (aSolid && (!bSolid || idA !== idB)) {
				mask[vi * CHUNK_SIZE + ui] = maskKey(idA, true);
			}
		}
	}
	return mask;
}

/** Pass 2: the mirror — −axis face emitted when +axis cell is solid
 *  and −axis cell is not, OR both are solid with different ids. */
function buildNegativeMask(
	chunk: ChunkData,
	axis: Axis,
	u: Axis,
	v: Axis,
	slice: number,
): Int32Array {
	const mask = new Int32Array(CHUNK_SIZE * CHUNK_SIZE);
	for (let vi = 0; vi < CHUNK_SIZE; vi++) {
		for (let ui = 0; ui < CHUNK_SIZE; ui++) {
			const { aCoord, bCoord } = cellsAtSlice(axis, u, v, slice, ui, vi);
			const idA = readCell(chunk, aCoord[0], aCoord[1], aCoord[2]);
			const idB = readCell(chunk, bCoord[0], bCoord[1], bCoord[2]);
			const aSolid = isSolid(idA);
			const bSolid = isSolid(idB);
			if (bSolid && (!aSolid || idA !== idB)) {
				mask[vi * CHUNK_SIZE + ui] = maskKey(idB, false);
			}
		}
	}
	return mask;
}

function sweepAxis(chunk: ChunkData, axis: Axis, out: QuadOut): void {
	const u: Axis = ((axis + 1) % 3) as Axis;
	const v: Axis = ((axis + 2) % 3) as Axis;
	for (let slice = 0; slice <= CHUNK_SIZE; slice++) {
		emitGreedyQuads(buildPositiveMask(chunk, axis, u, v, slice), axis, u, v, slice, out);
		emitGreedyQuads(buildNegativeMask(chunk, axis, u, v, slice), axis, u, v, slice, out);
	}
}

/**
 * Walk the mask in (u, v) order; for each non-zero cell, find the
 * largest rectangle of the same key, emit a quad, zero the rect, repeat.
 */
function emitGreedyQuads(
	mask: Int32Array,
	axis: Axis,
	u: Axis,
	v: Axis,
	slice: number,
	out: QuadOut,
): void {
	for (let vi = 0; vi < CHUNK_SIZE; vi++) {
		let ui = 0;
		while (ui < CHUNK_SIZE) {
			const key = mask[vi * CHUNK_SIZE + ui];
			if (!key) {
				ui++;
				continue;
			}
			const { width, height } = expandRect(mask, ui, vi, key);
			emitQuad(out, axis, u, v, slice, ui, vi, width, height, key);
			zeroRect(mask, ui, vi, width, height);
			ui += width;
		}
	}
}

function expandRect(
	mask: Int32Array,
	ui: number,
	vi: number,
	key: number,
): { width: number; height: number } {
	let width = 1;
	while (ui + width < CHUNK_SIZE && mask[vi * CHUNK_SIZE + ui + width] === key) width++;
	let height = 1;
	outer: while (vi + height < CHUNK_SIZE) {
		for (let k = 0; k < width; k++) {
			if (mask[(vi + height) * CHUNK_SIZE + ui + k] !== key) break outer;
		}
		height++;
	}
	return { width, height };
}

function zeroRect(mask: Int32Array, ui: number, vi: number, width: number, height: number): void {
	for (let dv = 0; dv < height; dv++) {
		for (let du = 0; du < width; du++) {
			mask[(vi + dv) * CHUNK_SIZE + ui + du] = 0;
		}
	}
}

function faceKeyFor(axis: Axis, positive: boolean): FaceKey {
	if (axis === 0) return positive ? 'px' : 'nx';
	if (axis === 1) return positive ? 'py' : 'ny';
	return positive ? 'pz' : 'nz';
}

function emitQuad(
	out: QuadOut,
	axis: Axis,
	uA: Axis,
	vA: Axis,
	slice: number,
	uStart: number,
	vStart: number,
	width: number,
	height: number,
	key: number,
): void {
	const positive = key > 0;
	const id = positive ? key : -key;
	const block = BLOCK_REGISTRY[id];
	if (!block) return;
	const [u0, v0] = block.faceUVs[faceKeyFor(axis, positive)];
	const tile = TILESET_TILE_UV_SIZE;

	const c00 = pos3(axis, uA, vA, slice, uStart, vStart);
	const c10 = pos3(axis, uA, vA, slice, uStart + width, vStart);
	const c11 = pos3(axis, uA, vA, slice, uStart + width, vStart + height);
	const c01 = pos3(axis, uA, vA, slice, uStart, vStart + height);

	const normal: [number, number, number] = [0, 0, 0];
	normal[axis] = positive ? 1 : -1;

	const uv00: [number, number] = [u0, v0];
	const uv10: [number, number] = [u0 + tile * width, v0];
	const uv11: [number, number] = [u0 + tile * width, v0 + tile * height];
	const uv01: [number, number] = [u0, v0 + tile * height];

	const corners = positive ? [c00, c10, c11, c01] : [c00, c01, c11, c10];
	const uvs = positive ? [uv00, uv10, uv11, uv01] : [uv00, uv01, uv11, uv10];
	const base = out.vertexCount;
	for (let i = 0; i < 4; i++) {
		const c = corners[i] as [number, number, number];
		out.positions.push(c[0], c[1], c[2]);
		out.normals.push(normal[0], normal[1], normal[2]);
		const uv = uvs[i] as [number, number];
		out.uvs.push(uv[0], uv[1]);
	}
	out.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
	out.vertexCount += 4;
}

function pos3(
	axis: Axis,
	u: Axis,
	v: Axis,
	slice: number,
	uVal: number,
	vVal: number,
): [number, number, number] {
	const out: [number, number, number] = [0, 0, 0];
	out[axis] = slice;
	out[u] = uVal;
	out[v] = vVal;
	return out;
}
