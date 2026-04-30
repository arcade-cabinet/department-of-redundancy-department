import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { PlayerKinematic, type PlayerKinematicHandle } from '@/ai/core/PlayerKinematic';
import { HrReaperEntity, type HrReaperHandle } from '@/ai/enemies/HrReaperEntity';
import { MiddleManagerEntity } from '@/ai/enemies/MiddleManagerEntity';
import { pickSpawnSet } from '@/ai/enemies/spawnDirector';
import { planSpawns } from '@/ai/enemies/spawner';
import { useNavMesh } from '@/ai/navmesh/useNavMesh';
import { AttachListener } from '@/audio/AttachListener';
import { audioCues } from '@/audio/cues';
import { globalAudio } from '@/audio/GlobalAudio';
import { wireAudioCues } from '@/audio/wireCues';
import { place } from '@/building/place';
import { radialIdToSlug } from '@/building/radialAction';
import { clearAll, freshDebuffSet } from '@/combat/debuffs';
import { type EnemyKillSlug, IDLE_DECAY_PER_SECOND, KILL_DELTAS } from '@/combat/threat';
import { loadManifest, type Manifest } from '@/content/manifest';
import { loadWeapons, type Weapon } from '@/content/weapons';
import {
	currentAmmo,
	currentWeaponSlug,
	type Equipped,
	freshEquipped,
	selectSlot,
	setSlot,
} from '@/ecs/components/Equipped';
import {
	applyDamage,
	freshHealth,
	type Health,
	isDead,
	PLAYER_MAX_HP,
	tickDamageFlash,
} from '@/ecs/components/Health';
import { PauseProvider } from '@/ecs/PauseContext';
import { subscribeKeyboard } from '@/input/desktopFallback';
import type { GestureEvent } from '@/input/gesture';
import { InputCanvas } from '@/input/InputCanvas';
import { PlayerCamera } from '@/render/camera/PlayerCamera';
import { Lighting } from '@/render/lighting/Lighting';
import { Door } from '@/render/stairwells/Door';
import { Transition } from '@/render/stairwells/Transition';
import { NavMeshViz, useNavMeshVizFlag } from '@/render/world/NavMeshViz';
import { PathViz, usePathVizFlag } from '@/render/world/PathViz';
import { World } from '@/render/world/World';
import { AmmoCounter } from '@/ui/chrome/AmmoCounter';
import { Crosshair } from '@/ui/chrome/Crosshair';
import { FloorStamp } from '@/ui/chrome/FloorStamp';
import { HpBar } from '@/ui/chrome/HpBar';
import { ThreatStrip } from '@/ui/chrome/ThreatStrip';
import { WeaponIcon } from '@/ui/chrome/WeaponIcon';
import { RadialMenu } from '@/ui/radial/RadialMenu';
import { DrawCallHUD, useDrawCallHUDFlag } from '@/verify/DrawCallHUD';
import { isBossFloor, shouldLockUpDoor } from '@/world/floor/bossGate';
import { routeTap } from '@/world/floor/floorRouter';
import { useFloorState } from '@/world/floor/useFloorState';
import { generateFloor } from '@/world/generator/floor';
import { createRng, freshSeed } from '@/world/generator/rng';
import { GameOver } from './GameOver';
import { PauseMenu } from './PauseMenu';

type Props = { onExit: () => void };

