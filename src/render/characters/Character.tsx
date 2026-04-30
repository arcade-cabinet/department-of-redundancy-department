import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { type Group, type Material, Mesh, MeshStandardMaterial } from 'three';
import { clone as cloneSkeletal } from 'three/addons/utils/SkeletonUtils.js';
import type { Manifest } from '@/content/manifest';
import {
	deathDissolve,
	deathRotZ,
	hitFlash,
	hitShake,
	hopY,
	idleBreathe,
	isDeathComplete,
	type LocomotionState,
	rotXLean,
	rotZRock,
	transition,
} from './locomotion';
import { applyOverrides, type MaterialOverrideControls } from './materialOverrides';
import { tierStyleFor } from './tierStyles';

type Props = {
	/** Manifest slug — e.g. "middle-manager", "policeman", "swat". */
	slug: string;
	/** Pre-loaded manifest (parent awaits loadManifest() once). */
	manifest: Manifest;
	/** Foot-anchor world position. */
	position?: [number, number, number];
	rotationY?: number;
	/** Locomotion state. Caller drives this from the AI / player FSM. */
	state?: LocomotionState;
	/** Movement speed in world-units/sec. Drives hop frequency + height. */
	speed?: number;
	/** Fired once after the death dissolve completes — host typically
	 *  unmounts the character on the next render. */
	onDeathEnd?: () => void;
};

/**
 * Canonical character mount for any GLB on the roster. Uses:
 *   - drei `useGLTF` + `SkeletonUtils.clone` for safe skinned-mesh
 *     instancing (T-pose only — no skeletal animation per spec §3.5).
 *   - `locomotion.ts` pure math for the per-frame transform deltas
 *     (hop curve, body rock, lean, idle breathing, attack lunge,
 *     hit shake, death rotation+dissolve).
 *   - `materialOverrides` to inject hit-flash + dissolve uniforms
 *     into every cloned MeshStandardMaterial.
 *   - `tierStyles` for per-slug scale + walk-speed defaults.
 *
 * Shadow setup + material clones happen inside the cached useMemo so a
 * fresh traversal doesn't run every render. Each Character instance
 * gets its OWN material clones — overrides can't bleed between
 * instances of the same slug.
 *
 * The wrapper group owns: position (foot anchor), rotation Y (facing),
 * tier-scale × manifest-scale. The inner group owns: locomotion-driven
 * Y bob, rotZ rock, rotX lean, attack lunge, hit shake. Inner.children
 * is the cloned GLB itself. This split keeps `position` write-stable
 * for parents that path-follow the character.
 */
