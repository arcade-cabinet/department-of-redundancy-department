/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly GITHUB_PAGES?: string;
	readonly CAPACITOR?: string;
	readonly DORD_BASE_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
