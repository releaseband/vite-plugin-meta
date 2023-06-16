export const enum Names {
	metaConfigName = 'meta.json',
	hashConfigName = 'files-hash.json',
	publicDir = 'public',
	storageDir = 'storage',
}

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

export type MetaPluginOption = {
	readonly version?: string;
	readonly metaConfigName?: string;
	readonly hashConfigName?: string;
	readonly storageDir?: string;
	readonly selectFilesLog?: boolean;
};
