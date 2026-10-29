#!/usr/bin/env node
/**
 * scripts/graphify-ast.cjs — Deterministic AST Codebase Knowledge Graph
 * Inspired by https://github.com/Graphify-Labs/graphify
 *
 * Pipeline:
 *   detect(root) -> extract(paths, root) -> build(extraction) -> cluster(G)
 *   -> analyze (god_nodes, surprising_connections, suggest_questions)
 *   -> report.generate() -> export.to_json()
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function detect(rootDir) {
  const dirs = ['src', 'scripts', 'android-app/app/src/main/java/com/example/concualpagouy'];
  const files = [];
  let totalWords = 0;

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx|cjs|js|java)$/.test(entry.name)) {
        const rel = path.relative(rootDir, full).replace(/\\/g, '/');
        const content = fs.readFileSync(full, 'utf8');
        const words = content.split(/\s+/).filter(Boolean).length;
        totalWords += words;
        files.push({ path: rel, fullPath: full, words, lines: content.split('\n').length });
      }
    }
  }

  for (const d of dirs) walk(path.join(rootDir, d));
  return {
    scan_root: rootDir.replace(/\\/g, '/'),
    total_files: files.length,
    total_words: totalWords,
    files,
  };
}

function extract(scanResult) {
  const nodes = [];
  const edges = [];
  const nodeMap = new Map();

  function addNode(id, label, source_file, source_location, kind, communityHint) {
    if (!nodeMap.has(id)) {
      const node = { id, label, source_file, source_location, kind, community: communityHint };
      nodeMap.set(id, node);
      nodes.push(node);
    }
    return nodeMap.get(id);
  }

  function addEdge(source, target, relation, confidence = 'EXTRACTED') {
    if (source === target) return;
    edges.push({
      source,
      target,
      _src: source,
      _tgt: target,
      relation,
      confidence,
    });
  }

  for (const f of scanResult.files) {
    const content = fs.readFileSync(f.fullPath, 'utf8');
    const lines = content.split('\n');
    const fileId = `file:${f.path}`;
    const community = f.path.startsWith('src/components')
      ? 'ui-components'
      : f.path.startsWith('src/hooks')
        ? 'hooks-motion'
        : f.path.startsWith('src/lib')
          ? 'fiscal-bank-engine'
          : f.path.startsWith('src/data')
            ? 'verified-data'
            : f.path.startsWith('scripts')
              ? 'verification-pipeline'
              : f.path.startsWith('android-app')
                ? 'android-native'
                : 'core-app';

    addNode(fileId, path.basename(f.path), f.path, 'L1', 'module', community);

    lines.forEach((line, idx) => {
      const lineNo = `L${idx + 1}`;

      // 1. Imports
      const importMatch = line.match(/^\s*import\s+.*?\s+from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        const rawTarget = importMatch[1];
        if (rawTarget.startsWith('.')) {
          const resolvedDir = path.dirname(f.path);
          let joined = path.posix.normalize(path.posix.join(resolvedDir, rawTarget));
          for (const ext of ['.ts', '.tsx', '.cjs', '.js']) {
            if (scanResult.files.some((sf) => sf.path === joined + ext)) {
              joined = joined + ext;
              break;
            }
          }
          addEdge(fileId, `file:${joined}`, 'imports', 'EXTRACTED');
        }
      }

      // 2. Functions / Components / Hooks / Classes / Types
      const fnMatch =
        line.match(/^\s*export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/) ||
        line.match(/^\s*function\s+([A-Za-z0-9_]+)\s*\(/) ||
        line.match(/^\s*export\s+const\s+([A-Za-z0-9_]+)\s*=/) ||
        line.match(/^\s*export\s+(?:interface|type)\s+([A-Za-z0-9_]+)/) ||
        line.match(/^\s*public\s+(?:final\s+)?class\s+([A-Za-z0-9_]+)/);

      if (fnMatch) {
        const symName = fnMatch[1];
        const symId = `sym:${f.path}#${symName}`;
        const symKind = /^[A-Z]/.test(symName)
          ? f.path.endsWith('.tsx')
            ? 'component'
            : 'type_or_class'
          : symName.startsWith('use')
            ? 'hook'
            : 'function';
        addNode(symId, symName, f.path, lineNo, symKind, community);
        addEdge(fileId, symId, 'defines', 'EXTRACTED');
      }
    });
  }

  // Second pass: resolve cross-file symbol calls & JSX component usage
  const allSymbols = nodes.filter((n) => n.id.startsWith('sym:'));
  for (const f of scanResult.files) {
    const content = fs.readFileSync(f.fullPath, 'utf8');
    const fileId = `file:${f.path}`;
    for (const sym of allSymbols) {
      if (sym.source_file === f.path) continue;
      const regex = new RegExp(`\\b${sym.label}\\b`);
      if (regex.test(content)) {
        const rel = sym.kind === 'component' ? 'renders' : 'calls';
        addEdge(fileId, sym.id, rel, 'INFERRED');
      }
    }
  }

  // Extract official bank catalog nodes from live-bank-hashes.json
  const hashesPath = path.join(ROOT, 'public/live-bank-hashes.json');
  if (fs.existsSync(hashesPath)) {
    const hashes = JSON.parse(fs.readFileSync(hashesPath, 'utf8'));
    for (const [url, meta] of Object.entries(hashes)) {
      const host = new URL(url).hostname.replace(/^www\./, '');
      const catalogId = `catalog:${url}`;
      addNode(
        catalogId,
        `${host} (HTTP ${meta.status})`,
        'public/live-bank-hashes.json',
        'L1',
        'official_bank_catalog',
        'bank-catalogs'
      );
      addEdge('file:src/data/merchantsData.ts', catalogId, 'verifies_catalog', 'EXTRACTED');
      addEdge('file:scripts/live-bank-verifier-server.cjs', catalogId, 'probes_live', 'EXTRACTED');
    }
  }

  return { nodes, edges };
}

function analyzeAndReport(scanResult, extraction) {
  const degreeMap = new Map();
  for (const n of extraction.nodes) degreeMap.set(n.id, { in: 0, out: 0, total: 0, node: n });
  for (const e of extraction.edges) {
    const s = degreeMap.get(e.source);
    const t = degreeMap.get(e.target);
    if (s) {
      s.out++;
      s.total++;
    }
    if (t) {
      t.in++;
      t.total++;
    }
  }

  const godNodes = [...degreeMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((d) => ({
      id: d.node.id,
      label: d.node.label,
      kind: d.node.kind,
      source_file: d.node.source_file,
      in_degree: d.in,
      out_degree: d.out,
      total_degree: d.total,
    }));

  const communities = {};
  for (const n of extraction.nodes) {
    const c = n.community || 'general';
    if (!communities[c]) communities[c] = [];
    communities[c].push(n.id);
  }

  // Surprising cross-community bridges
  const nodeComm = new Map(extraction.nodes.map((n) => [n.id, n.community]));
  const crossEdges = extraction.edges.filter(
    (e) => nodeComm.get(e.source) !== nodeComm.get(e.target)
  );

  const reportMd = `# Graphify Deterministic AST Knowledge Graph — ¿Con Cuál Pago? UY

> Generated deterministically via AST & structural analysis (\`scripts/graphify-ast.cjs\`). Zero LLM tokens used.

## Corpus Summary
- **Files Scanned:** \`${scanResult.total_files}\`
- **Total Words:** \`${scanResult.total_words.toLocaleString('en-US')}\`
- **Total Graph Nodes:** \`${extraction.nodes.length}\`
- **Total Directed Edges:** \`${extraction.edges.length}\` (\`EXTRACTED\`: ${
    extraction.edges.filter((e) => e.confidence === 'EXTRACTED').length
  }, \`INFERRED\`: ${extraction.edges.filter((e) => e.confidence === 'INFERRED').length})
- **Cross-Community Bridges:** \`${crossEdges.length}\`

## Top 10 God Nodes (Central Architectural Hubs)

| Rank | Node Label | Kind | Source File | In-Degree | Out-Degree | Total Degree |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
${godNodes
  .map(
    (g, i) =>
      `| ${i + 1} | \`${g.label}\` | \`${g.kind}\` | \`${g.source_file}\` | ${g.in_degree} | ${g.out_degree} | **${g.total_degree}** |`
  )
  .join('\n')}

## Community Clusters

| Community ID | Node Count | Representative Nodes |
| :--- | :---: | :--- |
${Object.entries(communities)
  .map(
    ([cid, list]) =>
      `| \`${cid}\` | ${list.length} | ${list
        .slice(0, 4)
        .map((id) => `\`${id.split(/[:#]/).pop()}\``)
        .join(', ')} |`
  )
  .join('\n')}

## Architectural Call & Verification Flow

\`\`\`mermaid
flowchart LR
  subgraph UI["UI & Motion Layer (PRISMA UY + GSAP + transitions.dev)"]
    App["src/App.tsx"]
    MC["MerchantCard.tsx"]
    CS["CalculatorSheet.tsx"]
    WS["WalletSheet.tsx"]
    GSAP["useGsapChoreography.ts"]
  end
  subgraph Engine["Fiscal & Zero-Fake Engine"]
    ENG["src/lib/engine.ts"]
    BSP["src/lib/bank-scraper-pipeline.ts"]
    MD["src/data/merchantsData.ts (84 merchants / 166 rules)"]
  end
  subgraph Verification["Live Verification & Android E2E"]
    LBV["scripts/live-bank-verifier-server.cjs"]
    AUD["scripts/audit-discounts.cjs"]
    AND["MainActivity.java (@JavascriptInterface)"]
  end

  App --> MC
  App --> CS
  App --> WS
  App --> GSAP
  CS --> GSAP
  MC --> ENG
  CS --> ENG
  ENG --> MD
  ENG --> LBV
  CS --> AND
  AUD --> MD
\`\`\`
`;

  return { godNodes, communities, reportMd };
}

function main() {
  const scanResult = detect(ROOT);
  const extraction = extract(scanResult);
  const { godNodes, communities, reportMd } = analyzeAndReport(scanResult, extraction);

  const graphJson = {
    directed: false,
    multigraph: false,
    graph: {
      name: 'con-cual-pago-uy-knowledge-graph',
      generatedAt: new Date().toISOString(),
      total_files: scanResult.total_files,
      total_words: scanResult.total_words,
      god_nodes: godNodes,
      communities: Object.fromEntries(
        Object.entries(communities).map(([k, v]) => [k, v.length])
      ),
    },
    nodes: extraction.nodes,
    links: extraction.edges,
  };

  const outDir = path.join(ROOT, 'graphify-out');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'graph.json'), JSON.stringify(graphJson, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'GRAPH_REPORT.md'), reportMd, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'public/graph.json'), JSON.stringify(graphJson, null, 2), 'utf8');

  console.log(
    `[GRAPHIFY AST] Built deterministic knowledge graph: ${extraction.nodes.length} nodes, ${extraction.edges.length} edges across ${scanResult.total_files} files -> graphify-out/graph.json & graphify-out/GRAPH_REPORT.md`
  );
}

main();
