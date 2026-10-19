import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/** Windows y macOS no distinguen mayúsculas: dos archivos que solo difieren en mayúsculas rompen el proyecto allí. */
function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))
}

describe('nombres de archivo', () => {
  it('no hay archivos que solo difieran en mayúsculas', () => {
    const seen = new Map<string, string>()
    const clashes: string[] = []
    for (const file of walk(join(process.cwd(), 'src'))) {
      const key = file.toLowerCase().replace(/\.(tsx?|css)$/, '')
      const prev = seen.get(key)
      if (prev) clashes.push(`${prev} ↔ ${file}`)
      seen.set(key, file)
    }
    expect(clashes).toEqual([])
  })
})
