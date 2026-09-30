type Downloads = { save: (f: { filename: string; data: Blob | string }) => Promise<unknown> };

/** Save a file: through the claude.ai viewer when inside an artifact, else a normal download link. */
export async function saveFile(filename: string, data: Blob): Promise<'saved' | 'declined'> {
  const w = window as unknown as { claude?: { use: (n: string) => Promise<Downloads | null> } };
  const dl = w.claude ? await w.claude.use('downloads').catch(() => null) : null;
  if (dl) {
    try { await dl.save({ filename, data }); return 'saved'; } catch { return 'declined'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(data);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return 'saved';
}
