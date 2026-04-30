/**
 * Audio cue event bus stub (PRQ-12 T5). The actual sample playback
 * lands in PRQ-15; for now this lets the floor-swap orchestrator emit
 * `floor-arrival` and a future audio system subscribe without coupling
 * the two PRQs.
 *
 * Why a tiny home-grown bus: a koota signal would force callers into
 * the ECS; framer-motion's eventEmitter ships only inside motion. A
 * 30-line typed pub/sub keeps audio independent of every other system
 * for the alpha cut.
 */

export type AudioCueEvent =
	| { type: 'floor-arrival'; floor: number }
	| { type: 'door-open' }
	| { type: 'door-close' };

type Listener = (event: AudioCueEvent) => void;

const listeners = new Set<Listener>();

export const audioCues = {
	on(listener: Listener): () => void {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	},
};

export function emit(event: AudioCueEvent): void {
	for (const fn of listeners) fn(event);
}
