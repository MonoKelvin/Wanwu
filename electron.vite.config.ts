import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { rendererFullReloadInDev } from './scripts/vite-renderer-full-reload'
// import glsl from 'vite-plugin-glsl'

const sharedAlias = {
  '@shared': resolve(__dirname, 'src/shared')
}

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
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload.ts')
        }
      }
    }
  },
  renderer: {
    root: '.',
    server: {
      host: '127.0.0.1',
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true
        }
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html')
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
    plugins: [
      vue(),
      rendererFullReloadInDev()
      // glsl({
      //   root: resolve(__dirname),
      //   include: ['**/*.glsl', '**/*.frag', '**/*.vert']
      // })
    ]
  }
})
