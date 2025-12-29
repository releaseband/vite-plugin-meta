import process from 'node:process';

import MetaPlugin from './MetaPlugin';
import { Names } from './types';

const enum Flags {
	storageDir = '--storageDir',
	publicDir = '--publicDir',
	configName = '--config',
	imageExt = '--imageExt',
	soundExt = '--soundExt',
	selectFilesLog = '--selectFilesLog',
	filesHashLog = '--filesHashLog',
	convertLog = '--convertLog',
	optionLog = '--optionLog',
	publicLog = '--publicLog',
	fileChangeLog = '--fileChangeLog',
	exclude = '--exclude',
	losslessImages = '--losslessImages',
	quality = '--quality',
	prefixes = '--prefixes',
}

const SEPARATOR = ',';

export const strTrim = (str: string) => str.trim();

export const getParameter = (key: string): string | null => {
	const index = process.argv.findIndex((str) => str === key);
	if (index === -1) return null;
	return process.argv[index + 1] ?? null;
};

export const checkParameter = (key: string): boolean => {
	const index = process.argv.findIndex((str) => str === key);
	return index !== -1;
};

const rawImageExt = getParameter(Flags.imageExt);
const rawSoundExt = getParameter(Flags.soundExt);
const rawExclude = getParameter(Flags.exclude);
const rawLosslessImages = getParameter(Flags.losslessImages);
const rawQuality = getParameter(Flags.quality);
const rawPrefixes = getParameter(Flags.prefixes);

const plugin = new MetaPlugin({
	storageDir: getParameter(Flags.storageDir) ?? Names.storageDir,
	hashConfigName: getParameter(Flags.configName) ?? Names.hashConfigName,
	imageExt: rawImageExt ?? void 0,
	soundExt: rawSoundExt ?? void 0,
	selectFilesLog: checkParameter(Flags.selectFilesLog),
	filesHashLog: checkParameter(Flags.filesHashLog),
	convertLog: checkParameter(Flags.convertLog),
	optionLog: checkParameter(Flags.optionLog),
	publicLog: checkParameter(Flags.publicLog),
	fileChangeLog: checkParameter(Flags.fileChangeLog),
	losslessImages: rawLosslessImages?.split(SEPARATOR).map(strTrim),
	exclude: rawExclude?.split(SEPARATOR).map(strTrim),
	quality: rawQuality !== null ? Number(rawQuality) : void 0,
	prefixes: rawPrefixes ? rawPrefixes.split(SEPARATOR).map(Number) : void 0,
});

const publicDir = getParameter(Flags.publicDir) ?? Names.publicDir;
plugin.convertProcess(publicDir).catch((err: unknown) => {
	console.error(String(err));
	process.exit(1);
});
