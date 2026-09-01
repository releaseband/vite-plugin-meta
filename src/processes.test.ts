import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { replaceRoot } from './helpers';
import { convertImage } from './processes';

// sharp does real image encoding, which isn't needed here — the thing under test is where
// convertImage writes its output (the resourceCache key), not the image conversion itself.
// clone() shares the parent's input by piping into it, mimicking sharp's own clone() semantics.
vi.mock('sharp', () => {
	function factory() {
		const source = new PassThrough();
		Object.assign(source, {
			clone: () => {
				const cloned = new PassThrough();
				Object.assign(cloned, { avif: () => cloned, webp: () => cloned, png: () => cloned });
				source.pipe(cloned);
				return cloned;
			},
		});
		return source;
	}
	factory.cache = () => undefined;
	return { default: factory };
});

describe('convertImage cache keying with an absolute outDir/publicDir (PRO-2921)', () => {
	let originalCwd: string;
	let tmpRoot: string;

	beforeEach(() => {
		originalCwd = process.cwd();
		tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vite-plugin-meta-'));
		process.chdir(tmpRoot);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		fs.rmSync(tmpRoot, { recursive: true, force: true });
	});

	it('writes the converted asset to the exact key transferProcess looks it up at', async () => {
		// storageDir stays a short relative name (the real default), only publicDir/outDir
		// becomes absolute — matching what the nx-game-variant-tools build executor passes.
		const publicDir = path.join(tmpRoot, 'absolute-dist-target');
		const storageDir = 'resourceCache';
		fs.mkdirSync(path.join(publicDir, 'animations'), { recursive: true });
		const imagePath = path.join(publicDir, 'animations', 'bg.png');
		fs.writeFileSync(imagePath, 'fake-image-bytes');

		await convertImage(imagePath, publicDir, storageDir);

		// this is exactly what MetaPlugin's transferProcess computes for the same
		// (filePath, publicDir, storageDir) when looking up the converted file
		const cacheKey = replaceRoot(imagePath, publicDir, storageDir, path.sep);
		expect(cacheKey).toBe(path.join('resourceCache', 'animations', 'bg.png'));

		expect(fs.existsSync(cacheKey.replace('.png', '.avif'))).toBe(true);
		expect(fs.existsSync(cacheKey.replace('.png', '.webp'))).toBe(true);
		expect(fs.existsSync(cacheKey)).toBe(true);
	});
});
