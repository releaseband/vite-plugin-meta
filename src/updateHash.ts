import process from 'node:process';
import MetaPlugin from './MetaPlugin';
import { Names } from './types';

const enum Flags {
	storageDir = '--storage',
	publicDir = '--public',
	configName = '--config',
}

export const getParameter = (key: string): string | null => {
	const index = process.argv.findIndex((str) => str === key);
	if (index === -1) return null;
	return process.argv[index + 1] ?? null;
};

const storageDir = getParameter(Flags.storageDir) ?? Names.storageDir;
const publicDir = getParameter(Flags.publicDir) ?? Names.publicDir;
const hashConfigName = getParameter(Flags.configName) ?? Names.hashConfigName;

const plugin = new MetaPlugin({ storageDir, hashConfigName });
plugin.selectFiles(publicDir);
plugin.convertProcess().catch((err) => {
	console.error(String(err));
	process.exit(1);
});
