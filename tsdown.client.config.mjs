import { fileURLToPath } from 'node:url'

export default {
  entry: { client: fileURLToPath(new URL('./src/client/index.ts', import.meta.url)) },
  outDir: fileURLToPath(new URL('./lib', import.meta.url)),
  format: 'cjs',
  target: 'es2022',
  dts: false,
  sourcemap: false,
  clean: false,
  inputOptions: { platform: 'browser' },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: 'window.__ModuleLoader__.load({ id: "@dsh-plugin/dsh-spellcheck-off", factory: (require) => {',
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
    codeSplitting: false,
  },
}
