export const enum Names {
	metaConfigName = 'meta.json',
	hashConfigName = 'files-hash.json',
	publicDir = 'public',
	storageDir = 'resourceCache',
}

export const enum Ext {
	avif = '.avif',
	webp = '.webp',
	png = '.png',
	gif = '.gif',
	mp3 = '.mp3',
	ogg = '.ogg',
	m4a = '.m4a',
	jpg = '.jpg',
	jpeg = '.jpeg',
	wav = '.wav',
	mp4 = '.mp4',
	av1 = '.av1',
}

export const enum VideoCodecs {
	h264 = 'h264',
	av1 = 'av1',
}

export type FileFormats = ReadonlyArray<string>;

export type TrackDuration = Readonly<Record<string, number>>;

export type TexturesConfig = {
	readonly formats: FileFormats;
};

export type SoundsConfig = {
	readonly formats: FileFormats;
	readonly trackDuration: TrackDuration;
};

export type VideoConfig = {
	readonly codecs: ReadonlyArray<string>;
};

export type MetaConfig = {
	readonly prod: boolean;
	readonly gameVersion: string;
	readonly textures: TexturesConfig;
	readonly sounds: SoundsConfig;
	readonly video: VideoConfig;
};

export type MetaPluginOption = {
	readonly version: string;
	readonly metaConfigName: string;
	readonly hashConfigName: string;
	readonly storageDir: string;
	readonly selectFilesLog?: boolean;
	readonly filesHashLog?: boolean;
	readonly converLog?: boolean;
	readonly optionLog?: boolean;
	readonly publicLog?: boolean;
	readonly fileChangeLog?: boolean;
	readonly exclude: ReadonlyArray<string>;
};
