/**
 * FirePattern — the tape an enemy plays.
 *
 * Mirrors docs/spec/02-encounter-vocabulary.md fire-program table.
 *
 * Events are keyed by milliseconds since spawn. The director ticks the enemy,
 * advances `nextFireEventIdx` past any events whose `atMs` is now in the past,
 * and emits them. Events are consumed once unless `loop` is true, in which
 * case the program restarts at idx 0 once the last event is consumed.
 */

export type FirePatternId =
	| 'pistol-pop-aim'
	| 'pistol-cover-pop'
	| 'vault-drop-fire'
	| 'crawler-lunge'
	| 'shamble-march'
	| 'charge-sprint'
	| 'vehicle-dismount-burst'
	| 'drive-by-volley'
	| 'sniper-aim'
	| 'lob-throw'
	| 'hostage-threat'
	| 'mass-pop-volley'
	| 'justice-glint'
	| 'civilian-walk'
	| 'pre-aggro-pistol-pop'
	| 'idle'
	// Bespoke boss fire programs (one per phase fired in level data).
	| 'garrison-burst'
	| 'whitcomb-throw'
	| 'phelps-aim'
	| 'phelps-snipe'
	| 'crawford-suppress'
	| 'crawford-charge'
	| 'reaper-scythe-arc'
	| 'reaper-volley'
	| 'reaper-rush';

export type FireEvent =
	| { readonly atMs: number; readonly verb: 'aim-laser'; readonly durationMs: number }
	| { readonly atMs: number; readonly verb: 'fire-hitscan'; readonly damage: number }
	| {
			readonly atMs: number;
			readonly verb: 'projectile-throw';
			readonly damage: number;
			readonly ttlMs: number;
	  }
	| {
			readonly atMs: number;
			readonly verb: 'melee-contact';
			readonly damage: number;
			readonly rangeM: number;
	  }
	| { readonly atMs: number; readonly verb: 'duck' }
	| { readonly atMs: number; readonly verb: 'pop-out' }
	| { readonly atMs: number; readonly verb: 'idle' };

export interface FirePattern {
	readonly id: FirePatternId;
	readonly events: readonly FireEvent[];
	readonly loop: boolean;
	/** True if this program respects the director's `on-alert` signal — `idle` events break early. */
	readonly preAggro?: boolean;
}