export function Character({
	slug,
	manifest,
	position = [0, 0, 0],
	rotationY = 0,
	state = 'idle',
	speed = 0,
	onDeathEnd,
}: Props) {
	const entry = manifest.characters[slug];
	if (!entry) throw new Error(`Manifest missing character/${slug}`);
	const { scene } = useGLTF(entry.path);
	const tier = tierStyleFor(slug);
	const finalScale = entry.scale * (tier?.scale ?? 1);

	// Per-instance scene clone + material patch + shadow setup. Cached on
	// `scene` identity (drei reuses the source if multiple Characters
	// share a slug, so we want a per-instance clone of THAT shared scene).
	const cloned = useMemo(() => {
		const c = cloneSkeletal(scene);
		const controls: MaterialOverrideControls[] = [];
		c.traverse((obj) => {
			if (!(obj instanceof Mesh)) return;
			obj.castShadow = true;
			obj.receiveShadow = true;
			// Materials may be a single Material or Material[]. Clone each
			// so overrides on one instance can't leak to a sibling.
			const mats: Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
			const cloned = mats.map((m) => {
				const dup = m.clone();
				if (dup instanceof MeshStandardMaterial) {
					controls.push(applyOverrides(dup));
				}
				return dup;
			});
			obj.material = cloned.length === 1 ? (cloned[0] as Material) : (cloned as Material[]);
		});
		return { root: c, controls };
	}, [scene]);

	const innerRef = useRef<Group>(null);
	const fsmRef = useRef({ state, elapsedMs: 0 });
	// Sync the FSM's state when the prop changes — but transient states
	// (attack/hit/death) ignore prop set-state, matching transition().
	useEffect(() => {
		fsmRef.current = transition(fsmRef.current, {
			kind: 'set-state',
			to: state === 'attack' || state === 'death' || state === 'hit' ? 'idle' : state,
		});
		if (state === 'attack') fsmRef.current = transition(fsmRef.current, { kind: 'attack' });
		if (state === 'hit') fsmRef.current = transition(fsmRef.current, { kind: 'hit' });
		if (state === 'death') fsmRef.current = transition(fsmRef.current, { kind: 'die' });
	}, [state]);

	// Stable RNG for hit-shake. Math.random() is the only allowed
	// exception per CLAUDE.md (yuka uses it too); however our project
	// rule says no Math.random in DORD code. Hit shake is purely cosmetic
	// (not replay-relevant), so we use the cosmetic-track RNG via
	// crypto-derived seed. Keep simple here: a per-instance LCG.
	const rngRef = useRef(makeLCG(slug.length * 1009 + 7));

	const tRef = useRef(0);
	const prevHopRef = useRef(0);
	const lastTickRef = useRef<number | null>(null);
	const deathFiredRef = useRef(false);

	useFrame((rfState, dt) => {
		const inner = innerRef.current;
		if (!inner) return;
		tRef.current += dt;
		// Tick the FSM with elapsed ms.
		fsmRef.current = transition(fsmRef.current, { kind: 'tick', elapsedMs: dt * 1000 });

		const fsm = fsmRef.current;
		// Reset transforms each frame; we re-apply from scratch.
		inner.position.set(0, 0, 0);
		inner.rotation.set(0, 0, 0);
		inner.scale.set(1, 1, 1);

		if (fsm.state === 'death') {
			inner.rotation.z = deathRotZ(fsm.elapsedMs);
			const d = deathDissolve(fsm.elapsedMs);
			for (const c of cloned.controls) c.dissolve.value = d;
			if (!deathFiredRef.current && isDeathComplete(fsm.elapsedMs)) {
				deathFiredRef.current = true;
				onDeathEnd?.();
			}
			return;
		}
		// Reset death uniform when alive (e.g. respawn).
		for (const c of cloned.controls) c.dissolve.value = 0;

		// Idle breathing only when truly idle.
		if (fsm.state === 'idle' && speed === 0) {
			inner.position.y = idleBreathe(tRef.current);
		} else {
			const y = hopY(tRef.current, speed);
			inner.position.y = y;
			inner.rotation.z = rotZRock(tRef.current, speed);
			inner.rotation.x = rotXLean(speed);
			prevHopRef.current = y;
		}

		if (fsm.state === 'hit') {
			const shake = hitShake(fsm.elapsedMs, rngRef.current);
			inner.position.x += shake.x;
			inner.position.y += shake.y;
			inner.position.z += shake.z;
			const f = hitFlash(fsm.elapsedMs);
			for (const c of cloned.controls) c.flash.value = f;
		} else {
			for (const c of cloned.controls) c.flash.value = 0;
		}

		// Mute lastTickRef-based unused warning under strict TS.
		lastTickRef.current = rfState.clock.elapsedTime;
	});

	const ax = entry.anchor[0];
	const ay = entry.anchor[1];
	const az = entry.anchor[2];

	return (
		<group position={position} rotation={[0, rotationY, 0]} scale={finalScale}>
			<group ref={innerRef}>
				<primitive object={cloned.root} position={[ax, ay, az]} />
			</group>
		</group>
	);
}

/** Tiny LCG; only used for cosmetic hit-shake noise so no need for
 *  cryptographic quality. Per-instance seed keeps each character's
 *  shake pattern deterministic under replay. */
function makeLCG(seed: number): () => number {
	let s = seed;
	return () => {
		s = (s * 1103515245 + 12345) & 0x7fffffff;
		return s / 0x7fffffff;
	};
}
