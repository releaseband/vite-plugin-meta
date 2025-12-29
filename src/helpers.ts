import { createWriteStream, WriteStream } from 'node:fs';
import path from 'node:path';

import { Sharp } from 'sharp';

import {
	Ext,
	SoundsConfig,
	TexturePrefixes,
	TexturePrefixValue,
	TexturesConfig,
	TrackDuration,
	VideoCodecs,
	VideoConfig,
} from './types';

export function waitConvert<TStream extends { on: (event: string, fn: (...arg: any[]) => void) => TStream }>(
	stream: TStream
): Promise<void> {
	return new Promise((resolve, reject) => {
		stream.on('error', reject);
		stream.on('end', resolve);
		stream.on('finish', resolve);
	});
}

export function createPrefixValue(prefixKey: number): TexturePrefixValue {
	return `@${prefixKey}x`;
}

export function createImageStreams(
	factory: Sharp,
	options: {
		newPath: string;
		ext: string;
		width: number;
		height: number;
		quality?: number;
		prefixKey?: number;
		lossless?: boolean;
	}
): WriteStream[] {
	const { newPath, ext, width, height, prefixKey, quality, lossless } = options;

	const prefix = prefixKey ?? 1;
	const prefixValue = prefixKey == null ? '' : createPrefixValue(prefixKey);
	const currentWidth = Math.round(width * prefix);
	const currentHeight = Math.round(height * prefix);

	const avif = factory
		.clone()
		.resize(currentWidth, currentHeight)
		.avif({ quality, lossless })
		.pipe(createWriteStream(addPrefix(newPath.replace(ext, Ext.avif), prefixValue)));

	const webp = factory
		.clone()
		.resize(currentWidth, currentHeight)
		.webp({ quality, lossless })
		.pipe(createWriteStream(addPrefix(newPath.replace(ext, Ext.webp), prefixValue)));

	const png = factory
		.clone()
		.resize(currentWidth, currentHeight)
		.png({ quality, palette: true, compressionLevel: lossless ? 0 : 6 }) // 6 - sharp default value
		.pipe(createWriteStream(addPrefix(newPath.replace(ext, Ext.png), prefixValue)));

	return [avif, webp, png];
}

export function makePrefixes(prefixes: readonly number[]): TexturePrefixes {
	return prefixes.reduce<TexturePrefixes>((acc, value) => {
		return { ...acc, [value]: createPrefixValue(value) };
	}, {});
}

export function createTexturesConfig(prod: boolean, defaultExt: string, prefixes?: readonly number[]): TexturesConfig {
	return {
		formats: prod ? [Ext.avif, Ext.png, Ext.webp] : [defaultExt],
		prefixes: prod ? makePrefixes(prefixes ?? []) : void 0,
	};
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

export function addPrefix(filePath: string, prefix: string): string {
	const dir = path.dirname(filePath);
	const ext = path.extname(filePath);
	const base = path.basename(filePath, ext);
	return path.join(dir, `${base}${prefix}${ext}`);
}

export function removePrefix(filePath: string): string {
	const dir = path.dirname(filePath);
	const ext = path.extname(filePath);
	const base = path.basename(filePath, ext);
	const cleanBase = base.replace(/@\w[\w.-]*$/, '');
	return path.join(dir, `${cleanBase}${ext}`);
}
