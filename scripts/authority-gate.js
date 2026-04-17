#!/usr/bin/env node
/**
 * authority-gate.js — Cross-Platform Anti-Pattern Scanner for Authority Constitution
 *
 * Detects forbidden fallback patterns that violate authority constitution:
 * 1. catch { setStage(...) } — fallback in catch blocks (FORBIDDEN)
 * 2. setStage in conditional that checks for missing result (OPTIMISTIC)
 *
 * These patterns represent "silent substitution" — renderer substituting
 * its own judgment when authority fails. This is a constitutional violation.
 *
 * Exit codes:
 *   0 = clean (no anti-patterns detected)
 *   1 = violations found (anti-patterns detected)
 *
 * Usage: node scripts/authority-gate.js [srcDir]
 *   srcDir - Source directory to scan (default: src)
 */

const fs = require('fs')
const path = require('path')

// Configuration
const SRC_DIR = process.argv[2] || 'src'
const RENDERER_DIR = path.join(SRC_DIR, 'renderer')

// File extensions to scan
const SCAN_EXTENSIONS = ['.ts', '.tsx']

// Files/directories to exclude from scanning
const EXCLUDE_PATTERNS = ['authority-constitution']

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Recursively find all files matching extensions in a directory
 */
function findFiles(dir, extensions, excludePatterns) {
  const results = []

  function walk(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)

        // Skip excluded patterns
        if (excludePatterns.some((pattern) => fullPath.includes(pattern))) {
          continue
        }

        if (entry.isDirectory()) {
          walk(fullPath)
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (extensions.includes(ext)) {
            results.push(fullPath)
          }
        }
      }
    } catch (err) {
      // Silently ignore permission errors or missing directories
    }
  }

  walk(dir)
  return results
}

/**
 * Check if a line is a comment line
 */
function isCommentLine(line) {
  const trimmed = line.trim()
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')
}

/**
 * Check if setStage appears in a comment on this line
 */
function isSetStageInComment(line) {
  // Match setStage appearing after // (comment marker)
  return /\/\/.*setStage/.test(line)
}

/**
 * Get context lines before and after a position in file content
 */
function getContextLines(content, startLine, endLine) {
  const lines = content.split('\n')
  return lines.slice(Math.max(0, startLine), endLine)
}

/**
 * Check if content contains an "if (!" pattern (missing result check)
 */
function hasMissingResultCheck(lines) {
  for (const line of lines) {
    if (isCommentLine(line)) continue
    // Match if statements with negation: if (!something)
    if (/if\s*\(\s*!/.test(line)) {
      return true
    }
  }
  return false
}

// =============================================================================
// Pattern 1: catch { setStage(...) }
// =============================================================================

function scanPattern1_catchSetStage(files) {
  const violations = []

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Skip comment lines
      if (isCommentLine(line)) continue

      // Look for 'catch' keyword
      if (/\bcatch\b/.test(line)) {
        // Get 8 lines after the catch (including the catch line itself)
        const contextAfter = getContextLines(content, i, Math.min(i + 9, lines.length))

        // Join context and check for setStage
        const contextText = contextAfter.join('\n')

        // Skip if this is the authority-constitution file
        if (file.includes('authority-constitution')) continue

        // Check if setStage appears in these lines
        if (/setStage/.test(contextText)) {
          // Verify setStage is not in a comment
          let hasRealSetStage = false
          for (let j = 0; j < contextAfter.length; j++) {
            const ctxLine = contextAfter[j]
            if (isCommentLine(ctxLine)) continue
            if (/setStage/.test(ctxLine) && !isSetStageInComment(ctxLine)) {
              hasRealSetStage = true
              break
            }
          }

          if (hasRealSetStage) {
            violations.push({
              file: file,
              line: i + 1,
              context: contextText.trim()
            })
          }
        }
      }
    }
  }

  return violations
}

