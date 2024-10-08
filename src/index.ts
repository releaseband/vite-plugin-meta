import path from 'node:path';
import process from 'node:process';
import { Logger, PluginOption } from 'vite';

import MetaPlugin from './MetaPlugin';
import { buildError, errorStack, greenText, redText } from './utils';
import { MetaPluginOption } from './types';

export type PluginConfig = {
	readonly command: 'build' | 'serve';
	readonly logger: Logger;
	readonly publicDir: string;
	readonly outDir: string;
};

function createError(err: unknown): string {
	process.exitCode = 1;
	const error = buildError(err);
	return `\n${redText(error.message)}${errorStack(error)}`;
}

type MetaPluginConfig = Partial<MetaPluginOption> & {
	readonly convert?: boolean;
	readonly audioDuration?: boolean;
};

const metaPlugin = (pluginConfig: MetaPluginConfig = {}): PluginOption => {
	const { convert = true, audioDuration = true, ...options } = pluginConfig;
	const plugin = new MetaPlugin({
		version: process.env['GAME_VERSION'],
		...options,
	});

	let config: PluginConfig;

	return {
		name: 'vite-plugin-meta',
		configResolved(viteConfig) {
			const sep = viteConfig.publicDir.includes(path.win32.sep) ? path.win32.sep : path.posix.sep;
			config = {
				command: viteConfig.command,
				logger: viteConfig.logger,
				outDir: viteConfig.build.outDir,
				publicDir: viteConfig.publicDir.split(sep).at(-1) ?? '',
			};
		},
		async buildStart() {
			if (config.command === 'build') return;
			try {
				plugin.selectFiles(config.publicDir);
				if (audioDuration) await plugin.audioDurationProcess();
				await plugin.writeConfig(false, config.publicDir);
			} catch (err) {
				config.logger.error(createError(err));
			}
		},

		async buildEnd() {
			if (config.command === 'build') return;
			try {
				await plugin.removeConfig();
			} catch (err) {
				config.logger.error(createError(err));
			}
		},
		async closeBundle() {
			if (config.command !== 'build') return;
			const { logger, outDir } = config;
			logger.info(`\n${greenText('Metaprocesses started')}`);
			try {
				if (convert) await plugin.convertProcess(config.publicDir);
				plugin.selectFiles(outDir);
				if (audioDuration) await plugin.audioDurationProcess();
				await plugin.writeConfig(convert, outDir);
				if (convert) await plugin.transferProcess();
				logger.info(`${greenText('✓')} metaprocesses completed\n`);
			} catch (err) {
				logger.error(createError(err));
			}
		},
	};
};

export default metaPlugin;
