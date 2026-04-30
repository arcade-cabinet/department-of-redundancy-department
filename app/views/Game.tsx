import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { PlayerKinematic, type PlayerKinematicHandle } from '@/ai/core/PlayerKinematic';
import { MiddleManagerEntity } from '@/ai/enemies/MiddleManagerEntity';
import { planSpawns } from '@/ai/enemies/spawner';
import { useNavMesh } from '@/ai/navmesh/useNavMesh';
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
import { generateFloor } from '@/world/generator/floor';
import { freshSeed } from '@/world/generator/rng';
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
	const { navMesh } = useNavMesh(seed, 1);

	// Pre-compute deterministic spawn positions for the 3 floor-1 managers.
	// generateFloor() is idempotent on the seed so this stays reactive-clean.
	const enemySpawns = useMemo(() => {
		const result = generateFloor(seed, 1);
		const VOXEL_SIZE = 0.4;
		const ORIGIN = -31 * VOXEL_SIZE;
		return planSpawns({
			chunks: result.chunks,
			seed,
			floor: 1,
			count: 3,
			voxelSize: VOXEL_SIZE,
			originX: ORIGIN,
			originZ: ORIGIN,
		});
	}, [seed]);

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
		// PRQ-04 kills repo wiring lands when the koota world is in place;
		// for now we just bump the local counter.
		void slug;
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
	const onGesture = useCallback((e: GestureEvent) => {
		if (e.kind === 'hold') {
			setRadialAnchor({ x: e.x, y: e.y });
			return;
		}
		if (e.kind === 'tap') {
			playerRef.current?.tap(e.x, e.y);
			// Capture the new path for PathViz on the next tick.
			setTimeout(() => setPathWaypoints(playerRef.current?.path ?? []), 16);
		}
	}, []);

	// Player tapped a radial slot. PRQ-06 turns these into koota events
	// (tap-engage, place-stair, etc.); for now we just log.
	const onPickRadial = useCallback((opt: { id: string }) => {
		console.log('radial pick:', opt.id);
	}, []);

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
							{manifest && <World manifest={manifest} seed={seed} />}
							<PlayerKinematic ref={playerRef} navMesh={navMesh} spawn={[0, 1.5]} />
							{manifest &&
								enemySpawns.map((s) => (
									<MiddleManagerEntity
										key={`mgr-${s.voxel.x}-${s.voxel.y}-${s.voxel.z}`}
										manifest={manifest}
										navMesh={navMesh}
										spawn={[s.world.x, 0.8, s.world.z]}
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
			<InputCanvas onGesture={onGesture} enabled={!paused && radialAnchor === null} />
			<RadialMenu
				anchor={radialAnchor}
				surface={radialSurface}
				onPick={onPickRadial}
				onClose={() => setRadialAnchor(null)}
			/>
			<PauseMenu open={paused} onResume={() => setPaused(false)} onQuit={onExit} />
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
			<FloorStamp floor={1} />
			<ThreatStrip threat={Math.min(1, killCount / 10)} />
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
					}}
					onExit={onExit}
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