// =============================================================================
// Pattern 2: Optimistic setStage on missing result
// =============================================================================

function scanPattern2_optimisticSetStage(files) {
  const violations = []

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Skip comment lines
      if (isCommentLine(line)) continue

      // Look for 'setStage' keyword
      if (!/setStage/.test(line)) continue

      // Skip if setStage is in a comment
      if (isSetStageInComment(line)) continue

      // Skip if this is the authority-constitution file
      if (file.includes('authority-constitution')) continue

      // Get 5 lines before this setStage call
      const startLine = Math.max(0, i - 5)
      const contextBefore = getContextLines(content, startLine, i)

      // Check if any of the preceding lines contain "if (!" pattern
      if (hasMissingResultCheck(contextBefore)) {
        violations.push({
          file: file,
          line: i + 1,
          context: contextBefore.join('\n').trim()
        })
      }
    }
  }

  return violations
}

// =============================================================================
// Main Execution
// =============================================================================

function main() {
  console.log('=== Authority Gate: Anti-Pattern Scanner ===')
  console.log(`Source: ${SRC_DIR}`)
  console.log('')
  console.log('Looking for forbidden authority fallback patterns...')
  console.log('')

  // Find all TypeScript files in renderer directory
  const files = findFiles(RENDERER_DIR, SCAN_EXTENSIONS, EXCLUDE_PATTERNS)

  if (files.length === 0) {
    console.log('WARNING: No .ts/.tsx files found in renderer directory')
    console.log('')
  }

  let totalViolations = 0

  // =============================================================================
  // Pattern 1: catch { setStage(...) }
  // =============================================================================
  console.log('--- Pattern 1: catch { setStage(...) } ---')

  const pattern1Violations = scanPattern1_catchSetStage(files)

  if (pattern1Violations.length > 0) {
    console.log('FOUND: catch block with setStage:')
    for (const v of pattern1Violations) {
      console.log(`${v.file}:${v.line}`)
    }
    totalViolations++
  } else {
    console.log('  ✓ No catch { setStage(...) } patterns found')
  }
  console.log('')

  // =============================================================================
  // Pattern 2: Optimistic setStage on missing result
  // =============================================================================
  console.log('--- Pattern 2: Optimistic setStage on missing result ---')

  const pattern2Violations = scanPattern2_optimisticSetStage(files)

  if (pattern2Violations.length > 0) {
    console.log('FOUND: Optimistic setStage on missing result:')
    for (const v of pattern2Violations) {
      console.log(`${v.file}:${v.line}`)
    }
    totalViolations++
  } else {
    console.log('  ✓ No optimistic stage update patterns found')
  }
  console.log('')

  // =============================================================================
  // Summary
  // =============================================================================
  console.log('==========================================')
  console.log('=== Authority Gate Summary ===')
  console.log('==========================================')
  console.log('')

  if (totalViolations === 0) {
    console.log('✓ RESULT: CLEAN (exit 0)')
    console.log('')
    console.log('No authority anti-patterns detected.')
    console.log('The codebase follows authority constitution:')
    console.log('  • Stage transitions go through main process')
    console.log('  • Authority failures surface as explicit errors')
    console.log('  • No optimistic local stage updates')
    console.log('')
    process.exit(0)
  } else {
    console.log('✗ RESULT: VIOLATIONS FOUND (exit 1)')
    console.log('')
    console.log(`Authority anti-patterns detected: ${totalViolations} pattern type(s)`)
    console.log('')
    console.log('These patterns violate the authority constitution:')
    console.log('  • catch { setStage(...) } — FORBIDDEN fallback in catch blocks')
    console.log('  • Optimistic setStage on missing result — FORBIDDEN')
    console.log('')
    console.log('Stage must come from main process authority, not local interpretation.')
    console.log('Reference: src/shared/domain/workflow/authority-constitution.ts')
    console.log('')
    process.exit(1)
  }
}

main()
