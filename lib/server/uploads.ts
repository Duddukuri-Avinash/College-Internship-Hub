import { readFile } from 'node:fs/promises'
import path from 'node:path'

export function uploadRoot(): string {
  return path.join(process.cwd(), 'backend', 'uploads')
}

export function resolveUpload(storageKey: string): string | null {
  const root = uploadRoot()
  const target = path.join(root, storageKey)
  return target.startsWith(`${root}${path.sep}`) ? target : null
}

export async function readUpload(storageKey: string): Promise<Buffer | null> {
  const target = resolveUpload(storageKey)
  if (!target) return null
  try {
    return await readFile(target)
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') return null
    throw error
  }
}
