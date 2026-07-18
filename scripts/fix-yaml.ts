import fs from 'fs'
import path from 'path'

function fixFile(fp: string): boolean {
  let content = fs.readFileSync(fp, 'utf-8')
  const orig = content

  // Fix the author field: strip everything that breaks YAML double-quoted strings
  content = content.replace(/author:\s*"(.+?)"/, (_match: string, val: string) => {
    let cleaned = val
      .replace(/\\/g, '')
      .replace(/\[/g, '')
      .replace(/\]/g, '')
      .replace(/\(/g, '')
      .replace(/\)/g, '')
      .replace(/</g, '')
      .replace(/>/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/"/g, '')
      .trim()
      .slice(0, 50)
    if (!cleaned) cleaned = 'unknown'
    return 'author: "' + cleaned + '"'
  })

  if (content !== orig) {
    fs.writeFileSync(fp, content, 'utf-8')
    return true
  }
  return false
}

let fixed = 0
for (const lang of ['en', 'zh']) {
  for (const cat of ['photography', 'product', 'people']) {
    const dir = path.join('content', lang, cat)
    if (!fs.existsSync(dir)) continue
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.mdx')) continue
      if (fixFile(path.join(dir, f))) fixed++
    }
  }
}
console.log('Fixed ' + fixed + ' files')
