---
"@releaseband/vite-plugin-meta": patch
---

Fix `resourceCache` keying so it works with an absolute `--outDir`/`publicDir` (as passed by the variant build executor), not just a short relative one. `replaceRoot` now computes the cache key via `path.relative(base, filePath)` instead of naively swapping the first path segment, which fixes an `ENOENT` in `transferFile` for absolute paths while leaving the relative-path case (all existing games) byte-for-byte unchanged.
