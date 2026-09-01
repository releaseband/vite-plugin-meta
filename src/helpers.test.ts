import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { replaceRoot } from './helpers';

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
