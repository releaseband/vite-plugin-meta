import process from 'node:process';
import MetaPlugin from './MetaPlugin';
import { Names } from './types';

const enum Flags {
	storageDir = '--storage',
	publicDir = '--public',
	configName = '--config',
	selectFilesLog = '--selectFiles',
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

const storageDir = getParameter(Flags.storageDir) ?? Names.storageDir;
const publicDir = getParameter(Flags.publicDir) ?? Names.publicDir;
const hashConfigName = getParameter(Flags.configName) ?? Names.hashConfigName;
const selectFilesLog = checkParameter(Flags.selectFilesLog);

const plugin = new MetaPlugin({ storageDir, hashConfigName, selectFilesLog });
plugin.convertProcess(publicDir).catch((err) => {
	console.error(String(err));
	process.exit(1);
});
