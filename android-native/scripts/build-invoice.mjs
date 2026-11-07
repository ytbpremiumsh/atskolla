import { build } from 'esbuild';
await build({
  entryPoints: ['android-native/scripts/invoice-entry.ts'],
  outfile: 'android-native/app/src/main/assets/invoice-renderer.js',
  bundle: true, minify: true, format: 'iife', platform: 'browser', target: 'chrome100',
  external: ['canvg', 'html2canvas', 'dompurify'],
  alias: { '@': new URL('../../src', import.meta.url).pathname },
});
const { writeFile } = await import('node:fs/promises');
const channelsBuild = await build({ entryPoints: ['src/lib/paymentChannels.ts'], bundle: true, write: false, format: 'esm', platform: 'node', alias: { '@': new URL('../../src', import.meta.url).pathname } });
const channels = await import('data:text/javascript;base64,' + Buffer.from(channelsBuild.outputFiles[0].text).toString('base64'));
await writeFile('android-native/app/src/main/assets/payment-channels.json', JSON.stringify({channels: channels.PAYMENT_CHANNELS, qrisMinimum:channels.QRIS_MIN_FEE, qrisPercent:channels.QRIS_PERCENT_DEFAULT, feeCases:[10000,250000,1000000].map(amount=>({amount,fee:channels.computeChannelFee('qris',amount,{qris:5000},.01)}))}));
