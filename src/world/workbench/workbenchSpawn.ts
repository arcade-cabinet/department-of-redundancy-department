import { createRng } from '@/world/generator/rng';

export function isWorkbenchFloor(floor: number): boolean {
	return floor > 0 && floor % 5 === 0;
}

interface World3 {
	x: number;
	y: number;
	z: number;
}

export function workbenchPositionFor(seed: string, floor: number, downDoor: World3): World3 {
	const rng = createRng(`${seed}::workbench::floor-${floor}`);
	// Place in a 3u radius around the down-door for findability
	const angle = rng.next() * Math.PI * 2;
	const dist = 1.5 + rng.next() * 2.5; // 1.5..4u
	return {
		x: downDoor.x + Math.cos(angle) * dist,
		y: downDoor.y,
		z: downDoor.z + Math.sin(angle) * dist,
	};
}
