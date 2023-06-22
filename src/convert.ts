import process from 'node:process';
import MetaPlugin from './MetaPlugin';
import { Names } from './types';

const enum Flags {
	storageDir = '--storageDir',
	publicDir = '--publicDir',
	configName = '--config',
	selectFilesLog = '--selectFilesLog',
	filesHashLog = '--filesHashLog',
	converLog = '--converLog',
	optionLog = '--optionLog',
	publicLog = '--publicLog',
	fileChangeLog = '--fileChangeLog',
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

const plugin = new MetaPlugin({
	storageDir: getParameter(Flags.storageDir) ?? Names.storageDir,
	hashConfigName: getParameter(Flags.configName) ?? Names.hashConfigName,
	selectFilesLog: checkParameter(Flags.selectFilesLog),
	filesHashLog: checkParameter(Flags.filesHashLog),
	converLog: checkParameter(Flags.converLog),
	optionLog: checkParameter(Flags.optionLog),
	publicLog: checkParameter(Flags.publicLog),
	fileChangeLog: checkParameter(Flags.fileChangeLog),
});

const publicDir = getParameter(Flags.publicDir) ?? Names.publicDir;
plugin.convertProcess(publicDir).catch((err) => {
	console.error(String(err));
	process.exit(1);
});
