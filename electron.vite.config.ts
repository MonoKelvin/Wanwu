import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { rendererFullReloadInDev } from './scripts/vite-renderer-full-reload'

const sharedAlias = {
  '@shared': resolve(__dirname, 'src/shared'),
  '@modules': resolve(__dirname, 'src/modules')
}

function rendererManualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) {
    if (id.includes('/src/shared/stores/')) return 'stores'
    if (id.includes('/src/app/router/')) return 'app-router'
    return undefined
  }
  if (id.includes('three') || id.includes('postprocessing') || id.includes('three-mesh-bvh')) {
    return 'vendor-three'
  }
  if (id.includes('@primeuix')) return 'vendor-primeuix'
  if (id.includes('primevue')) return 'vendor-primevue'
  if (id.includes('@tiptap')) return 'vendor-tiptap'
  if (id.includes('hls.js') || id.includes('howler')) return 'vendor-media'
  if (id.includes('@lucide') || id.includes('lucide')) return 'vendor-icons'
  if (id.includes('gsap')) return 'vendor-gsap'
  if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
    return 'vendor-vue'
  }
  return undefined
}

const skipRenderer = process.env.WANWU_SKIP_RENDERER === '1'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: sharedAlias
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@app': resolve(__dirname, 'src/app'),
        ...sharedAlias
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload.ts')
        }
      }
    }
  },
  ...(skipRenderer
    ? {}
    : {
  renderer: {
    root: '.',
    server: {
      host: '127.0.0.1',
      strictPort: true,
      watch: {
        // debug ingest 写入 .cursor/debug-*.log 会触发 handleHotUpdate → 整页刷新 → bootstrap 永远无法完成
        ignored: ['**/.cursor/**', '**/debug-*.log']
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true
        }
      }
    },
    build: {
      target: 'es2022',
      cssMinify: true,
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html')
        },
        output: {
          manualChunks: rendererManualChunks
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@app': resolve(__dirname, 'src/app'),
        '@modules': resolve(__dirname, 'src/modules'),
        '@library': resolve(__dirname, 'src/modules/library/core'),
        '@renderer': resolve(__dirname, 'src/renderer'),
        '@features': resolve(__dirname, 'src/modules'),
        ...sharedAlias,
        '@assets': resolve(__dirname, 'assets')
      }
    },
    plugins: [vue(), rendererFullReloadInDev()]
  }
  })
})
