import process from 'node:process';
import MetaPlugin from './MetaPlugin';
import { Names } from './types';

const enum Flags {
	storageDir = '--storageDir',
	publicDir = '--publicDir',
	configName = '--config',
	selectFilesLog = '--selectFilesLog',
	filesHashLog = '--filesHashLog',
	convertLog = '--convertLog',
	optionLog = '--optionLog',
	publicLog = '--publicLog',
	fileChangeLog = '--fileChangeLog',
	exclude = '--exclude',
	losslessImages = '--losslessImages',
	audioSampleRate = '--audioSampleRate',
	audioChannels = '--audioChannels',
	mp3Quality = '--mp3Quality',
	oggQuality = '--oggQuality',
	m4aBitrate = '--m4aBitrate',
	m4aVbrQuality = '--m4aVbrQuality',
}

export const getParameter = (key: string): string | null => {
	const index = process.argv.findIndex((str) => str === key);
	if (index === -1) return null;
	return process.argv[index + 1] ?? null;
};

export const checkParameter = (key: string): boolean => {
	const index = process.argv.findIndex((str) => str === key);
	return index !== -1;
};

export const getNumberParameter = (key: string): number | undefined => {
	const value = getParameter(key);
	if (!value) return undefined;
	const numberValue = Number(value);
	if (Number.isNaN(numberValue)) throw new Error(`${key} must be a number`);
	return numberValue;
};

const plugin = new MetaPlugin({
	storageDir: getParameter(Flags.storageDir) ?? Names.storageDir,
	hashConfigName: getParameter(Flags.configName) ?? Names.hashConfigName,
	selectFilesLog: checkParameter(Flags.selectFilesLog),
	filesHashLog: checkParameter(Flags.filesHashLog),
	convertLog: checkParameter(Flags.convertLog),
	optionLog: checkParameter(Flags.optionLog),
	publicLog: checkParameter(Flags.publicLog),
	fileChangeLog: checkParameter(Flags.fileChangeLog),
	losslessImages: getParameter(Flags.losslessImages)
		?.split(',')
		.map((path) => path.trim()),
	audioOptimization: {
		sampleRate: getNumberParameter(Flags.audioSampleRate),
		channels: getNumberParameter(Flags.audioChannels),
		mp3Quality: getNumberParameter(Flags.mp3Quality),
		oggQuality: getNumberParameter(Flags.oggQuality),
		m4aBitrate: getParameter(Flags.m4aBitrate) ?? undefined,
		m4aVbrQuality: getNumberParameter(Flags.m4aVbrQuality),
	},
	exclude: getParameter(Flags.exclude)
		?.split(',')
		.map((file) => file.trim()),
});

const publicDir = getParameter(Flags.publicDir) ?? Names.publicDir;
plugin.convertProcess(publicDir).catch((err) => {
	console.error(String(err));
	process.exit(1);
});
