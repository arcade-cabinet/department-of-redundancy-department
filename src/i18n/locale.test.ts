import { describe, expect, it } from 'vitest';
import { knownLocales, type LocaleKey, t } from './locale';

describe('i18n loader (PRQ-RC5)', () => {
	it('en is the default locale', () => {
		expect(t('landing.title' as LocaleKey)).toMatch(/Department of Redundancy/i);
	});

	it('returns the key on missing translation (no crash)', () => {
		expect(t('does.not.exist' as LocaleKey)).toBe('does.not.exist');
	});

	it('switches to es when set', () => {
		const enTitle = t('landing.title' as LocaleKey, 'en');
		const esTitle = t('landing.title' as LocaleKey, 'es');
		expect(enTitle).not.toBe(esTitle);
		expect(esTitle).toMatch(/Departamento|Redundancia/i);
	});

	it('knownLocales lists the shipped pack(s)', () => {
		const all = knownLocales();
		expect(all).toContain('en');
		expect(all).toContain('es');
	});
});
