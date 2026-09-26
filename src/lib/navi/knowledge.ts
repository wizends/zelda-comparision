// Conocimiento de Navi: temas de Ocarina of Time resumidos de Zelda Wiki (CC BY-SA), en español.
import dungeons from './knowledge/dungeons.json';
import bosses from './knowledge/bosses.json';
import songs from './knowledge/songs.json';
import items from './knowledge/items.json';
import characters from './knowledge/characters.json';
import places from './knowledge/places.json';
import enemies from './knowledge/enemies.json';
import races from './knowledge/races.json';

export type Kind = 'dungeons' | 'bosses' | 'songs' | 'items' | 'characters' | 'places' | 'enemies' | 'races';

export type Topic = {
	id: string;
	name: string;
	aliases: string[];
	kind: Kind;
	summary?: string;
	where?: string;
	// mazmorras
	order?: number;
	age?: string;
	treasure?: string;
	miniboss?: string;
	boss?: string;
	reward?: string;
	tip?: string;
	// jefes y enemigos
	dungeon?: string;
	strategy?: string;
	// canciones y objetos
	teacher?: string;
	effect?: string;
	use?: string;
};

const withKind = (kind: Kind, list: Omit<Topic, 'kind'>[]): Topic[] => list.map((t) => ({ ...t, kind }));

export const TOPICS: Topic[] = [
	...withKind('dungeons', dungeons),
	...withKind('bosses', bosses),
	...withKind('songs', songs),
	...withKind('items', items),
	...withKind('characters', characters),
	...withKind('places', places),
	...withKind('enemies', enemies),
	...withKind('races', races),
];
