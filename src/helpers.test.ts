import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { getBasePath, replaceRoot } from './helpers';

describe('getBasePath', () => {
	it('keeps the previous behaviour for a short relative base/fullPath (existing games)', () => {
		const base = 'build';
		const fullPath = path.join('build', 'spine_audio', 'poster.wav');

		expect(getBasePath(fullPath, base, path.sep)).toBe(path.join('spine_audio', 'poster.wav'));
	});

	it('keeps the previous behaviour for a file directly inside base (no nested folders)', () => {
		const fullPath = path.join('build', 'poster.wav');

		expect(getBasePath(fullPath, 'build', path.sep)).toBe('poster.wav');
	});

	it('resolves correctly for an absolute base/fullPath (variant build --outDir)', () => {
		const base = path.join(path.sep, 'tmp', 'absolute-dist-target');
		const fullPath = path.join(base, 'spine_audio', 'poster.wav');

		expect(getBasePath(fullPath, base, path.sep)).toBe(path.join('spine_audio', 'poster.wav'));
	});
});

describe('replaceRoot', () => {
	it('keeps the previous behaviour for a short relative base/filePath (existing games)', () => {
		const base = 'build';
		const filePath = path.join('build', 'animations', 'bg.png');

		expect(replaceRoot(filePath, base, 'resourceCache', path.sep)).toBe(
			path.join('resourceCache', 'animations', 'bg.png')
		);
	});

	it('keeps the previous behaviour for a file directly inside base (no nested folders)', () => {
		const filePath = path.join('build', 'bg.png');

		expect(replaceRoot(filePath, 'build', 'resourceCache', path.sep)).toBe(path.join('resourceCache', 'bg.png'));
	});

	it('resolves correctly for an absolute base/filePath (variant build --outDir)', () => {
		const base = path.join(path.sep, 'tmp', 'absolute-dist-target');
		const filePath = path.join(base, 'animations', 'bg.png');

		expect(replaceRoot(filePath, base, 'resourceCache', path.sep)).toBe(
			path.join('resourceCache', 'animations', 'bg.png')
		);
	});

	it('throws for an empty filePath', () => {
		expect(() => replaceRoot('', 'build', 'resourceCache', path.sep)).toThrow();
	});
});
