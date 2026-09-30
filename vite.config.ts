import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const shim = (f: string) => fileURLToPath(new URL(`./src/shims/${f}`, import.meta.url));

// `npm run build` -> dist/ (static site, e.g. GitHub Pages)
// `npm run build:artifact` -> dist-artifact/revenue-calculator.html (React, antd, icons and dayjs from CDNs)
export default defineConfig(({ mode }) => {
  if (mode !== 'artifact') return { base: './', plugins: [react()] };
  return {
    plugins: [react({ jsxRuntime: 'classic' })],
    esbuild: { jsxInject: `import React from 'react'` },
    resolve: { alias: { 'antd/locale/tr_TR': shim('tr.ts'), 'antd/locale/en_US': shim('en.ts') } },
    build: {
      outDir: 'dist-artifact/build',
      cssCodeSplit: false,
      rollupOptions: {
        input: 'src/main.tsx',
        external: ['react', 'react-dom', 'react-dom/client', 'antd', '@ant-design/icons', 'dayjs', 'xlsx'],
        output: {
          format: 'iife',
          entryFileNames: 'app.js',
          assetFileNames: 'app[extname]',
          globals: { react: 'React', 'react-dom': 'ReactDOM', 'react-dom/client': 'ReactDOM', antd: 'antd', '@ant-design/icons': 'icons', dayjs: 'dayjs', xlsx: 'XLSX' },
        },
      },
    },
  };
});
