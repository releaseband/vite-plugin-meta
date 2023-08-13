/* eslint-disable import/no-extraneous-dependencies */
import ffmpegStatic from 'ffmpeg-static';
import { exec } from 'node:child_process';
import { createReadStream, createWriteStream, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { unlink, writeFile, readFile, copyFile } from 'node:fs/promises';
import { extname, join, sep, dirname } from 'node:path';
import ffprobeStatic from 'ffprobe-static';
import ffprobe, { type FileInfo } from 'ffprobe';
import sharp from 'sharp';
import { createHash } from 'node:crypto';

import { replaceRoot, waitConvert } from './helpers';
import { Ext, VideoCodecs } from './types';

export function getFilesPaths(inputPath: string): ReadonlyArray<string> {
	if (!existsSync(inputPath)) return [];
	const filesPath: Array<string> = [];
	readdirSync(inputPath).forEach((nestedPath) => {
		try {
			const currentPath = join(inputPath, nestedPath);
			const stats = statSync(currentPath);
			if (stats.isDirectory()) filesPath.push(...getFilesPaths(currentPath));
			else filesPath.push(currentPath);
		} catch (err) {
			throw new Error(`getFilesPaths ${nestedPath} failed: \n${String(err)}`);
		}
	});
	return filesPath;
}

export function ffmpeg(...params: ReadonlyArray<string>): Promise<void> {
	return new Promise((resolve, reject) => {
		if (!ffmpegStatic) throw new Error('ffmpeg not found');
		exec(`${ffmpegStatic} ${params.join(' ')}`)
			.on('error', reject)
			.on('exit', (code) => {
				if (code === 0) resolve();
				else reject(new Error(`ffmpeg exit with code ${code}`));
			});
	});
}

export async function removeFile(filePath: string) {
	try {
		if (existsSync(filePath)) await unlink(filePath);
	} catch (err) {
		throw new Error(`removeFile ${filePath} failed: \n${String(err)}`);
	}
}

export async function readConfig(filePath: string): Promise<unknown | null> {
	try {
		if (!existsSync(filePath)) return null;
		const file = await readFile(filePath, { encoding: 'utf-8' });
		return JSON.parse(file);
	} catch (err) {
		throw new Error(`readConfig ${filePath} failed: \n${String(err)}`);
	}
}

export async function writeConfig(dirPath: string, config: unknown): Promise<void> {
	try {
		await writeFile(dirPath, JSON.stringify(config));
	} catch (err) {
		throw new Error(`writeConfig ${dirPath} failed: \n${String(err)}`);
	}
}

export async function getFileInfo(filePath: string): Promise<FileInfo> {
	const response = await ffprobe(filePath, { path: ffprobeStatic.path });
	const [info] = response.streams;
	if (!info) throw new Error(`File ${filePath} has no information`);
	return info;
}

export async function getAudioDuration(soundPath: string): Promise<number> {
	try {
		const { duration } = await getFileInfo(soundPath);
		if (!duration) throw new Error(`Sound ${soundPath} duration not found`);
		return globalThis.parseFloat(duration);
	} catch (err) {
		if (!err) throw new Error(`Sound ${soundPath} error`);
		if (err instanceof Error) throw err;
		throw new Error(String(err));
	}
}

export async function transferFile(fromFilePath: string, toFilePath: string): Promise<void> {
	try {
		await copyFile(fromFilePath, toFilePath);
	} catch (err) {
		throw new Error(`${transferFile.name} error \n` + String(err));
	}
}

export async function convertImage(imagePath: string, storageDir: string): Promise<void> {
	const ext = extname(imagePath);
	const newPath = replaceRoot(imagePath, storageDir, sep);
	checkDir(dirname(newPath));
	const factory = sharp();
	const avif = factory.clone().avif();
	const webp = factory.clone().webp();
	const png = factory.clone().png({ palette: true, compressionLevel: 9 });
	const jobs = [waitConvert(avif), waitConvert(webp), waitConvert(png)];
	avif.pipe(createWriteStream(newPath.replace(ext, Ext.avif)));
	webp.pipe(createWriteStream(newPath.replace(ext, Ext.webp)));
	png.pipe(createWriteStream(newPath.replace(ext, Ext.png)));
	createReadStream(imagePath).pipe(factory);
	try {
		await Promise.all(jobs);
		sharp.cache(false);
	} catch (err) {
		throw new Error(`${convertImage.name} ${imagePath} file error:\n${String(err)}`);
	}
}

export async function convertAnimation(animationPath: string, storageDir: string): Promise<void> {
	const ext = extname(animationPath);
	const newPath = replaceRoot(animationPath, storageDir, sep);
	checkDir(dirname(newPath));
	try {
		await Promise.all([
			copyFile(animationPath, newPath),
			ffmpeg('-i', animationPath, '-y', '-loop', '0', newPath.replace(ext, Ext.webp)),
			ffmpeg('-i', animationPath, '-y', '-c:v', 'libaom-av1', newPath.replace(ext, Ext.avif)),
		]);
	} catch (err) {
		throw new Error(`${convertAnimation.name} ${animationPath} file error:\n${String(err)}`);
	}
}

export async function convertSound(
	soundPath: string,
	formatsOptions: Record<Extract<Ext, Ext.mp3 | Ext.ogg | Ext.m4a>, string>,
	storageDir: string
): Promise<void> {
	const ext = extname(soundPath);
	const newPath = replaceRoot(soundPath, storageDir, sep);
	checkDir(dirname(newPath));
	try {
		await Promise.all([
			ffmpeg('-i', soundPath, formatsOptions[Ext.mp3], newPath.replace(ext, Ext.mp3)),
			ffmpeg('-i', soundPath, formatsOptions[Ext.ogg], newPath.replace(ext, Ext.ogg)),
			ffmpeg('-i', soundPath, formatsOptions[Ext.m4a], newPath.replace(ext, Ext.m4a)),
		]);
	} catch (err) {
		throw new Error(`${convertSound.name} ${soundPath} file error:\n${String(err)}`);
	}
}

export async function convertVideo(
	videoPath: string,
	formatsOptions: Record<Extract<Ext, Ext.mp4 | Ext.av1>, string>,
	storageDir: string
): Promise<void> {
	const ext = extname(videoPath);
	const newPath = replaceRoot(videoPath, storageDir, sep);
	checkDir(dirname(newPath));
	try {
		await Promise.all([
			ffmpeg('-i', videoPath, formatsOptions[Ext.mp4], newPath.replace(ext, Ext.mp4)),
			ffmpeg('-i', videoPath, formatsOptions[Ext.av1], newPath.replace(ext, `.${VideoCodecs.av1}${Ext.mp4}`)),
		]);
	} catch (err) {
		throw new Error(`${convertVideo.name} ${videoPath} file error:\n${String(err)}`);
	}
}

export async function makeHash(filePath: string): Promise<string> {
	const readStream = createReadStream(filePath);
	const hash = createHash('md5');
	hash.setEncoding('hex');
	return new Promise((resolve) => {
		readStream.on('end', () => resolve(hash.end().read())).pipe(hash);
	});
}

export function checkDir(dirPath: string, index = 1) {
	if (existsSync(dirPath)) return;
	const splitPath = dirPath.split(sep).splice(0, index).join(sep);
	if (!existsSync(splitPath)) mkdirSync(splitPath);
	checkDir(dirPath, index + 1);
}
