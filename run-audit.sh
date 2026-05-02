#!/bin/bash

# ============================================================
#  FULL AUDIT SCRIPT — Performance + Accessibility
#  Usage: bash run-audit.sh http://localhost:5173
# ============================================================

URL=${1:-"http://localhost:3000"}
OUT="./audit-results"
mkdir -p "$OUT"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║     AUTOMATED AUDIT — Starting...           ║"
echo "╚══════════════════════════════════════════════╝"
echo "  Target URL: $URL"
echo ""

# ── 1. LIGHTHOUSE (Performance + Accessibility + Best Practices + SEO)
echo "▶ [1/3] Running Lighthouse audit..."
lighthouse "$URL" \
  --output json \
  --output html \
  --output-path "$OUT/lighthouse" \
  --chrome-flags="--headless --no-sandbox --disable-gpu" \
  --only-categories=performance,accessibility,best-practices,seo \
  --quiet

echo "    ✅ Lighthouse done → $OUT/lighthouse.report.html"

# ── 2. Extract key scores from Lighthouse JSON
echo ""
echo "▶ [2/3] Extracting scores..."

node -e "
const fs = require('fs');
const raw = fs.readFileSync('$OUT/lighthouse.report.json', 'utf-8');
const lhr = JSON.parse(raw);

const scores = {
  performance:    Math.round(lhr.categories.performance.score * 100),
  accessibility:  Math.round(lhr.categories.accessibility.score * 100),
  bestPractices:  Math.round(lhr.categories['best-practices'].score * 100),
  seo:            Math.round(lhr.categories.seo.score * 100),
};

const vitals = {
  FCP:  lhr.audits['first-contentful-paint'].displayValue,
  LCP:  lhr.audits['largest-contentful-paint'].displayValue,
  TBT:  lhr.audits['total-blocking-time'].displayValue,
  CLS:  lhr.audits['cumulative-layout-shift'].displayValue,
  SI:   lhr.audits['speed-index'].displayValue,
  TTI:  lhr.audits['interactive'].displayValue,
};

// Accessibility issues
const a11yAudits = lhr.categories.accessibility.auditRefs
  .map(ref => lhr.audits[ref.id])
  .filter(a => a.score !== null && a.score < 1)
  .map(a => ({
    id: a.id,
    title: a.title,
    description: a.description,
    score: a.score,
    impact: a.details?.items?.length || 0
  }));

// Performance opportunities
const opportunities = Object.values(lhr.audits)
  .filter(a => a.details?.type === 'opportunity' && a.score !== null && a.score < 1)
  .map(a => ({
    title: a.title,
    savings: a.details?.overallSavingsMs || 0,
    displayValue: a.displayValue || ''
  }))
  .sort((a, b) => b.savings - a.savings);

const result = { scores, vitals, a11yAudits, opportunities, url: '$URL', date: new Date().toISOString() };
fs.writeFileSync('$OUT/summary.json', JSON.stringify(result, null, 2));

console.log('');
console.log('  📊 SCORES');
console.log('  ─────────────────────────────────');
console.log('  Performance:    ' + scores.performance + '/100');
console.log('  Accessibility:  ' + scores.accessibility + '/100');
console.log('  Best Practices: ' + scores.bestPractices + '/100');
console.log('  SEO:            ' + scores.seo + '/100');
console.log('');
console.log('  ⚡ CORE WEB VITALS');
console.log('  ─────────────────────────────────');
Object.entries(vitals).forEach(([k,v]) => console.log('  ' + k + ':  ' + v));
console.log('');
console.log('  ♿ ACCESSIBILITY ISSUES: ' + a11yAudits.length + ' found');
a11yAudits.slice(0,5).forEach(a => console.log('  - [' + (a.score === 0 ? 'FAIL' : 'WARN') + '] ' + a.title));
"

echo ""
echo "▶ [3/3] Generating Word report..."
node /home/claude/audit/generate-report.js

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║         ✅ AUDIT COMPLETE                   ║"
echo "╚══════════════════════════════════════════════╝"
echo "  Files generated:"
echo "  📄 $OUT/lighthouse.report.html   ← Full Lighthouse report"
echo "  📊 $OUT/summary.json             ← Raw data"
echo "  📝 $OUT/Performance-Report.docx  ← Final Word document"
echo ""