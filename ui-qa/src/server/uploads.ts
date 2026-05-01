import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RunRecord, UploadedSource } from '../shared/types';
import { addEvidence, emit, id, now, QAMVP_ROOT, rel, UPLOADS_ROOT } from './store';

export function classifyDocument(filename: string): string {
  const name = filename.toLowerCase();
  if (name.includes('business') || name.includes('brd')) return 'BRD';
  if (name.includes('functional') || name.includes('frs')) return 'FRS';
  if (name.includes('hld') || name.includes('high-level') || name.includes('high_level')) return 'HLD';
  if (name.includes('lld') || name.includes('low-level') || name.includes('low_level')) return 'LLD';
  return 'SOURCE_DOC';
}

async function sha256(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return createHash('sha256').update(buffer).digest('hex');
}

export async function saveUpload(run: RunRecord, file: File): Promise<UploadedSource> {
  const digest = await sha256(file);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const dir = path.join(UPLOADS_ROOT, run.id);
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, `${digest.slice(0, 12)}_${safeName}`);
  await writeFile(target, Buffer.from(await file.arrayBuffer()));

  const upload: UploadedSource = {
    id: id('src'),
    runId: run.id,
    originalName: file.name,
    storedPath: rel(target),
    documentType: classifyDocument(file.name),
    sha256: digest,
    size: file.size,
    status: 'accepted',
    createdAt: now(),
  };
  run.uploads.push(upload);
  await addEvidence(run, {
    kind: 'source',
    label: file.name,
    path: upload.storedPath,
    phase: 'upload_sources',
  });
  await emit(run, 'upload_sources', `Uploaded ${file.name}`, 'succeeded', {
    summary: `Classified as ${upload.documentType}.`,
    technical: { rawLabel: `upload:${file.name}`, payload: upload },
  });
  return upload;
}

export async function copyUploadsToSourcePack(run: RunRecord, packDir: string): Promise<void> {
  await mkdir(packDir, { recursive: true });
  for (const upload of run.uploads.filter((item) => item.status === 'accepted')) {
    const source = path.join(QAMVP_ROOT, upload.storedPath);
    const safeName = upload.originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const target = path.join(packDir, safeName || `${upload.documentType.toLowerCase()}-${upload.sha256.slice(0, 8)}${path.extname(source)}`);
    await writeFile(target, await readFile(source));
  }
  await writeFile(path.join(packDir, 'source-pack.json'), JSON.stringify(run.uploads, null, 2) + '\n', 'utf8');
}
