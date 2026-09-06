import path from 'node:path';

import { Ext, SoundsConfig, TexturesConfig, TrackDuration, VideoCodecs, VideoConfig } from './types';

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

export function createVideoConfig(prod: boolean): VideoConfig {
	return { codecs: prod ? [VideoCodecs.h264, VideoCodecs.av1] : [VideoCodecs.h264] };
}

// path.relative(base, fullPath) instead of swapping fullPath's first segment, so this
// still works when base/fullPath are absolute (e.g. an absolute --outDir), not just short names.
export function getBasePath(fullPath: string, base: string, sep: string): string {
	return path.relative(base, fullPath).split(path.sep).join(sep);
}

// path.relative(base, filePath) instead of swapping filePath's first segment, so this
// still works when base/filePath are absolute (e.g. an absolute --outDir), not just short names.
export function replaceRoot(filePath: string, base: string, root: string, sep: string): string {
	if (!filePath) throw new Error(`${replaceRoot.name} filePath error`);
	const relativePath = path.relative(base, filePath).split(path.sep).join(sep);
	return [root, relativePath].join(sep);
}
