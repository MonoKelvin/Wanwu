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
      },
      dark: {
        primary: {
          color: '#f4f4f5',
          contrastColor: '#18181b',
          hoverColor: '#e4e4e7',
          activeColor: '#fafafa'
        },
        highlight: {
          background: '#252528',
          focusBackground: '#2e2e32',
          color: '#f4f4f5',
          focusColor: '#fafafa'
        },
        surface: {
          0: '#18181b',
          50: '#1f1f23',
          100: '#27272a',
          200: '#2e2e32',
          300: '#3f3f46',
          400: '#52525b',
          500: '#71717a',
          600: '#a1a1aa',
          700: '#d4d4d8',
          800: '#e4e4e7',
          900: '#f4f4f5',
          950: '#fafafa'
        },
        text: {
          color: '#f4f4f5',
          mutedColor: '#a1a1aa',
          hoverColor: '#fafafa',
          hoverMutedColor: '#e4e4e7'
        }
      }
    }
  }
})
