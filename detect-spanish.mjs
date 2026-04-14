#!/usr/bin/env node

/**
 * detect-spanish.mjs
 *
 * Scans files changed in the most recent git pull for Spanish content.
 * Skips language-specific directories, README translations, and known
 * Spanish-named identifiers (file names, mode references).
 *
 * Usage:
 *   node detect-spanish.mjs              # Check files from last pull (ORIG_HEAD..HEAD)
 *   node detect-spanish.mjs --all        # Check all tracked .md files
 *   node detect-spanish.mjs --diff A..B  # Check files changed between two refs
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { basename } from 'path';

// --- Configuration ---

// Directories containing intentional non-English translations — skip entirely
const SKIP_DIRS = ['modes/de', 'modes/fr', 'modes/ja', 'modes/ru', 'modes/pt', 'modes/es'];

// Files that are intentionally in other languages
const SKIP_FILES = [
  'README.es.md', 'README.ja.md', 'README.ko-KR.md',
  'README.pt-BR.md', 'README.ru.md', 'README.zh-TW.md'
];

// Known Spanish identifiers used as mode/command names — these are NOT content to translate.
// They appear in file names, CLAUDE.md routing tables, SKILL.md, etc.
const KNOWN_IDENTIFIERS = new Set([
  'oferta', 'ofertas', 'contacto', 'modo', 'pdf'
]);

// Common Spanish words/phrases that indicate untranslated content.
// Organized by confidence: high-confidence words that are rarely English.
//
// Words intentionally EXCLUDED (too ambiguous with English or used as identifiers):
//   "actual" (English word), "para" (short, common in URLs/code), "como" (ambiguous),
//   "entre" (ambiguous), "sobre" (ambiguous), "completo/completa" (English-adjacent),
//   "oferta/ofertas/contacto" (mode identifiers — handled by KNOWN_IDENTIFIERS)
const SPANISH_PATTERNS = [
  // High confidence — almost never English
  { pattern: /\b(también|después|además|todavía|aquí|allí|según|número|página|ubicación|descripción|evaluación|configuración|información|búsqueda)\b/gi, confidence: 'high' },
  { pattern: /\b(cuando|donde|porque|pero|desde|hasta|hacia|durante|mediante|antes|siempre)\b/gi, confidence: 'high' },
  { pattern: /\b(ejecutar|guardar|verificar|generar|construir|obtener|detectar|reescribir|seleccionar|reordenar|inyectar|reportar|escribir|hacer|añadir|desactivar|ajustar)\b/gi, confidence: 'high' },
  { pattern: /\b(empresa|puesto|candidato|resultado|contenido|título|ruta|sección|regla|diseño|bloque)\b/gi, confidence: 'high' },
  { pattern: /\b(todos|todas|estos|estas|otro|otra|otros|otras|mismo|misma|nuevo|nueva|siguiente|anterior)\b/gi, confidence: 'high' },

  // Medium confidence — context-dependent, could be English/code in some cases
  { pattern: /\b(lista|detalle|paralelo|pendiente|limpio|estándar|cada|nivel|paso|leer|nunca)\b/gi, confidence: 'medium' },

  // Phrase patterns (very high confidence — multi-word Spanish is unambiguous)
  { pattern: /\bsi\s+(la|el|no|hay|es|falla|existe)\b/gi, confidence: 'high' },
  { pattern: /\bpor\s+(cada|ejemplo|defecto)\b/gi, confidence: 'high' },
  { pattern: /\bde\s+(la|las|los|cada|un|una)\b/gi, confidence: 'high' },
  { pattern: /\ben\s+(el|la|los|las|caso)\b/gi, confidence: 'medium' },
  { pattern: /\b(no\s+se\s+puede|para\s+cada|como\s+sección|usar\s+como)\b/gi, confidence: 'high' },
];

// --- Helpers ---

function getChangedFiles(mode, diffRange) {
  try {
    let cmd;
    if (mode === 'all') {
      cmd = 'git ls-files "*.md" "*.mjs" "*.yml"';
    } else if (diffRange) {
      cmd = `git diff --name-only ${diffRange}`;
    } else {
      // Default: files changed in the last pull
      cmd = 'git diff --name-only ORIG_HEAD..HEAD';
    }
    return execSync(cmd, { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
  } catch {
    // ORIG_HEAD may not exist if no pull happened yet
    console.error('⚠️  Could not determine changed files. Try: node detect-spanish.mjs --all');
    return [];
  }
}

function shouldSkip(filePath) {
  // Skip non-text files
  if (!filePath.endsWith('.md') && !filePath.endsWith('.mjs')) return true;

  // Skip language-specific directories
  for (const dir of SKIP_DIRS) {
    if (filePath.startsWith(dir + '/') || filePath.startsWith('./' + dir + '/')) return true;
  }

  // Skip known translation files
  if (SKIP_FILES.includes(basename(filePath))) return true;

  return false;
}

function isKnownIdentifier(word, lineContext) {
  const lower = word.toLowerCase();
  if (!KNOWN_IDENTIFIERS.has(lower)) return false;

  // Check if it's used as an identifier (file reference, mode name, backtick code)
  // rather than as Spanish prose
  const identifierPatterns = [
    new RegExp(`\`[^\`]*${lower}[^\`]*\``, 'i'),           // in backticks
    new RegExp(`modes/${lower}`, 'i'),                       // file path
    new RegExp(`\\|\\s*\`?${lower}\`?\\s*\\|`, 'i'),       // table cell
    new RegExp(`mode:\\s*${lower}`, 'i'),                    // mode reference
    new RegExp(`/${lower}`, 'i'),                            // slash command
  ];

  return identifierPatterns.some(p => p.test(lineContext));
}

function scanFile(filePath) {
  if (!existsSync(filePath)) return [];

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const findings = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip merge conflict markers
    if (/^[<=>]{7}/.test(line)) continue;
    // Skip code blocks (URLs, commands)
    if (/^\s*(```|https?:|node |curl |git )/.test(line)) continue;
    // Skip lines that are just URLs or file paths
    if (/^\s*[-*]\s*\*\*\w+\*\*:\s*`/.test(line) && !line.includes('—') && !line.includes(':')) continue;

    // In .mjs files, Spanish words commonly appear as:
    //   - Status normalization mappings ('verificar': 'Evaluated')
    //   - Regex patterns matching both languages (/Seniority|Nivel|Level/)
    //   - Content detection checks (line.includes('NUNCA'))
    //   - Comments explaining Spanish column names or statuses
    // These are all intentional. Only flag .mjs files for MULTI-WORD Spanish phrases,
    // which indicate actual untranslated content (e.g., a full Spanish comment or string).
    const isMjs = filePath.endsWith('.mjs');

    for (const { pattern, confidence } of SPANISH_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(line)) !== null) {
        const word = match[0];

        // Check if this is a known identifier used in context
        if (isKnownIdentifier(word, line)) continue;

        // In .mjs files, skip single-word matches (likely code identifiers or mappings).
        // Only flag multi-word phrase matches (which indicate real untranslated content).
        if (isMjs && !word.includes(' ')) continue;

        findings.push({
          file: filePath,
          line: lineNum,
          word,
          confidence,
          context: line.trim().substring(0, 120),
        });
      }
    }
  }

  return findings;
}

// --- Main ---

const args = process.argv.slice(2);
const allMode = args.includes('--all');
const diffIdx = args.indexOf('--diff');
const diffRange = diffIdx >= 0 ? args[diffIdx + 1] : null;

const files = getChangedFiles(allMode ? 'all' : 'pull', diffRange);
const relevantFiles = files.filter(f => !shouldSkip(f));

if (relevantFiles.length === 0) {
  console.log(JSON.stringify({ status: 'clean', files_checked: 0, findings: [] }));
  process.exit(0);
}

const allFindings = [];
for (const file of relevantFiles) {
  allFindings.push(...scanFile(file));
}

// Deduplicate by file+line (multiple patterns can match same line)
const seen = new Set();
const uniqueFindings = allFindings.filter(f => {
  const key = `${f.file}:${f.line}:${f.word}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

// Group by file for readable output
const byFile = {};
for (const f of uniqueFindings) {
  if (!byFile[f.file]) byFile[f.file] = [];
  byFile[f.file].push(f);
}

const highCount = uniqueFindings.filter(f => f.confidence === 'high').length;
const mediumCount = uniqueFindings.filter(f => f.confidence === 'medium').length;

const result = {
  status: uniqueFindings.length > 0 ? 'spanish-detected' : 'clean',
  files_checked: relevantFiles.length,
  total_findings: uniqueFindings.length,
  high_confidence: highCount,
  medium_confidence: mediumCount,
  files_with_spanish: Object.keys(byFile),
  findings: byFile,
};

console.log(JSON.stringify(result, null, 2));
process.exit(uniqueFindings.length > 0 ? 1 : 0);
