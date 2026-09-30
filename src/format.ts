const nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
export const tl = (n: number) => nf.format(Math.abs(n) < 0.005 ? 0 : n);
export const tl0 = (n: number) => nf0.format(n);
export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
export const uid = () => Math.random().toString(36).slice(2, 9);
