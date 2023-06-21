/* eslint-disable import/no-extraneous-dependencies */
import ffmpegStatic from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { unlink, writeFile, readFile, copyFile } from 'node:fs/promises';
import { extname, join, sep, dirname } from 'node:path';
import ffprobeStatic from 'ffprobe-static';
import ffprobe from 'ffprobe';
import sharp from 'sharp';
import { createHash } from 'node:crypto';

import { replaceRoot, waitConvert } from './helpers';
import { Ext } from './types';

sharp.cache(false);

export function getBasePath(fullPath: string): string {
	return fullPath.split(sep).slice(1).join('/');
}

export function getFilesPaths(inputPath: string): ReadonlyArray<string> {
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

export function execCommand(params: ReadonlyArray<string>): Promise<void> {
	return new Promise((resolve, reject) => {
		if (!ffmpegStatic) throw new Error('ffmpeg not found');
		spawn(ffmpegStatic, params).on('error', reject).on('exit', resolve);
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

export async function getAudioDuration(soundPath: string): Promise<number> {
	try {
		const { streams } = await ffprobe(soundPath, { path: ffprobeStatic.path });
		const { duration } = streams.find(({ duration }) => !!duration) ?? {};
		if (!duration) throw new Error(`Sound ${soundPath} duration not found`);
		return parseFloat(duration);
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
	const newPath = replaceRoot(imagePath, storageDir);
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
	} catch (err) {
		throw new Error(`${convertImage.name} error ${String(err)}`);
	}
}

export async function convertSound(
	soundPath: string,
	formatsOptions: Record<Extract<Ext, Ext.mp3 | Ext.ogg | Ext.m4a>, ReadonlyArray<string>>,
	storageDir: string
): Promise<void> {
	const ext = extname(soundPath);
	const newPath = replaceRoot(soundPath, storageDir);
	checkDir(dirname(newPath));
	try {
		await Promise.all([
			execCommand(['-i', soundPath, ...formatsOptions[Ext.mp3], newPath.replace(ext, Ext.mp3)]),
			execCommand(['-i', soundPath, ...formatsOptions[Ext.ogg], newPath.replace(ext, Ext.ogg)]),
			execCommand(['-i', soundPath, ...formatsOptions[Ext.m4a], newPath.replace(ext, Ext.m4a)]),
		]);
	} catch (err) {
		throw new Error(`sound ${soundPath} failed: \n${String(err)}`);
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
	const splitPath = dirPath.split('/').splice(0, index).join('/');
	if (!existsSync(splitPath)) mkdirSync(splitPath);
	checkDir(dirPath, index + 1);
}
