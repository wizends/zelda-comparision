// Tipos mínimos de los paquetes de NLP.js usados por el chatbot (no traen tipos propios)
declare module '@nlpjs/core' {
	export interface Container {
		use(plugin: unknown): void;
	}
	const core: { containerBootstrap(): Container };
	export default core;
}

declare module '@nlpjs/lang-es' {
	const langEs: { LangEs: unknown };
	export default langEs;
}

declare module '@nlpjs/nlp' {
	export interface NlpResult {
		intent: string;
		score: number;
		answer?: string;
		entities: { entity: string; option: string; sourceText: string; utteranceText: string; accuracy: number }[];
	}
	export class Nlp {
		constructor(settings?: Record<string, unknown>);
		addDocument(locale: string, utterance: string, intent: string): void;
		addAnswer(locale: string, intent: string, answer: string): void;
		addNerRuleOptionTexts(locale: string, entityName: string, optionName: string, texts: string[]): void;
		train(): Promise<void>;
		export(minified?: boolean): string;
		import(data: string | object): void;
		process(locale: string, utterance: string): Promise<NlpResult>;
	}
	const nlp: { Nlp: typeof Nlp };
	export default nlp;
}
