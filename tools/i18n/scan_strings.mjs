#!/usr/bin/env node

/**
 * Simple heuristic scanner that lists literal strings in Vue templates
 * so we know which ones still need $t()/l10n coverage.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')
const appDir = path.join(repoRoot, 'opsdash')
const defaultDirs = [
  path.join(appDir, 'src'),
  path.join(appDir, 'templates'),
]

const includeDirs = process.argv.slice(2).filter(Boolean)
const searchDirs = includeDirs.length ? includeDirs : defaultDirs

const IGNORE_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.vite',
  '.next',
])

const results = []

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return
  }
  const stat = fs.statSync(dir)
  if (!stat.isDirectory()) {
    scanFile(dir)
    return
  }
  for (const entry of fs.readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue
    walk(path.join(dir, entry))
  }
}

function scanFile(file) {
  if (!file.endsWith('.vue')) return
  const rel = path.relative(repoRoot, file)
  const content = fs.readFileSync(file, 'utf-8')
  const lines = content.split(/\r?\n/)
  const textRegex = />\s*([^<>{}]*[A-Za-z][^<>{}]*)\s*</g
  lines.forEach((line, index) => {
    let match
    while ((match = textRegex.exec(line)) !== null) {
      const text = match[1].trim()
      if (!text) continue
      if (text.startsWith('{{') || text.endsWith('}}')) continue
      if (/^(&nbsp;|\d+|[-–—·•]+)$/.test(text)) continue
      results.push({
        file: rel,
        line: index + 1,
        text,
      })
    }
  })
}

searchDirs.forEach((dir) => walk(dir))

if (results.length === 0) {
  console.log('[i18n] No candidate literal strings found.')
  process.exit(0)
}

results.sort((a, b) => {
  if (a.file !== b.file) return a.file.localeCompare(b.file)
  return a.line - b.line
})

console.log(`[i18n] Found ${results.length} candidate template strings:`)
for (const result of results) {
  console.log(`${result.file}:${result.line}  ${result.text}`)
}
