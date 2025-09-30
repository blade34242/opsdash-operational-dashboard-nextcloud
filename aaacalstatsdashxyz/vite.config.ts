import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
const __dirname = dirname(fileURLToPath(import.meta.url))
import vue from '@vitejs/plugin-vue'

// Minimal Vite config to build a Nextcloud app bundle
// Outputs js/main.js so PHP can load it via Util::addScript($app, 'main')
export default defineConfig({
  plugins: [vue()],
  root: '.',
  resolve: {
    alias: {
      '@nextcloud/vue': resolve(__dirname, 'src/nc-stubs.ts'),
    }
  },
  build: {
    outDir: 'js',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: 'src/main.ts',
      output: {
        format: 'iife',
        entryFileNames: 'main47.js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) return '../css/[name][extname]'
          return 'assets/[name][extname]'
        },
        name: 'AaacalstatsdashxyzApp'
      }
    }
  }
})
