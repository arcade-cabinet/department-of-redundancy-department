import type { Tier } from '@/ecs/components/Equipped';
import type { Equipped } from '@/ecs/components/Equipped';
import type { WeaponCurrency } from '@/ecs/components/WeaponCurrency';
import type { Weapon } from '@/content/weapons';
import { canUpgrade, nextTier, upgradeCost } from '@/combat/upgrade';
import { Button, Dialog } from '@/ui/primitives';

interface Props {
	open: boolean;
	onClose: () => void;
	equipped: Equipped;
	wallet: WeaponCurrency;
	weapons: Map<string, Weapon> | null;
	onUpgrade: (slotIdx: number, fromTier: Tier, toTier: Tier) => void;
}

export function WorkbenchPanel({ open, onClose, equipped, wallet, weapons, onUpgrade }: Props) {
	return (
		<Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
			<Dialog.Portal>
				<Dialog.Overlay data-testid="workbench-overlay" />
				<Dialog.Content data-testid="workbench-panel" aria-describedby="wb-desc">
					<Dialog.Title>WORKBENCH</Dialog.Title>
					<Dialog.Description
						id="wb-desc"
						style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
					>
						Spend pickup currency to upgrade weapon tiers.
					</Dialog.Description>
					<div style={{ marginBottom: 'var(--space-4)' }}>
						<div style={{ display: 'flex', gap: 'var(--space-3)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', opacity: 0.8 }}>
							<span>☕ {wallet.coffee}</span>
							<span>📎 {wallet.binderClips}</span>
							<span>🍩 {wallet.donuts}</span>
							<span>💼 {wallet.briefcases}</span>
						</div>
					</div>
					<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
						{equipped.slots.map((slot, idx) => {
							if (!slot.slug) return null;
							const w = weapons?.get(slot.slug);
							if (!w) return null;
							const next = nextTier(slot.tier);
							const cost = next ? upgradeCost(slot.tier, next) : null;
							const affordable = next ? canUpgrade(wallet, slot.tier, next) : false;
							return (
								<li
									key={`${slot.slug}-${idx}`}
									data-testid={`wb-row-${slot.slug}`}
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
										padding: 'var(--space-2)',
										borderBottom: '1px solid var(--ink)',
									}}
								>
									<div>
										<div style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>
											{w.name}
										</div>
										<div style={{ fontSize: '0.85rem', opacity: 0.7 }}>{slot.tier}</div>
									</div>
									{next && cost && (
										<Button
											data-testid={`wb-upgrade-${slot.slug}`}
											variant={affordable ? 'auditor' : 'ghost'}
											disabled={!affordable}
											onClick={() => onUpgrade(idx, slot.tier, next)}
										>
											→ {next} (☕{cost.coffee ?? 0}/📎{cost.binderClips ?? 0}/🍩{cost.donuts ?? 0}/💼{cost.briefcases ?? 0})
										</Button>
									)}
									{!next && (
										<span style={{ fontSize: '0.85rem', opacity: 0.5 }}>MAX</span>
									)}
								</li>
							);
						})}
					</ul>
					<div style={{ marginTop: 'var(--space-5)' }}>
						<Button data-testid="workbench-close" variant="ghost" onClick={onClose}>
							CLOSE
						</Button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
