import path from 'node:path';
import process from 'node:process';
import { Logger, PluginOption } from 'vite';

import MetaPlugin from './MetaPlugin';
import { buildError, errorStack, greenText, redText } from './utils';

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

const metaPlugin = (isProd = true): PluginOption => {
	const version = process.env['GAME_VERSION'] || '0.0.0';
	const plugin = new MetaPlugin('meta.json', version);

	let config: PluginConfig;

	return {
		name: 'vite-plugin-meta',
		configResolved(viteConfig) {
			config = {
				command: viteConfig.command,
				logger: viteConfig.logger,
				outDir: viteConfig.build.outDir,
				publicDir: viteConfig.publicDir.split(path.sep).at(-1) ?? '',
			};
		},
		async buildStart() {
			if (config.command === 'build') return;
			try {
				plugin.selectFiles(config.publicDir);
				await plugin.audioDurationProcess();
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
				plugin.selectFiles(outDir);
				const jobs = [plugin.audioDurationProcess()];
				if (isProd) jobs.push(plugin.imagesConversionProcess(), plugin.soundsConversionProcess());
				await Promise.all(jobs);
				await plugin.writeConfig(isProd, outDir);
				logger.info(`${greenText('✓')} metaprocesses completed\n`);
			} catch (err) {
				logger.error(createError(err));
			}
		},
	};
};

export default metaPlugin;
