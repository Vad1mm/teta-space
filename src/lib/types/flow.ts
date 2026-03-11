export interface ModuleConfig {
	brand: string;
	entryDelay: number;
	entryMorphTo?: string;
	slogan?: string;
	playText?: string;
	exitMorphTo: string;
	blinkHaptic: boolean;
	blinkType: 'rigid' | 'soft' | null;
}

export type Phase =
	| 'splash'
	| 'morph'
	| 'slogan'
	| 'waitPlay'
	| 'opening'
	| 'live'
	| 'closing'
	| 'transition'
	| 'farewell'
	| 'dark';
