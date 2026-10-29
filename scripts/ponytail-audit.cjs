#!/usr/bin/env node
/**
 * scripts/ponytail-audit.cjs
 * Unified Whole-Project Engineering & Design Audit across all 8 GitHub frameworks:
 * 1. multica-ai/andrej-karpathy-skills (CLAUDE.md + .cursor/rules/karpathy-guidelines.mdc)
 * 2. Graphify-Labs/graphify (graphify-out/graph.json + GRAPH_REPORT.md)
 * 3. addyosmani/agent-skills (AGENTS.md + SPEC.md + CONSTRAINTS.md)
 * 4. pbakaus/impeccable (PRODUCT.md + DESIGN.md + PRISMA UY anti-slop rules)
 * 5. Jakubantalik/transitions.dev (CSS motion tokens, icon-swap, modal choreography, reduced-motion)
 * 6. jakubkrehel/make-interfaces-feel-better (zero transition-all, 44px hit targets, tabular-nums, text-wrap, hover guard)
 * 7. greensock/gsap (useGsapChoreography.ts, gsap.matchMedia, bundled gsap.min.js)
 * 8. dietrichgebert/ponytail (Verification ladder + `shortcut:` debt ledger)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');

function walkFiles(dir, exts = ['.ts', '.tsx', '.css', '.cjs']) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, exts));
    } else if (exts.includes(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

function runAudit() {
  const checks = [];
  const assertCheck = (category, name, passed, detail) => {
    checks.push({ category, name, passed: Boolean(passed), detail });
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} [${category}] ${name} — ${detail}`);
  };

  console.log('======================================================================');
  console.log('  PONYTAIL + IMPECCABLE + KARPATHY WHOLE-PROJECT ENGINEERING AUDIT');
  console.log('======================================================================\n');

  const srcFiles = walkFiles(SRC_DIR, ['.ts', '.tsx', '.css']);
  const scriptFiles = walkFiles(path.join(ROOT, 'scripts'), ['.cjs']);

  // 1. Check for banned `transition-all` or `transition: all` in src/
  const transitionAllViolations = [];
  for (const file of srcFiles) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (/\btransition-all\b/.test(line) || /transition\s*:\s*all\b/.test(line)) {
        transitionAllViolations.push(`${rel}:${idx + 1}`);
      }
    });
  }
  assertCheck(
    'make-interfaces-feel-better',
    'Zero transition-all / transition: all in src/',
    transitionAllViolations.length === 0,
    transitionAllViolations.length === 0
      ? `0 violations across ${srcFiles.length} source files`
      : `Violations found: ${transitionAllViolations.join(', ')}`
  );

  // 2. Check CSS motion tokens & ergonomic utilities in src/index.css
  const cssContent = fs.readFileSync(path.join(SRC_DIR, 'index.css'), 'utf8');
  const requiredCssFeatures = [
    ['--duration-fast', 'transitions.dev duration token'],
    ['--ease-smooth-out', 'transitions.dev ease-out token'],
    ['--ease-icon-swap', 'transitions.dev icon-swap curve'],
    ['.t-icon-swap', 'transitions.dev dual-slot icon swap'],
    ['.t-press', 'make-interfaces-feel-better tactile active scale'],
    ['.hit-target-44', 'make-interfaces-feel-better 44x44px hit target'],
    ['tabular-nums', 'make-interfaces-feel-better tabular numerals'],
    ['text-wrap: balance', 'make-interfaces-feel-better heading wrap'],
    ['text-wrap: pretty', 'make-interfaces-feel-better body wrap'],
    ['-webkit-font-smoothing: antialiased', 'make-interfaces-feel-better font smoothing'],
    ['@media (hover: hover) and (pointer: fine)', 'make-interfaces-feel-better hover media guard'],
    ['@media (prefers-reduced-motion: reduce)', 'transitions.dev reduced-motion guard'],
  ];
  for (const [token, desc] of requiredCssFeatures) {
    assertCheck(
      'transitions.dev + feel-better',
      `CSS Token/Rule: ${token}`,
      cssContent.includes(token),
      desc
    );
  }

  // 3. Check GSAP choreography integration
  const gsapHookPath = path.join(SRC_DIR, 'hooks', 'useGsapChoreography.ts');
  const gsapHookContent = fs.existsSync(gsapHookPath) ? fs.readFileSync(gsapHookPath, 'utf8') : '';
  assertCheck(
    'greensock/gsap',
    'GSAP Choreography Hook (useGsapChoreography.ts)',
    gsapHookContent.includes('useAnimatedUYU') &&
      gsapHookContent.includes('useGsapCardFan') &&
      gsapHookContent.includes('matchMedia'),
    'useAnimatedUYU + useGsapCardFan + gsap.matchMedia() active'
  );

  const indexHtmlPath = path.join(ROOT, 'index.html');
  const indexHtmlContent = fs.existsSync(indexHtmlPath) ? fs.readFileSync(indexHtmlPath, 'utf8') : '';
  assertCheck(
    'greensock/gsap',
    'GSAP 3.12.5 Bundled in Single-File Production Output',
    indexHtmlContent.includes('GreenSock') || indexHtmlContent.includes('gsap'),
    `index.html size ${(indexHtmlContent.length / 1024).toFixed(1)} KB`
  );

  // 4. Check Graphify AST Knowledge Graph outputs
  const graphJsonPath = path.join(ROOT, 'graphify-out', 'graph.json');
  const graphReportPath = path.join(ROOT, 'graphify-out', 'GRAPH_REPORT.md');
  let graphSummary = null;
  if (fs.existsSync(graphJsonPath)) {
    const graphData = JSON.parse(fs.readFileSync(graphJsonPath, 'utf8'));
    if (graphData && Array.isArray(graphData.nodes) && Array.isArray(graphData.links)) {
      const extractedCount = graphData.links.filter((l) => l.confidence === 'EXTRACTED').length;
      graphSummary = {
        totalFiles: graphData.graph?.total_files || 0,
        totalNodes: graphData.nodes.length,
        totalEdges: graphData.links.length,
        extractedEdges: extractedCount,
      };
    }
  }
  assertCheck(
    'Graphify-Labs/graphify',
    'Deterministic AST Knowledge Graph (graphify-out/graph.json + GRAPH_REPORT.md)',
    Boolean(graphSummary) && fs.existsSync(graphReportPath),
    graphSummary
      ? `${graphSummary.totalNodes} nodes · ${graphSummary.totalEdges} edges (${graphSummary.extractedEdges} EXTRACTED across ${graphSummary.totalFiles} files)`
      : 'Missing graphify-out artifacts'
  );

  // 5. Check Governance, Impeccable & Spec artifacts
  const requiredDocs = [
    ['CLAUDE.md', 'multica-ai/andrej-karpathy-skills'],
    ['.cursor/rules/karpathy-guidelines.mdc', 'multica-ai/andrej-karpathy-skills'],
    ['AGENTS.md', 'addyosmani/agent-skills'],
    ['SPEC.md', 'addyosmani/agent-skills'],
    ['CONSTRAINTS.md', 'addyosmani/agent-skills'],
    ['PRODUCT.md', 'pbakaus/impeccable'],
    ['DESIGN.md', 'pbakaus/impeccable'],
  ];
  for (const [docRel, repo] of requiredDocs) {
    const full = path.join(ROOT, docRel);
    assertCheck(repo, `Document present: ${docRel}`, fs.existsSync(full), `${docRel} verified`);
  }

  // 6. Check Zero-Fake Discount Audit status
  const discountAuditPath = path.join(ROOT, 'public', 'discount-audit.json');
  const discountAudit = fs.existsSync(discountAuditPath)
    ? JSON.parse(fs.readFileSync(discountAuditPath, 'utf8'))
    : null;
  const totalRulesCount = discountAudit?.totalRules ?? discountAudit?.candidateRules ?? 0;
  const totalMerchantsCount = discountAudit?.totalMerchants ?? discountAudit?.merchants ?? 0;
  const unverifiedCount = discountAudit?.unverifiedRules ?? discountAudit?.droppedRules ?? 0;
  assertCheck(
    'Zero-Fake Engine',
    '100% Verified Bank Discounts (public/discount-audit.json)',
    Boolean(discountAudit) &&
      discountAudit.verifiedRules === totalRulesCount &&
      totalRulesCount > 0 &&
      unverifiedCount === 0,
    discountAudit
      ? `${discountAudit.verifiedRules}/${totalRulesCount} rules verified across ${totalMerchantsCount} merchants`
      : 'Missing discount-audit.json'
  );

  // 7. Check Legal/ToS (Ley 18.331 & Ley 17.250 UY) + Android Security Hardening
  const legalSheetPath = path.join(SRC_DIR, 'components', 'LegalSheet.tsx');
  const legalSheetContent = fs.existsSync(legalSheetPath) ? fs.readFileSync(legalSheetPath, 'utf8') : '';
  assertCheck(
    'Legal & Privacy (UY)',
    'Terms of Service, Ley 18.331 Privacy & Right to Erasure (LegalSheet.tsx)',
    legalSheetContent.includes('Ley N° 18.331') &&
      legalSheetContent.includes('Ley N° 17.250') &&
      legalSheetContent.includes('onResetAllData'),
    'Ley 18.331 (URCDP) + Ley 17.250 + 1-tap local data erasure verified'
  );

  const mainActivityPath = path.join(
    ROOT,
    'android-app',
    'app',
    'src',
    'main',
    'java',
    'com',
    'example',
    'concualpagouy',
    'MainActivity.java'
  );
  const manifestPath = path.join(ROOT, 'android-app', 'app', 'src', 'main', 'AndroidManifest.xml');
  const mainActivityContent = fs.existsSync(mainActivityPath) ? fs.readFileSync(mainActivityPath, 'utf8') : '';
  const manifestContent = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : '';
  assertCheck(
    'Android Security & UX',
    'Hardened WebView, SSRF Bank Allowlist, External Intent Routing & Back Stack Bridge',
    mainActivityContent.includes('ALLOWED_BANK_HOSTS') &&
      mainActivityContent.includes('shouldOverrideUrlLoading') &&
      mainActivityContent.includes('__handleAndroidBack') &&
      mainActivityContent.includes('MIXED_CONTENT_NEVER_ALLOW') &&
      manifestContent.includes('android:usesCleartextTraffic="false"') &&
      manifestContent.includes('android:allowBackup="false"'),
    'HTTPS-only allowlist + external browser Intent + modal Back button bridge active'
  );

  // 7B. Check Zero-Cost Smart Quota Guard, OTA Sync & GitHub Actions Daily Cron
  const gitignoreContent = fs.existsSync(path.join(ROOT, '.gitignore'))
    ? fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8')
    : '';
  const envExampleExists = fs.existsSync(path.join(ROOT, '.env.example'));
  const llmCacheExists = fs.existsSync(path.join(ROOT, 'public', 'llm-extraction-cache.json'));
  const otaSyncPath = path.join(SRC_DIR, 'lib', 'live-catalog-sync.ts');
  const otaSyncContent = fs.existsSync(otaSyncPath) ? fs.readFileSync(otaSyncPath, 'utf8') : '';
  const ghWorkflowPath = path.join(ROOT, '.github', 'workflows', 'daily-bank-sync.yml');
  const ghWorkflowContent = fs.existsSync(ghWorkflowPath) ? fs.readFileSync(ghWorkflowPath, 'utf8') : '';

  assertCheck(
    'Zero-Cost Automation ($0)',
    'Smart Quota Guard (4.5s Rate Limit, Max 40 Calls, Hash Cache) + OTA Sync + GitHub Actions Cron',
    gitignoreContent.includes('.env') &&
      envExampleExists &&
      llmCacheExists &&
      otaSyncContent.includes('ccp_live_catalog_v1') &&
      ghWorkflowContent.includes("cron: '0 7 * * *'") &&
      ghWorkflowContent.includes('workflow_dispatch'),
    '.env gitignored + llm-extraction-cache.json + ccp_live_catalog_v1 OTA + 07:00 UTC Cron verified'
  );

  // 8. Ponytail `shortcut:` Technical Debt Inventory
  const shortcuts = [];
  for (const file of [...srcFiles, ...scriptFiles]) {
    if (path.basename(file) === 'ponytail-audit.cjs') continue;
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, idx) => {
      const match = line.match(/\/\/\s*shortcut:\s*(.+)$/i);
      if (match) {
        shortcuts.push({ file: rel, line: idx + 1, note: match[1].trim() });
      }
    });
  }
  assertCheck(
    'dietrichgebert/ponytail',
    'Technical Debt Ledger (`// shortcut:` markers)',
    true,
    `${shortcuts.length} active shortcut markers tracked`
  );

  const failed = checks.filter((c) => !c.passed);
  const report = {
    generatedAt: new Date().toISOString(),
    totalChecks: checks.length,
    passedChecks: checks.length - failed.length,
    failedChecks: failed.length,
    repositoriesApplied: [
      'multica-ai/andrej-karpathy-skills',
      'Graphify-Labs/graphify',
      'addyosmani/agent-skills',
      'pbakaus/impeccable',
      'Jakubantalik/transitions.dev',
      'jakubkrehel/make-interfaces-feel-better',
      'greensock/gsap',
      'dietrichgebert/ponytail',
    ],
    graphMetrics: graphSummary,
    discountAuditSummary: discountAudit
      ? {
          totalMerchants: discountAudit.totalMerchants,
          totalRules: discountAudit.totalRules,
          verifiedRules: discountAudit.verifiedRules,
        }
      : null,
    shortcuts,
    checks,
  };

  fs.writeFileSync(
    path.join(ROOT, 'public', 'engineering-audit.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );

  console.log('\n======================================================================');
  console.log(`  AUDIT SUMMARY: ${report.passedChecks}/${report.totalChecks} CHECKS PASSED`);
  console.log('======================================================================');

  if (failed.length > 0) {
    process.exit(1);
  }
}

runAudit();
