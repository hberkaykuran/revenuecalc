import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run build` -> dist/ (static site, e.g. GitHub Pages)
// `npm run build:artifact` -> dist-artifact/revenue-calculator.html (single page, React from cdnjs)
export default defineConfig(({ mode }) => {
  if (mode !== 'artifact') return { base: './', plugins: [react()] };
  return {
    plugins: [react({ jsxRuntime: 'classic' })],
    esbuild: { jsxInject: `import React from 'react'` },
    build: {
      outDir: 'dist-artifact/build',
      cssCodeSplit: false,
      rollupOptions: {
        input: 'src/main.tsx',
        external: ['react', 'react-dom/client'],
        output: {
          format: 'iife',
          entryFileNames: 'app.js',
          assetFileNames: 'app[extname]',
          globals: { react: 'React', 'react-dom/client': 'ReactDOM' },
        },
      },
    },
  };
});
