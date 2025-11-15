#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(process.cwd(), 'opsdash/src')
const results = []

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      walk(full)
    } else if (entry.endsWith('.vue')) {
      scanVue(full)
    }
  }
}

function scanVue(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  const regex = />\s*([^<>{}]*[A-Za-z][^<>{}]*)\s*</g
  lines.forEach((line, idx) => {
    let match
    while ((match = regex.exec(line)) !== null) {
      const text = match[1].trim()
      if (!text) continue
      if (text.startsWith('{{') || text.endsWith('}}')) continue
      if (/^(\.|,|&nbsp;|[-–—·•]+)$/.test(text)) continue
      results.push({ file, line: idx + 1, text })
    }
  })
}

if (!fs.existsSync(ROOT)) {
  console.error('[i18n] Expected opsdash/src to exist relative to repo root.')
  process.exit(1)
}

walk(ROOT)

if (!results.length) {
  console.log('[i18n] No literal strings detected.')
  process.exit(0)
}

console.log(`[i18n] Found ${results.length} candidate template strings:`)
for (const item of results) {
  console.log(`${path.relative(process.cwd(), item.file)}:${item.line}  ${item.text}`)
}
