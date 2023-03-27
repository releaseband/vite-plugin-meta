/* eslint-disable import/no-extraneous-dependencies */
import ffmpeg from 'ffmpeg-static';
import { exec } from 'node:child_process';
import { createReadStream, createWriteStream, readdirSync, statSync } from 'node:fs';
import { rename, stat, unlink, writeFile } from 'node:fs/promises';
import { extname, join, sep } from 'node:path';
import sharp from 'sharp';

import { MetaConfig, SoundsConfig, TexturesConfig, TrackDuration } from './types';

export const enum Ext {
  temp = '.temp',
  avif = '.avif',
  webp = '.webp',
  png = '.png',
  mp3 = '.mp3',
  ogg = '.ogg',
  m4a = '.m4a',
  jpg = '.jpg',
  jpeg = '.jpeg',
  wav = '.wav',
}

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

export function ffmpegCommand(
  input: string,
  format: string,
  settings: ReadonlyArray<string>,
): string {
  if (!ffmpeg) throw new Error('ffmpeg not found');
  const output = input.replace(extname(input), format);
  const options = ['-vn', '-y', '-ar', '44100', '-ac', '2'];
  return [ffmpeg, '-i', input, ...options, ...settings, output].join(' ');
}

export function createTexturesConfig(): TexturesConfig {
  return { formats: [Ext.avif, Ext.png, Ext.webp] };
}

export function createSoundsConfig(trackDuration: TrackDuration): SoundsConfig {
  return { formats: [Ext.m4a, Ext.mp3, Ext.ogg], trackDuration };
}

export async function execCommand(command: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    exec(command, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function removeFile(filePath: string) {
  try {
    const stats = await stat(filePath);
    if (stats) await unlink(filePath);
  } catch (err) {
    throw new Error(`removeFile ${filePath} failed: \n${String(err)}`);
  }
}

export async function writeConfig(dirPath: string, config: MetaConfig): Promise<void> {
  try {
    await writeFile(dirPath, JSON.stringify(config));
  } catch (err) {
    throw new Error(`writeConfig ${dirPath} failed: \n${String(err)}`);
  }
}

export async function makeTempFile(filePath: string): Promise<string> {
  try {
    const tempName = filePath.replace(extname(filePath), Ext.temp);
    await rename(filePath, tempName);
    return tempName;
  } catch (err) {
    throw new Error(`makeTempFile ${filePath} failed: \n${String(err)}`);
  }
}

export async function imageConvert(imagePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ext = extname(imagePath);
    const factory = sharp();
    const avif = factory.clone().avif();
    const webp = factory.clone().webp();
    const png = factory.clone().png({ palette: true, compressionLevel: 9 });
    avif.pipe(createWriteStream(imagePath.replace(ext, Ext.avif)));
    webp.pipe(createWriteStream(imagePath.replace(ext, Ext.webp)));
    png.pipe(createWriteStream(imagePath.replace(ext, Ext.png)));
    createReadStream(imagePath).on('error', reject).on('end', resolve).pipe(factory);
  });
}

export async function soundConvert(
  soundPath: string,
  formats: Record<Extract<Ext, Ext.mp3 | Ext.ogg | Ext.m4a>, ReadonlyArray<string>>,
): Promise<void> {
  try {
    await Promise.all([
      execCommand(ffmpegCommand(soundPath, Ext.mp3, formats[Ext.mp3])),
      execCommand(ffmpegCommand(soundPath, Ext.ogg, formats[Ext.ogg])),
      execCommand(ffmpegCommand(soundPath, Ext.m4a, formats[Ext.m4a])),
    ]);
  } catch (err) {
    throw new Error(`sound ${soundPath} failed: \n${String(err)}`);
  }
}
