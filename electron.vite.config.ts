import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

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
      strictPort: true
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
        '@renderer': resolve(__dirname, 'src/renderer'),
        '@features': resolve(__dirname, 'src/features'),
        ...sharedAlias,
        '@assets': resolve(__dirname, 'assets')
      }
    },
    plugins: [vue()]
  }
})
