import { Ext, SoundsConfig, TexturesConfig, TrackDuration, VideoCodecs, VideoConfig } from './types';

export function waitConvert<TStream extends { on: (event: string, fn: (...arg: any[]) => void) => TStream }>(
	stream: TStream
): Promise<void> {
	return new Promise((resolve, reject) => {
		stream.on('error', reject);
		stream.on('end', resolve);
		stream.on('finish', resolve);
	});
}

export function createTexturesConfig(prod: boolean, defaultExt: string): TexturesConfig {
	return { formats: prod ? [Ext.avif, Ext.png, Ext.webp] : [defaultExt] };
}

export function createSoundsConfig(prod: boolean, trackDuration: TrackDuration, defaultExt: string): SoundsConfig {
	return { formats: prod ? [Ext.m4a, Ext.mp3, Ext.ogg] : [defaultExt], trackDuration };
}

export function createVideoConfig(prod: boolean): VideoConfig {
	return { codecs: prod ? [VideoCodecs.h264, VideoCodecs.av1] : [VideoCodecs.h264] };
}

export function getBasePath(fullPath: string, sep: string): string {
	return fullPath.split(sep).slice(1).join(sep);
}

export function replaceRoot(filePath: string, root: string, sep: string): string {
	if (!filePath) throw new Error(`${replaceRoot.name} filePath error`);
	let splitPath = filePath.split(sep);
	if (splitPath.length === 1) splitPath = [root, filePath];
	else splitPath[0] = root;
	return splitPath.join(sep);
}
