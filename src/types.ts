export type TextureFormats = ReadonlyArray<string>;

export type SoundFormats = ReadonlyArray<string>;

export type TrackDuration = Readonly<Record<string, number>>;

export type TexturesConfig = {
	readonly formats: TextureFormats;
};

export type SoundsConfig = {
	readonly formats: SoundFormats;
	readonly trackDuration: TrackDuration;
};

export type MetaConfig = {
	readonly prod: boolean;
	readonly gameVersion: string;
	readonly textures: TexturesConfig;
	readonly sounds: SoundsConfig;
};
