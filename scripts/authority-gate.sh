#!/bin/bash
# =============================================================================
# authority-gate.sh — Anti-Pattern Scanner for Authority Constitution
# =============================================================================
# Detects forbidden fallback patterns that violate authority constitution:
# 1. catch { setStage(...) } — fallback in catch blocks (FORBIDDEN)
# 2. setStage in conditional that checks for missing result (OPTIMISTIC)
#
# These patterns represent "silent substitution" — renderer substituting
# its own judgment when authority fails. This is a constitutional violation.
#
# Exit codes:
#   0 = clean (no anti-patterns detected)
#   1 = violations found (anti-patterns detected)
# =============================================================================

# Configuration
SRC_DIR="${1:-src}"
RENDERER_DIR="${SRC_DIR}/renderer"

echo "=== Authority Gate: Anti-Pattern Scanner ==="
echo "Source: ${SRC_DIR}"
echo ""
echo "Looking for forbidden authority fallback patterns..."
echo ""

VIOLATIONS=0

# =============================================================================
# Pattern 1: catch { setStage(...) }
# Anti-pattern: renderer catches error and sets stage locally as fallback
# FORBIDDEN: errors must surface, not silently handle
# =============================================================================
echo "--- Pattern 1: catch { setStage(...) } ---"
CATCH_VIOLATIONS=$(grep -rn "catch" "${RENDERER_DIR}" --include="*.ts" --include="*.tsx" -A 8 2>/dev/null | \
  grep -v "authority-constitution" | \
  grep "setStage" || true)

if [ -n "${CATCH_VIOLATIONS}" ]; then
  echo "FOUND: catch block with setStage:"
  echo "${CATCH_VIOLATIONS}"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "  ✓ No catch { setStage(...) } patterns found"
fi
echo ""

# =============================================================================
# Pattern 2: setStage called in optimistic conditional
# Anti-pattern: renderer checks for missing result and sets stage optimistically
# FORBIDDEN: missing result = authority failure, must surface as error
# =============================================================================
echo "--- Pattern 2: Optimistic setStage on missing result ---"
# Look for setStage immediately following a conditional check for missing result
# Using grep -B to get lines before the match
OPTIMISTIC_VIOLATIONS=""
while IFS=: read -r file linenum rest; do
  # Skip if linenum is not a number (Windows paths can cause issues)
  if ! [[ "$linenum" =~ ^[0-9]+$ ]]; then
    continue
  fi
  # Skip if the match is in a comment line
  if echo "$rest" | grep -q "^\s*//"; then
    continue
  fi
  # Skip if setStage appears after // (in a comment)
  if echo "$rest" | grep -v "^\s*//" | grep "setStage" | grep -q "//.*setStage"; then
    continue
  fi
  # Get 5 lines before this setStage call
  if [ "$linenum" -gt 5 ]; then
    start=$((linenum - 5))
  else
    start=1
  fi
  context=$(sed -n "${start},${linenum}p" "$file" 2>/dev/null)
  # Check for conditional checks like: if (!result...) or if (something == null)
  # Filter out comment lines first, then check for the pattern
  if echo "$context" | grep -v "^\s*//" | grep -qE "if\s*\(\s*!"; then
    OPTIMISTIC_VIOLATIONS="${OPTIMISTIC_VIOLATIONS}
${file}:${linenum}: ${rest}"
  fi
done < <(grep -rn "setStage" "${RENDERER_DIR}" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "authority-constitution" || true)

if [ -n "${OPTIMISTIC_VIOLATIONS}" ]; then
  echo "FOUND: Optimistic setStage on missing result:"
  echo "${OPTIMISTIC_VIOLATIONS}"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "  ✓ No optimistic stage update patterns found"
fi
echo ""

# =============================================================================
# Summary
# =============================================================================
echo "=========================================="
echo "=== Authority Gate Summary ==="
echo "=========================================="
echo ""

if [ ${VIOLATIONS} -eq 0 ]; then
  echo "✓ RESULT: CLEAN (exit 0)"
  echo ""
  echo "No authority anti-patterns detected."
  echo "The codebase follows authority constitution:"
  echo "  • Stage transitions go through main process"
  echo "  • Authority failures surface as explicit errors"
  echo "  • No optimistic local stage updates"
  echo ""
  exit 0
else
  echo "✗ RESULT: VIOLATIONS FOUND (exit 1)"
  echo ""
  echo "Authority anti-patterns detected: ${VIOLATIONS} pattern(s)"
  echo ""
  echo "These patterns violate the authority constitution:"
  echo "  • catch { setStage(...) } — FORBIDDEN fallback in catch blocks"
  echo "  • Optimistic setStage on missing result — FORBIDDEN"
  echo ""
  echo "Stage must come from main process authority, not local interpretation."
  echo "Reference: src/shared/domain/workflow/authority-constitution.ts"
  echo ""
  exit 1
fi
