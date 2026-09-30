// Wraps the artifact build into one HTML page; libraries load from CDNs.
import { readFileSync, writeFileSync } from 'node:fs';

const dir = 'dist-artifact/build';
const js = readFileSync(`${dir}/app.js`, 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(`${dir}/app.css`, 'utf8');
const libs = [
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/dayjs/1.11.13/dayjs.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/antd/6.6.5/antd-with-locales.min.js',
  'https://cdn.jsdelivr.net/npm/@ant-design/icons@6.3.4/dist/index.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];
const html = `<title>Revenue Calculator</title>
<style>${css}</style>
<div id="root"></div>
${libs.map((s) => `<script src="${s}"></script>`).join('\n')}
<script>${js}</script>
`;
writeFileSync('dist-artifact/revenue-calculator.html', html);
console.log(`dist-artifact/revenue-calculator.html ${(html.length / 1024).toFixed(1)} kB`);
