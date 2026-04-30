/**
 * Localization scaffold (PRQ-RC5, M7). Tiny string-table loader; one
 * stub locale (es) ships per spec §22.3 so the surface is exercised.
 *
 * Real translation work happens post-1.0 via the standard string-
 * extraction sweep against this table — every UI surface that lands
 * after RC5 is expected to use `t(key)` instead of inline literals.
 */

export type Locale = 'en' | 'es';
export type LocaleKey = string;

const STRINGS: Readonly<Record<Locale, Readonly<Record<string, string>>>> = Object.freeze({
	en: Object.freeze({
		'landing.title': 'Department of Redundancy Department',
		'landing.tagline': 'There has been a reorganization',
		'landing.cta.clockIn': 'CLOCK IN',
		'landing.cta.resume': 'RESUME ON FLOOR {floor}',
		'pause.title': 'PAUSED',
		'pause.tab.stats': 'Stats',
		'pause.tab.settings': 'Settings',
		'pause.tab.journal': 'Journal',
		'pause.button.resume': 'RESUME',
		'pause.button.quit': 'QUIT TO LANDING',
		'gameover.title': 'You have been terminated',
		'gameover.body': 'Your file has been redundantized. HR will be in touch.',
	}),
	es: Object.freeze({
		'landing.title': 'Departamento de Redundancia',
		'landing.tagline': 'Ha habido una reorganización',
		'landing.cta.clockIn': 'FICHAR',
		'landing.cta.resume': 'CONTINUAR EN PISO {floor}',
		'pause.title': 'EN PAUSA',
		'pause.tab.stats': 'Estadísticas',
		'pause.tab.settings': 'Ajustes',
		'pause.tab.journal': 'Diario',
		'pause.button.resume': 'CONTINUAR',
		'pause.button.quit': 'SALIR',
		'gameover.title': 'Has sido despedido',
		'gameover.body': 'Tu expediente ha sido redundantizado. RR.HH. te contactará.',
	}),
});

let _locale: Locale = 'en';

export function setLocale(loc: Locale): void {
	_locale = loc;
}

export function t(key: LocaleKey, locale?: Locale): string {
	const tbl = STRINGS[locale ?? _locale];
	return tbl[key] ?? key;
}

export function knownLocales(): readonly Locale[] {
	return Object.keys(STRINGS) as Locale[];
}
