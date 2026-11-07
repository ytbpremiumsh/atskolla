import { build } from 'esbuild';
await build({
  entryPoints: ['android-native/scripts/invoice-entry.ts'],
  outfile: 'android-native/app/src/main/assets/invoice-renderer.js',
  bundle: true, minify: true, format: 'iife', platform: 'browser', target: 'chrome100',
  external: ['canvg', 'html2canvas', 'dompurify'],
  alias: { '@': new URL('../../src', import.meta.url).pathname },
});
