// Wraps the artifact build into one HTML page that loads React from cdnjs.
import { readFileSync, writeFileSync } from 'node:fs';

const dir = 'dist-artifact/build';
const js = readFileSync(`${dir}/app.js`, 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(`${dir}/app.css`, 'utf8');
const html = `<title>Revenue Calculator</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>${css}</style>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>${js}</script>
`;
writeFileSync('dist-artifact/revenue-calculator.html', html);
console.log(`dist-artifact/revenue-calculator.html ${(html.length / 1024).toFixed(1)} kB`);
