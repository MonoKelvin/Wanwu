import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

/** 黑白主色 + 中性灰点缀，扁平无描边 */
export const WanwuPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f5f5f6',
      100: '#ececee',
      200: '#d8d8dc',
      300: '#b8b8c0',
      400: '#94949c',
      500: '#6e6e76',
      600: '#52525a',
      700: '#3a3a42',
      800: '#242428',
      900: '#121214',
      950: '#0a0a0c'
    },
    colorScheme: {
      light: {
        primary: {
          color: '#121214',
          contrastColor: '#ffffff',
          hoverColor: '#3a3a42',
          activeColor: '#242428'
        },
        highlight: {
          background: '#ececee',
          focusBackground: '#e0e0e4',
          color: '#3a3a42',
          focusColor: '#242428'
        },
        surface: {
          0: '#ffffff',
          50: '#f5f5f6',
          100: '#ececee',
          200: '#e2e2e5',
          300: '#cacad0',
          400: '#a1a1a8',
          500: '#6e6e76',
          600: '#52525a',
          700: '#3a3a42',
          800: '#242428',
          900: '#121214',
          950: '#09090b'
        },
        text: {
          color: '#121214',
          mutedColor: '#5a5a62',
          hoverColor: '#121214',
          hoverMutedColor: '#3a3a42'
        }
      }
    }
  }
})
