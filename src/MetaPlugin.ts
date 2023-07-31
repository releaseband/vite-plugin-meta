import path from 'node:path';
import {
	checkDir,
	convertImage,
	convertAnimation,
	convertSound,
	getAudioDuration,
	getFileInfo,
	getFilesPaths,
	makeHash,
	readConfig,
	removeFile,
	transferFile,
	writeConfig,
} from './processes';
import { Ext, MetaPluginOption, Names } from './types';
import { createSoundsConfig, createTexturesConfig, getBasePath, replaceRoot } from './helpers';
import { fileLog } from './utils';

// https://sound.stackexchange.com/questions/42711/what-is-the-difference-between-vorbis-and-opus
// https://slhck.info/video/2017/02/24/vbr-settings.html
// https://tritondigitalcommunity.force.com/s/article/Choosing-Audio-Bitrate-Settings?language=en_US
// https://ffmpeg.org/ffmpeg.html
const soundOptions = ['-vn', '-y', '-ar', '44100', '-ac', '2'];
const formats = {
	'.mp3': [...soundOptions, '-f', 'mp3', '-aq', '6'],
	'.ogg': [...soundOptions, '-acodec', 'libvorbis', '-f', 'ogg', '-aq', '2'],
	'.m4a': [...soundOptions, '-ab', '96k', '-strict', '-2'],
};

export default class MetaPlugin {
	private configPath?: string;

	private imagesFiles = new Array<string>();

	private soundsFiles = new Array<string>();

	private animationsFiles = new Array<string>();

	private trackDuration: Record<string, number> = {};

	private filesHash: Record<string, string> = {};

	private publicDir = '';

	private readonly option: MetaPluginOption;

	constructor(option: Partial<MetaPluginOption> = {}) {
		this.option = {
			version: option.version ?? '0.0.0',
			metaConfigName: option.metaConfigName ?? Names.metaConfigName,
			hashConfigName: option.hashConfigName ?? Names.hashConfigName,
			storageDir: option.storageDir ?? Names.storageDir,
			selectFilesLog: option.selectFilesLog,
			filesHashLog: option.filesHashLog,
			converLog: option.converLog,
			optionLog: option.optionLog,
			publicLog: option.publicLog,
			fileChangeLog: option.fileChangeLog,
		};
		if (option.optionLog) console.log(this.option);
	}

	public selectFiles(publicDir: string): void {
		this.publicDir = publicDir;
		const imagesExt: ReadonlyArray<string> = [Ext.png, Ext.jpg, Ext.jpeg];
		const soundsExt: ReadonlyArray<string> = [Ext.wav];
		const animationsExt: ReadonlyArray<string> = [Ext.gif];

		if (this.option.publicLog) console.log(publicDir);
		[this.imagesFiles, this.soundsFiles, this.animationsFiles] = getFilesPaths(publicDir).reduce(
			([imagesFiles, soundsFiles, animationsFiles], file) => {
				const extname = path.extname(file).toLowerCase();
				if (imagesExt.includes(extname)) imagesFiles.push(file);
				else if (soundsExt.includes(extname)) soundsFiles.push(file);
				else if (animationsExt.includes(extname)) animationsFiles.push(file);
				return [imagesFiles, soundsFiles, animationsFiles];
			},
			[new Array<string>(), new Array<string>(), new Array<string>()]
		);
		if (this.option.selectFilesLog) console.log(this.imagesFiles, this.soundsFiles, this.animationsFiles);
	}

	private async loadHashs(): Promise<void> {
		checkDir(this.option.storageDir);
		const hashConfig = await readConfig(path.join(this.option.storageDir, this.option.hashConfigName));
		if (hashConfig) this.filesHash = hashConfig as Record<string, string>;
		if (this.option.filesHashLog) console.log(this.filesHash);
	}

	public async audioDurationProcess(): Promise<void> {
		const jobs = this.soundsFiles.map(async (soundPath) => {
			try {
				const audioDuration = await getAudioDuration(soundPath);
				let key = getBasePath(soundPath, path.sep);
				if (path.sep !== '/') key = key.replaceAll(path.sep, '/');
				this.trackDuration[key] = audioDuration;
			} catch (err) {
				throw new Error(`audioDurationProcess ${soundPath} failed: \n${String(err)}`);
			}
		});
		await Promise.all(jobs);
	}

	private async imagesConversionProcess(): Promise<void> {
		const jobs = this.imagesFiles.map(async (imagePath) => {
			try {
				const fileHash = await makeHash(imagePath);
				if (this.option.converLog) console.log(imagePath, this.filesHash[imagePath], fileHash);
				if (this.filesHash[imagePath] === fileHash) return;
				await convertImage(imagePath, this.option.storageDir);
				if (this.option.fileChangeLog) fileLog('add', imagePath);
				this.filesHash[imagePath] = fileHash;
			} catch (err) {
				throw new Error(`imagesConversionProcess failed: \n${String(err)}`);
			}
		});
		await Promise.all(jobs);
	}

