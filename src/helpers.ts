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
