import path from 'node:path';

import {
	Ext,
	checkDir,
	convertImage,
	convertSound,
	createSoundsConfig,
	createTexturesConfig,
	getAudioDuration,
	getBasePath,
	getFilesPaths,
	makeHash,
	readConfig,
	removeFile,
	transferFile,
	writeConfig,
} from './processes';
import { MetaPluginOption, Names } from './types';
import { replaceRoot } from './helpers';

// https://sound.stackexchange.com/questions/42711/what-is-the-difference-between-vorbis-and-opus
// https://slhck.info/video/2017/02/24/vbr-settings.html
// https://tritondigitalcommunity.force.com/s/article/Choosing-Audio-Bitrate-Settings?language=en_US
const formats = {
	'.mp3': ['-f', 'mp3', '-aq', '6'],
	'.ogg': ['-acodec', 'libvorbis', '-f', 'ogg', '-aq', '2'],
	'.m4a': ['-ab', '96k', '-strict', '-2'],
};

function fileLog(...args: unknown[]) {
	// eslint-disable-next-line no-console
	console.log('\t - ', ...args);
}

export default class MetaPlugin {
	private configPath?: string;

	private imagesFiles = new Array<string>();

	private soundsFiles = new Array<string>();

	private trackDuration: Record<string, number> = {};

	private filesHash: Record<string, string> = {};

	private publicDir = '';

	private readonly option: Required<MetaPluginOption>;

	constructor(option: MetaPluginOption = {}) {
		this.option = {
			version: process.env['GAME_VERSION'] || '0.0.0',
			metaConfigName: option.metaConfigName ?? Names.metaConfigName,
			hashConfigName: option.hashConfigName ?? Names.hashConfigName,
			storageDir: option.storageDir ?? Names.storageDir,
			selectFilesLog: option.selectFilesLog ?? false,
			filesHashLog: option.filesHashLog ?? false,
			converLog: option.converLog ?? false,
		};
	}

	public selectFiles(publicDir: string): void {
		this.publicDir = publicDir;
		const imagesExt: ReadonlyArray<string> = [Ext.png, Ext.jpg, Ext.jpeg];
		const soundsExt: ReadonlyArray<string> = [Ext.wav];
		[this.imagesFiles, this.soundsFiles] = getFilesPaths(publicDir).reduce(
			([imagesFiles, soundsFiles], file) => {
				const extname = path.extname(file).toLowerCase();
				if (imagesExt.includes(extname)) return [[...imagesFiles, file], soundsFiles];
				else if (soundsExt.includes(extname)) return [imagesFiles, [...soundsFiles, file]];
				return [imagesFiles, soundsFiles];
			},
			[new Array<string>(), new Array<string>()]
		);
		if (this.option.selectFilesLog) console.log(this.imagesFiles, this.soundsFiles);
	}

	public async loadHashs(): Promise<void> {
		checkDir(this.option.storageDir);
		const hashConfig = await readConfig(path.join(this.option.storageDir, this.option.hashConfigName));
		if (hashConfig) this.filesHash = hashConfig as Record<string, string>;
		if (this.option.filesHashLog) console.log(this.filesHash);
	}

	public async audioDurationProcess(): Promise<void> {
		const jobs = this.soundsFiles.map(async (soundPath) => {
			try {
				const audioDuration = await getAudioDuration(soundPath);
				this.trackDuration[getBasePath(soundPath)] = audioDuration;
			} catch (err) {
				throw new Error(`audioDurationProcess ${soundPath} failed: \n${String(err)}`);
			}
		});
		await Promise.all(jobs);
	}

	public async imagesConversionProcess(): Promise<void> {
		const jobs = this.imagesFiles.map(async (imagePath) => {
			try {
				const fileHash = await makeHash(imagePath);
				if (this.option.converLog) console.log(imagePath, this.filesHash[imagePath], fileHash);
				if (this.filesHash[imagePath] === fileHash) return;
				await convertImage(imagePath, this.option.storageDir);
				fileLog('add', imagePath);
				this.filesHash[imagePath] = fileHash;
			} catch (err) {
				throw new Error(`imagesConversionProcess failed: \n${String(err)}`);
			}
		});
		await Promise.all(jobs);
	}