	private async soundsConversionProcess(): Promise<void> {
		const jobs = this.soundsFiles.map(async (soundPath) => {
			try {
				const fileHash = await makeHash(soundPath);
				if (this.option.converLog) console.log(soundPath, this.filesHash[soundPath], fileHash);
				if (this.filesHash[soundPath] === fileHash) return;
				await convertSound(soundPath, formats, this.option.storageDir);
				if (this.option.fileChangeLog) fileLog('add', soundPath);
				this.filesHash[soundPath] = fileHash;
			} catch (err) {
				throw new Error(`soundsConversionProcess failed: \n${String(err)}`);
			}
		});
		await Promise.all(jobs);
	}

	private async animationConversionProcess(): Promise<void> {
		const jobs = this.animationsFiles.map(async (animationPath) => {
			try {
				const { nb_frames } = await getFileInfo(animationPath);
				if (nb_frames && +nb_frames > 50) {
					console.warn(`image "${animationPath}" contains ${nb_frames} frames`);
				}
				const fileHash = await makeHash(animationPath);
				if (this.option.converLog) console.log(animationPath, this.filesHash[animationPath], fileHash);
				if (this.filesHash[animationPath] === fileHash) return;
				await convertAnimation(animationPath, this.option.storageDir);
				if (this.option.fileChangeLog) fileLog('add', animationPath);
				this.filesHash[animationPath] = fileHash;
			} catch (err) {
				throw new Error(`animationConversionProcess failed: \n${String(err)}`);
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
		const animationsExt: ReadonlyArray<string> = [Ext.gif, Ext.webp, Ext.avif];
		const jobs = getFilesPaths(this.option.storageDir).map(async (filePath) => {
			const extname = path.extname(filePath);
			let newPath = replaceRoot(filePath, this.publicDir, path.sep);
			if (imagesExt.includes(extname)) {
				newPath = newPath.replace(extname, Ext.png);
				if (this.imagesFiles.includes(newPath)) return;
				if (this.animationsFiles.includes(newPath.replace(Ext.png, Ext.gif))) return;
				await removeFile(filePath);
				if (this.option.fileChangeLog) fileLog('remove', filePath);
				delete this.filesHash[newPath];
				return;
			}
			if (soundsExt.includes(extname)) {
				newPath = newPath.replace(extname, Ext.wav);
				if (this.soundsFiles.includes(newPath)) return;
				await removeFile(filePath);
				if (this.option.fileChangeLog) fileLog('remove', filePath);
				delete this.filesHash[newPath];
			}
			if (animationsExt.includes(extname)) {
				newPath = newPath.replace(extname, Ext.gif);
				if (this.animationsFiles.includes(newPath)) return;
				if (this.imagesFiles.includes(newPath.replace(Ext.gif, Ext.png))) return;
				await removeFile(filePath);
				if (this.option.fileChangeLog) fileLog('remove', filePath);
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
		await this.animationConversionProcess();
		await this.writeHashConfig();
	}

	public async transferProcess(): Promise<void> {
		const imagesJobs = this.imagesFiles.map(async (filePath) => {
			const ext = path.extname(filePath);
			const newPath = replaceRoot(filePath, this.option.storageDir, path.sep);
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
			const newPath = replaceRoot(filePath, this.option.storageDir, path.sep);
			await removeFile(filePath);
			await Promise.all([
				transferFile(newPath.replace(ext, Ext.m4a), filePath.replace(ext, Ext.m4a)),
				transferFile(newPath.replace(ext, Ext.ogg), filePath.replace(ext, Ext.ogg)),
				transferFile(newPath.replace(ext, Ext.mp3), filePath.replace(ext, Ext.mp3)),
			]);
		});
		await Promise.all(soundJobs);
		const animationJobs = this.animationsFiles.map(async (filePath) => {
			const ext = path.extname(filePath);
			const newPath = replaceRoot(filePath, this.option.storageDir, path.sep);
			await removeFile(filePath);
			await Promise.all([
				transferFile(newPath.replace(ext, Ext.gif), filePath.replace(ext, Ext.gif)),
				transferFile(newPath.replace(ext, Ext.webp), filePath.replace(ext, Ext.webp)),
				transferFile(newPath.replace(ext, Ext.avif), filePath.replace(ext, Ext.avif)),
			]);
		});
		await Promise.all(animationJobs);
	}

	public async removeConfig(): Promise<void> {
		if (!this.configPath) return;
		await removeFile(this.configPath);
		this.imagesFiles = new Array<string>();
		this.soundsFiles = new Array<string>();
		this.animationsFiles = new Array<string>();
	}
}
