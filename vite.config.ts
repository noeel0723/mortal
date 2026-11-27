import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  base: './',
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { outDir: '../dist/web', emptyOutDir: true },
  plugins: [{
    name: 'mortal-offline',
    apply: 'build',
    generateBundle: {
      order: 'post',
      handler(_, bundle) {
        const files = [...new Set(['index.html', ...Object.keys(bundle)])].sort();
        const worker = readFileSync(new URL('./web/offline.js', import.meta.url), 'utf8');
        const version = createHash('sha256').update(worker).update(JSON.stringify(files))
          .update(String(bundle['index.html']?.type === 'asset' ? bundle['index.html'].source : '')).digest('hex').slice(0, 12);
        this.emitFile({
          type: 'asset', fileName: 'sw.js',
          source: worker.replace('__VERSION__', version)
            .replace('const files = __FILES__;', `const files = ${JSON.stringify(files.map((file) => `./${file}`))};`),
        });
      },
    },
  }],
});
