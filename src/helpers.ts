import { Ext, SoundsConfig, TexturesConfig, TrackDuration } from './types';

export function waitConvert<TStream extends { on: (event: string, fn: (...arg: any[]) => void) => TStream }>(
	stream: TStream
): Promise<void> {
	return new Promise((resolve, reject) => stream.on('error', reject).on('end', resolve));
}

export function createTexturesConfig(prod: boolean): TexturesConfig {
	return { formats: prod ? [Ext.avif, Ext.png, Ext.webp] : [Ext.png] };
}

export function createSoundsConfig(prod: boolean, trackDuration: TrackDuration): SoundsConfig {
	return { formats: prod ? [Ext.m4a, Ext.mp3, Ext.ogg] : [Ext.wav], trackDuration };
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
