---
"@releaseband/vite-plugin-meta": patch
---

Fix `trackDuration` keying in `meta.json` so it works with an absolute `--outDir` (as passed by the variant build executor), not just a short relative one. `audioDurationProcess` used `getBasePath`, which naively dropped only the first path segment — the same bug already fixed for `resourceCache` in #85, just left unpatched in this sibling code path. `getBasePath` now takes an explicit `base` and computes the key via `path.relative(base, fullPath)`, which fixes absolute-path keys (previously e.g. `home/sasha/.../dist/spine_audio/x.wav` instead of `spine_audio/x.wav`) while leaving the relative-path case (all existing games) byte-for-byte unchanged.
