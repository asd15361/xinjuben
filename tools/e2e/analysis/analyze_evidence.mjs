import fs from 'node:fs'

const content = fs.readFileSync(
  'tools/e2e/out/userdata-xiuxian-full-real-mnefv14g/evidence/05-script.md',
  'utf8'
)

const episodes = content.split(/## 第 \d+ 集/).slice(1)
console.log('Total episodes found:', episodes.length)

for (let i = 0; i < episodes.length; i++) {
  const block = episodes[i]
  const epNo = i + 1
  const codeMatch = block.match(/```text\n([\s\S]*?)```/)
  if (codeMatch) {
    const text = codeMatch[1].trim()
    const charCount = text.length
    const voMatches = text.match(/（画外音）|（OS）|（旁白）|（V\.O\.）|（O\.S\.）/g)
    console.log(`Ep${epNo}: chars=${charCount}, VO=${voMatches ? voMatches.join(',') : 'NONE'}`)
  } else {
    console.log(`Ep${epNo}: NO CODE BLOCK`)
  }
}
