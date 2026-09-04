---
"@releaseband/vite-plugin-meta": patch
---

Add a `#!/usr/bin/env node` shebang to the `file-convert` CLI entry point (`src/convert.ts`), which tsup now carries through to both `dist/convert.js` and `dist/convert.cjs` and marks executable. Without it, `node_modules/.bin/file-convert` fails to execute whenever pnpm links bins as bare symlinks instead of generating a wrapper script — notably under `node-linker=hoisted`, needed by Nx-migrated game/variant workspaces for `nx-game-variant-tools`' symlink-based variant layering. Only the CLI bin entry changes; the Vite plugin export (`src/index.ts`) is untouched.