export function Game({ onExit }: Props) {
	const [manifest, setManifest] = useState<Manifest | null>(null);
	const [manifestError, setManifestError] = useState<string | null>(null);
	const [paused, setPaused] = useState(false);
	const [radialAnchor, setRadialAnchor] = useState<{ x: number; y: number } | null>(null);
	const showHUD = useDrawCallHUDFlag();
	const showNavMeshViz = useNavMeshVizFlag();
	const showPathViz = usePathVizFlag();
	const playerRef = useRef<PlayerKinematicHandle>(null);
	const [pathWaypoints, setPathWaypoints] = useState<readonly import('yuka').Vector3[]>([]);
	const [playerHealth, setPlayerHealth] = useState<Health>(() => freshHealth(PLAYER_MAX_HP));
	const [gameOver, setGameOver] = useState(false);
	const [killCount, setKillCount] = useState(0);
	const [threat, setThreat] = useState(0);
	const [playedSeconds, setPlayedSeconds] = useState(0);
	useEffect(() => {
		if (paused || gameOver) return;
		const id = setInterval(() => setPlayedSeconds((s) => s + 1), 1000);
		return () => clearInterval(id);
	}, [paused, gameOver]);
	// Idle decay: tick threat down at 0.05/min while not paused / dead.
	useEffect(() => {
		if (paused || gameOver) return;
		const id = setInterval(() => {
			setThreat((t) => Math.max(0, t - IDLE_DECAY_PER_SECOND));
		}, 1000);
		return () => clearInterval(id);
	}, [paused, gameOver]);
	const [equipped, setEquipped] = useState<Equipped>(() => {
		// Default loadout: stapler in slot 0 (unlimited), three-hole-punch
		// in slot 1 (10 starting ammo). PRQ-04 will load this from
		// world_meta/weapons_owned on continue.
		const e = setSlot(freshEquipped(), 0, 'stapler', -1);
		return setSlot(e, 1, 'three-hole-punch', 10);
	});
	const [weapons, setWeapons] = useState<Map<string, Weapon> | null>(null);
	useEffect(() => {
		loadWeapons()
			.then(setWeapons)
			.catch((e: unknown) => console.error('weapons load:', e));
	}, []);
	// Tick the player damage flash timer down each frame.
	useEffect(() => {
		if (playerHealth.damageFlashTimer === 0) return;
		const id = setInterval(() => {
			setPlayerHealth((h) => tickDamageFlash(h, 16));
		}, 16);
		return () => clearInterval(id);
	}, [playerHealth.damageFlashTimer]);
	// Per spec §8.5: world_seed lives in @capacitor/preferences. PRQ-04 wires
	// the persisted seed. For PRQ-02 we use a stable demo seed so the camera
	// position can be hand-aligned to a known-open cubicle; freshSeed() is
	// kept available for the new-game path that PRQ-04 will own.
	void freshSeed; // silence unused — wired in PRQ-04
	const [seed] = useState<string>(() => 'Synergistic Bureaucratic Cubicle');
	const { state: floorState, swapTo } = useFloorState({ seed });
	const { navMesh } = useNavMesh(seed, floorState.currentFloor);
	// Stairwell transition state. `pendingDir` is set when a door tap
	// fires; the Transition fades to opaque, runs swapTo, then fades out.
	const [pendingDir, setPendingDir] = useState<'up' | 'down' | null>(null);
	const [doorOpening, setDoorOpening] = useState<'up' | 'down' | null>(null);
	const [transitionActive, setTransitionActive] = useState(false);
	const reaperRef = useRef<HrReaperHandle>(null);
	const [bossAlive, setBossAlive] = useState(false);
	const [debuffs, setDebuffs] = useState(() => freshDebuffSet());
	// Defeated boss floors. Persisted to drizzle in M3; for now lives
	// in session memory so re-entering a cleared boss floor does NOT
	// respawn the Reaper (PRQ-13 spec: single fight per encounter).
	const [defeatedFloors, setDefeatedFloors] = useState<ReadonlySet<number>>(() => new Set());

	// Spawn / despawn the boss as the player crosses into / out of a
	// boss floor. Atomicity: bossAlive flips synchronously with the
	// floor transition, satisfying the bossGate.ts contract.
	useEffect(() => {
		const f = floorState.currentFloor;
		if (isBossFloor(f) && !defeatedFloors.has(f)) {
			setBossAlive(true);
		} else {
			setBossAlive(false);
		}
	}, [floorState.currentFloor, defeatedFloors]);

	// PRQ-15 M2c7: wire the typed audioCues bus to AudioManager so
	// every `audio:*` event from earlier PRQs (floor-arrival, door-*)
	// fires a real Three.Audio source. Listener is shared via the
	// globalAudio singleton; PauseMenu's master-volume slider drives
	// the listener gain. Asset binaries land in M2c8 / M5 polish.
	useEffect(() => {
		const dispose = wireAudioCues();
		// Pull persisted master volume so audio respects the slider
		// across reloads. Falls back to 1 on storage error.
		import('@/db/preferences')
			.then(async (prefs) => {
				const v = await prefs.get('volume_master');
				globalAudio.setMaster(v);
			})
			.catch(() => {});
		return dispose;
	}, []);

	// Clear debuffs on every floor-arrival cue (PRQ-13 reviewer fold:
	// a 4s reaper-redaction shouldn't bleed onto the next floor).
	useEffect(() => {
		const off = audioCues.on((ev) => {
			if (ev.type === 'floor-arrival') {
				setDebuffs((d) => clearAll(d));
			}
		});
		return off;
	}, []);
	// debuffs is read by M2 (BlurOverlay + speedMultiplier in
	// PlayerKinematic). The state lives + clears NOW so M2 only has
	// to add consumers, not the producer. The value is intentionally
	// not wired into a visible effect yet — see M2 task list.
	void debuffs;
	const onReaperDeath = useCallback(() => {
		setBossAlive(false);
		setThreat(0); // PRQ-13 spec: defeating the Reaper resets threat
		setDefeatedFloors((prev) => {
			const next = new Set(prev);
			next.add(floorState.currentFloor);
			return next;
		});
	}, [floorState.currentFloor]);

	const upDoorLocked = shouldLockUpDoor({ floor: floorState.currentFloor, bossAlive });

	// Walkable cells for the Reaper's teleport picker — pulled from
	// yuka NavMesh region centroids. Empty until navMesh resolves;
	// HrReaperEntity gracefully aborts teleport when empty (FSM
	// no-candidate guard from M1c2 fold-forward).
	const walkableCells = useMemo(() => {
		if (!navMesh) return [] as { x: number; y: number; z: number }[];
		return navMesh.regions.map((r) => ({
			x: r.centroid.x,
			y: r.centroid.y,
			z: r.centroid.z,
		}));
	}, [navMesh]);

	// Pick a Reaper spawn point on a real walkable cell near the
	// up-door rather than a hardcoded +2/+2 offset that could land
	// inside a wall on certain seeds. Falls back to the door coord if
	// the navmesh hasn't resolved yet (next render fixes it).
	const reaperSpawn = useMemo<[number, number, number]>(() => {
		const door = floorState.upDoorWorld;
		if (walkableCells.length === 0) return [door.x, 0.8, door.z];
		// Pick the closest walkable cell that is at least 2u from the
		// door (so the player has room to enter and not bump into
		// the boss on arrival).
		let best: { x: number; y: number; z: number } | null = null;
		let bestDist = Infinity;
		for (const c of walkableCells) {
			const dx = c.x - door.x;
			const dz = c.z - door.z;
			const d = Math.sqrt(dx * dx + dz * dz);
			if (d < 2 || d > 6) continue;
			if (d < bestDist) {
				bestDist = d;
				best = c;
			}
		}
		if (!best) return [door.x, 0.8, door.z];
		return [best.x, 0.8, best.z];
	}, [floorState.upDoorWorld, walkableCells]);

	// Pre-compute deterministic spawn positions for the floor's enemies.
	// Each spawn is paired with an archetype (middle-manager / policeman /
	// hitman / swat) chosen by the threat-tier spawn director. The
	// spawn-direction RNG is keyed off the floor seed so a re-roll on
	// the same threat reproduces. `threat` is intentionally NOT in the
	// dep list — re-pick on every floor change is the correct semantics;
	// mid-floor threat climbs don't retro-spawn enemies.
	// biome-ignore lint/correctness/useExhaustiveDependencies: see above
	const enemySpawns = useMemo(() => {
		const result = generateFloor(seed, floorState.currentFloor);
		const VOXEL_SIZE = 0.4;
		const ORIGIN = -31 * VOXEL_SIZE;
		const positions = planSpawns({
			chunks: result.chunks,
			seed,
			floor: floorState.currentFloor,
			count: 3,
			voxelSize: VOXEL_SIZE,
			originX: ORIGIN,
			originZ: ORIGIN,
		});
		// Read threat at floor-enter time; the director picks tier by
		// quantizing threat. Using a synchronous read here is fine —
		// re-eval happens on every floor change (currentFloor dep).
		const directorRng = createRng(`${seed}::floor-${floorState.currentFloor}::director`);
		const archetypes = pickSpawnSet(threat, positions.length, directorRng);
		return positions.map((p, i) => ({
			...p,
			archetype: archetypes[i]?.slug ?? ('middle-manager' as const),
		}));
	}, [seed, floorState.currentFloor]);

	const getPlayerPosition = useCallback(
		() => playerRef.current?.getPosition() ?? { x: 0, y: 0.8, z: 0 },
		[],
	);

	const applyPlayerDamage = useCallback((dmg: number): boolean => {
		let dead = false;
		setPlayerHealth((h) => {
			const next = applyDamage(h, dmg);
			if (isDead(next) && !isDead(h)) {
				dead = true;
				setGameOver(true);
			}
			return next;
		});
		return dead;
	}, []);

	const onEnemyKill = useCallback((slug: string) => {
		setKillCount((n) => n + 1);
		// Threat bump per spec §10. Unknown slugs (cosmetic kills) ignored.
		const delta = KILL_DELTAS[slug as EnemyKillSlug];
		if (delta) setThreat((t) => t + delta);
		// PRQ-04 kills repo wiring lands when the koota world is in place;
		// for now we just bump local state.
	}, []);
	useEffect(() => {
		loadManifest()
			.then((m) => {
				setManifest(m);
				setManifestError(null);
			})
			.catch((e: unknown) => {
				const msg = e instanceof Error ? e.message : String(e);
				console.error('manifest load:', msg);
				setManifestError(msg);
			});
	}, []);

	// Keyboard fallback: ESC pauses; pull-direction is exposed for the
	// kinematic controller. Number keys 1-2 swap weapons.
	useEffect(() => {
		const fb = subscribeKeyboard({
			pause: () => setPaused((p) => !p),
		});
		const onKey = (e: KeyboardEvent) => {
			if (e.code === 'Digit1') setEquipped((eq) => selectSlot(eq, 0));
			else if (e.code === 'Digit2') setEquipped((eq) => selectSlot(eq, 1));
		};
		window.addEventListener('keydown', onKey);
		return () => {
			fb.dispose();
			window.removeEventListener('keydown', onKey);
		};
	}, []);

	// Translate gesture events: tap → tap-to-travel via the navmesh-driven
	// vehicle; hold → radial menu; drag/drag-end reserved for drag-look
	// (PRQ-08+ when pointer-lock + sensitivity wire in).
	// Pin individual fields off floorState (object identity churns on
	// every swap → would re-bind InputCanvas listeners). Pulling out
	// the primitives keeps onGesture stable across non-swap renders.
	const upDoorWorld = floorState.upDoorWorld;
	const downDoorWorld = floorState.downDoorWorld;
	const currentFloor = floorState.currentFloor;
	// Pure routing helper: did this tap hit a tappable door, and which
	// direction? Extracted so onGesture stays under the lint complexity
	// threshold. All gating (pending, transition, locked-up) lives here.
	const tryRouteDoor = useCallback(
		(e: GestureEvent): 'up' | 'down' | null => {
			if (e.kind !== 'tap') return null;
			const tapWorld = playerRef.current?.getTapWorld(e.x, e.y);
			if (!tapWorld) return null;
			const dir = routeTap({
				upDoor: upDoorWorld,
				downDoor: downDoorWorld,
				currentFloor,
				playerPos: playerRef.current?.getPosition() ?? { x: 0, y: 0.8, z: 0 },
				tapWorld,
				tapMaxDistance: 1.5,
				playerMaxDistance: 2.5,
			});
			if (!dir) return null;
			if (pendingDir !== null || transitionActive) return null;
			if (dir === 'up' && upDoorLocked) return null;
			return dir;
		},
		[upDoorWorld, downDoorWorld, currentFloor, pendingDir, transitionActive, upDoorLocked],
	);

	const onGesture = useCallback(
		(e: GestureEvent) => {
			if (e.kind === 'hold') {
				setRadialAnchor({ x: e.x, y: e.y });
				return;
			}
			if (e.kind !== 'tap') return;
			const dir = tryRouteDoor(e);
			if (dir) {
				setDoorOpening(dir);
				setPendingDir(dir);
				return;
			}
			playerRef.current?.tap(e.x, e.y);
			setTimeout(() => setPathWaypoints(playerRef.current?.path ?? []), 16);
		},
		[tryRouteDoor],
	);

	// Door open animation finished → kick off fade-cut.
	const onDoorOpened = useCallback(() => {
		setDoorOpening(null);
		setTransitionActive(true);
	}, []);

	// Fade-in midpoint → run swapTo + teleport player to the destination
	// floor's opposite door (Up-Door of N → arrive at Down-Door of N+1).
	// Use the world-space spawn returned by swapTo so we never duplicate
	// the voxel→world math here.
	const onTransitionMidpoint = useCallback(async () => {
		if (!pendingDir) return;
		const { spawnWorld } = await swapTo(pendingDir);
		playerRef.current?.teleport(spawnWorld.x, spawnWorld.z);
	}, [pendingDir, swapTo]);

	// Fade-out complete → clear pending state.
	const onTransitionComplete = useCallback(() => {
		setTransitionActive(false);
		setPendingDir(null);
	}, []);

	// Per-floor placement overlay. Map<voxelKey, BlockSlug> where
	// voxelKey is `${vx},${vy},${vz}` in floor-space voxel coords
	// (NOT world). The session-only persistence shape lands proper DB
	// wiring in M3; for alpha, placements survive seed/floor regen
	// only as long as Game.tsx is mounted.
	const [placementsByFloor, setPlacementsByFloor] = useState<
		ReadonlyMap<number, ReadonlyMap<string, import('@/world/blocks/BlockRegistry').BlockSlug>>
	>(() => new Map());
	const placements = placementsByFloor.get(floorState.currentFloor);

	// Player tapped a radial slot. M2c4 wires the place-* options through
	// to the building.place() core. Other ids (cancel, mine — future)
	// fall through to the legacy log.
	const onPickRadial = useCallback(
		(opt: { id: string }) => {
			const slug = radialIdToSlug(opt.id);
			if (!slug || !radialAnchor) {
				setRadialAnchor(null);
				return;
			}
			const tapWorld = playerRef.current?.getTapWorld(radialAnchor.x, radialAnchor.y);
			if (!tapWorld) {
				setRadialAnchor(null);
				return;
			}
			// World→voxel using the same VOXEL_SIZE/ORIGIN that ChunkLayer uses.
			const VOXEL_SIZE = 0.4;
			const ORIGIN = -31 * VOXEL_SIZE;
			const vx = Math.round((tapWorld.x - ORIGIN) / VOXEL_SIZE);
			const vz = Math.round((tapWorld.z - ORIGIN) / VOXEL_SIZE);
			const vy = 2; // wall y-row above the carpet (FLOOR_FLOOR_Y_TOP+1)
			const playerPos = playerRef.current?.getPosition() ?? { x: 0, y: 0.8, z: 0 };
			const playerVx = Math.round((playerPos.x - ORIGIN) / VOXEL_SIZE);
			const playerVz = Math.round((playerPos.z - ORIGIN) / VOXEL_SIZE);
			// Derive a fresh ChunkData snapshot to gate the placement.
			// Reuses ChunkLayer's overlay path in spirit — generate +
			// apply existing placements, then check canPlace.
			const result = generateFloor(seed, floorState.currentFloor);
			const VOXELS_PER_CHUNK = 16;
			const cx = Math.floor(vx / VOXELS_PER_CHUNK);
			const cz = Math.floor(vz / VOXELS_PER_CHUNK);
			const lx = vx - cx * VOXELS_PER_CHUNK;
			const lz = vz - cz * VOXELS_PER_CHUNK;
			const chunk = result.chunks[cz * 4 + cx];
			if (!chunk) {
				setRadialAnchor(null);
				return;
			}
			const ok = place({
				chunk,
				target: { x: lx, y: vy, z: lz },
				playerVoxel: { x: playerVx, y: 2, z: playerVz },
				slug,
			});
			if (ok) {
				const key = `${vx},${vy},${vz}`;
				setPlacementsByFloor((prev) => {
					const next = new Map(prev);
					const floorMap = new Map(next.get(floorState.currentFloor) ?? []);
					floorMap.set(key, slug);
					next.set(floorState.currentFloor, floorMap);
					return next;
				});
			}
			setRadialAnchor(null);
		},
		[radialAnchor, seed, floorState.currentFloor],
	);

	// Demo: until the world-raycast lands, treat every hold as if it hit
	// the floor. PRQ-06 swaps this for the real surfaceKind via raycast.
	const radialSurface = useMemo(() => (radialAnchor ? ('floor' as const) : null), [radialAnchor]);

	if (manifestError) {
		return (
			<div
				data-testid="game-error"
				role="alert"
				style={{
					position: 'absolute',
					inset: 0,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					gap: '1rem',
					padding: '2rem',
					background: 'var(--ink, #0d0f12)',
					color: 'var(--paper, #e8e6df)',
					fontFamily: 'inherit',
					textAlign: 'center',
				}}
			>
				<h2 style={{ margin: 0 }}>Failed to load asset manifest</h2>
				<pre style={{ maxWidth: '60ch', whiteSpace: 'pre-wrap', opacity: 0.8 }}>
					{manifestError}
				</pre>
				<button
					type="button"
					onClick={onExit}
					style={{
						padding: '0.5rem 1rem',
						background: 'transparent',
						color: 'inherit',
						border: '1px solid currentColor',
						fontFamily: 'inherit',
						cursor: 'pointer',
					}}
				>
					BACK TO LANDING
				</button>
			</div>
		);
	}

	return (
		<div data-testid="game" style={{ position: 'relative', width: '100%', height: '100%' }}>
			<Canvas
				style={{ background: '#0d0f12' }}
				shadows
				gl={{
					toneMapping: ACESFilmicToneMapping,
					toneMappingExposure: 1.0,
					outputColorSpace: SRGBColorSpace,
					antialias: true,
				}}
			>
				{/* PlayerKinematic owns the camera position once mounted; the
				    PlayerCamera here only sets initial yaw/pitch + FOV (the
				    Y is overwritten by the kinematic's per-frame update). */}
				<PlayerCamera
					position={[0, 1.5]}
					yaw={Math.PI}
					pitch={0}
					eyeHeight={2.4}
					referenceFovDeg={70}
				/>
				<AttachListener />
				<Suspense fallback={null}>
					<Lighting />
					<PauseProvider paused={paused || gameOver}>
						<Physics
							gravity={[0, -9.81, 0]}
							colliders={false}
							timeStep="vary"
							interpolate={false}
							paused={paused || gameOver}
						>
							{manifest && (
								<World
									manifest={manifest}
									seed={seed}
									floor={floorState.currentFloor}
									{...(placements !== undefined && { placements })}
								/>
							)}
							<PlayerKinematic ref={playerRef} navMesh={navMesh} spawn={[0, 1.5]} />
							<Door
								position={[
									floorState.upDoorWorld.x,
									floorState.upDoorWorld.y,
									floorState.upDoorWorld.z,
								]}
								direction="up"
								open={doorOpening === 'up'}
								locked={upDoorLocked}
								onOpened={onDoorOpened}
							/>
							{isBossFloor(floorState.currentFloor) && bossAlive && manifest && (
								<HrReaperEntity
									ref={reaperRef}
									manifest={manifest}
									spawn={reaperSpawn}
									walkableCells={walkableCells}
									getPlayerPosition={getPlayerPosition}
									applyPlayerDamage={applyPlayerDamage}
									onDeath={onReaperDeath}
									seed={seed}
									floor={floorState.currentFloor}
								/>
							)}
							{floorState.currentFloor > 1 && (
								<Door
									position={[
										floorState.downDoorWorld.x,
										floorState.downDoorWorld.y,
										floorState.downDoorWorld.z,
									]}
									direction="down"
									open={doorOpening === 'down'}
									onOpened={onDoorOpened}
								/>
							)}
							{manifest &&
								enemySpawns.map((s) => (
									<MiddleManagerEntity
										key={`enemy-${s.voxel.x}-${s.voxel.y}-${s.voxel.z}`}
										manifest={manifest}
										navMesh={navMesh}
										spawn={[s.world.x, 0.8, s.world.z]}
										archetype={s.archetype}
										getPlayerPosition={getPlayerPosition}
										applyPlayerDamage={applyPlayerDamage}
										onKill={onEnemyKill}
									/>
								))}
						</Physics>
					</PauseProvider>
					{showNavMeshViz && <NavMeshViz navMesh={navMesh} />}
					{showPathViz && <PathViz waypoints={pathWaypoints} />}
					{showHUD && <DrawCallHUD />}
				</Suspense>
			</Canvas>
			<InputCanvas
				onGesture={onGesture}
				enabled={!paused && radialAnchor === null && !transitionActive && pendingDir === null}
			/>
			<Transition
				active={transitionActive}
				onMidpoint={onTransitionMidpoint}
				onComplete={onTransitionComplete}
			/>
			<RadialMenu
				anchor={radialAnchor}
				surface={radialSurface}
				onPick={onPickRadial}
				onClose={() => setRadialAnchor(null)}
			/>
			<PauseMenu
				open={paused}
				onResume={() => setPaused(false)}
				onQuit={onExit}
				stats={{
					floor: floorState.currentFloor,
					threat,
					kills: killCount,
					playedSeconds,
				}}
			/>
			<HpBar health={playerHealth} />
			<WeaponIcon weaponSlug={currentWeaponSlug(equipped)} />
			{(() => {
				const slug = currentWeaponSlug(equipped) ?? '';
				const w = weapons?.get(slug);
				const cap = w?.kind === 'projectile' ? w.ammoCap : w?.kind === 'hitscan' ? w.ammoCap : 0;
				return (
					<AmmoCounter current={currentAmmo(equipped)} max={cap} weaponName={w?.name ?? slug} />
				);
			})()}
			<FloorStamp floor={floorState.currentFloor} />
			<ThreatStrip threat={threat} />
			<Crosshair visible={false} />
			<div
				data-testid="kill-counter"
				style={{
					position: 'absolute',
					bottom: 38,
					right: 16,
					padding: '0.25rem 0.6rem',
					font: '11px ui-monospace, monospace',
					color: 'var(--paper, #e8e6df)',
					background: 'var(--ink, #0d0f12)',
					border: '1px solid currentColor',
					zIndex: 5,
					pointerEvents: 'none',
				}}
			>
				KILLS {killCount}
			</div>
			{gameOver && (
				<GameOver
					onRestart={() => {
						setPlayerHealth(freshHealth(PLAYER_MAX_HP));
						setGameOver(false);
						setKillCount(0);
						setPlayedSeconds(0);
					}}
					onExit={onExit}
					stats={{
						kills: killCount,
						deepestFloor: floorState.currentFloor,
						playedSeconds,
					}}
				/>
			)}
			<button
				type="button"
				data-testid="exit"
				onClick={onExit}
				style={{
					position: 'absolute',
					top: 16,
					right: 16,
					padding: '0.5rem 1rem',
					background: 'var(--ink)',
					color: 'var(--paper)',
					border: '1px solid var(--paper)',
					fontFamily: 'inherit',
					cursor: 'pointer',
					zIndex: 10,
				}}
			>
				EXIT
			</button>
		</div>
	);
}