	public async soundsConversionProcess(): Promise<void> {
		const jobs = this.soundsFiles.map(async (soundPath) => {
			try {
				const fileHash = await makeHash(soundPath);
				if (this.option.converLog) console.log(soundPath, this.filesHash[soundPath], fileHash);
				if (this.filesHash[soundPath] === fileHash) return;
				await convertSound(soundPath, formats, this.option.storageDir);
				fileLog('add', soundPath);
				this.filesHash[soundPath] = fileHash;
			} catch (err) {
				throw new Error(`soundsConversionProcess failed: \n${String(err)}`);
			}
		});
		await Promise.all(jobs);
	}

	public async writeConfig(prod: boolean, dir: string): Promise<void> {
		const jobs = [this.removeConfig()];
		if (prod) jobs.push(...this.soundsFiles.map((soundPath) => removeFile(soundPath)));
		await Promise.all(jobs);
		const metaConfig = {
			prod,
			gameVersion: this.option.version,
			textures: createTexturesConfig(prod),
			sounds: createSoundsConfig(prod, this.trackDuration),
		};
		this.configPath = path.join(dir, this.option.metaConfigName);
		await writeConfig(this.configPath, metaConfig);
	}

	public async writeHashConfig(): Promise<void> {
		const configPath = path.join(this.option.storageDir, this.option.hashConfigName);
		await writeConfig(configPath, this.filesHash);
	}

	private async checkFiles() {
		const imagesExt: ReadonlyArray<string> = [Ext.png, Ext.avif, Ext.webp];
		const soundsExt: ReadonlyArray<string> = [Ext.m4a, Ext.mp3, Ext.ogg];
		const jobs = getFilesPaths(this.option.storageDir).map(async (filePath) => {
			const extname = path.extname(filePath);
			let newPath = replaceRoot(filePath, this.publicDir);
			if (imagesExt.includes(extname)) {
				newPath = newPath.replace(extname, Ext.png);
				if (this.imagesFiles.includes(newPath)) return;
				await removeFile(filePath);
				fileLog('remove', filePath);
				delete this.filesHash[newPath];
				return;
			}
			if (soundsExt.includes(extname)) {
				newPath = newPath.replace(extname, Ext.wav);
				if (this.soundsFiles.includes(newPath)) return;
				await removeFile(filePath);
				fileLog('remove', filePath);
				delete this.filesHash[newPath];
			}
		});
		await Promise.all(jobs);
	}

	public async convertProcess(publicDir: string): Promise<void> {
		this.selectFiles(publicDir);
		await this.loadHashs();
		await this.checkFiles();
		await this.imagesConversionProcess();
		await this.soundsConversionProcess();
		await this.writeHashConfig();
	}

	public async transferProcess(): Promise<void> {
		const imagesJobs = this.imagesFiles.map(async (filePath) => {
			const ext = path.extname(filePath);
			const newPath = replaceRoot(filePath, this.option.storageDir);
			await removeFile(filePath);
			await Promise.all([
				transferFile(newPath.replace(ext, Ext.png), filePath.replace(ext, Ext.png)),
				transferFile(newPath.replace(ext, Ext.avif), filePath.replace(ext, Ext.avif)),
				transferFile(newPath.replace(ext, Ext.webp), filePath.replace(ext, Ext.webp)),
			]);
		});
		await Promise.all(imagesJobs);
		const soundJobs = this.soundsFiles.map(async (filePath) => {
			const ext = path.extname(filePath);
			const newPath = replaceRoot(filePath, this.option.storageDir);
			await removeFile(filePath);
			await Promise.all([
				transferFile(newPath.replace(ext, Ext.m4a), filePath.replace(ext, Ext.m4a)),
				transferFile(newPath.replace(ext, Ext.ogg), filePath.replace(ext, Ext.ogg)),
				transferFile(newPath.replace(ext, Ext.mp3), filePath.replace(ext, Ext.mp3)),
			]);
		});
		await Promise.all(soundJobs);
	}

	public async removeConfig(): Promise<void> {
		if (!this.configPath) return;
		await removeFile(this.configPath);
		this.imagesFiles = new Array<string>();
		this.soundsFiles = new Array<string>();
	}
}
