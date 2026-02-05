#!/usr/bin/env node

/**
 * Mintlify-to-PDF — Typst PDF Generator
 * ======================================
 *
 * Converts Mintlify MDX documentation to Typst format and generates a professional PDF.
 *
 * Usage:
 *   node scripts/generate-pdf.mjs [/path/to/mintlify-docs]
 *
 * If no path is given, defaults to ../docs (sibling directory).
 *
 * Output:
 *   output/WIKIO-AI-Documentation.pdf
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, resolve, relative, basename } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TOOL_ROOT = resolve(join(__dirname, '..'));

// Resolve the docs directory from CLI argument or default to ../docs
const docsArg = process.argv[2];
const DOCS_ROOT = resolve(docsArg ? resolve(docsArg) : resolve(TOOL_ROOT, '..', 'docs'));

if (!existsSync(DOCS_ROOT)) {
  console.error(`❌ Docs directory not found: ${DOCS_ROOT}`);
  console.error(`   Usage: node scripts/generate-pdf.mjs /path/to/mintlify-docs`);
  process.exit(1);
}

const docsJsonPath = join(DOCS_ROOT, 'docs.json');
if (!existsSync(docsJsonPath)) {
  console.error(`❌ docs.json not found in: ${DOCS_ROOT}`);
  console.error(`   Make sure the path points to a Mintlify docs directory.`);
  process.exit(1);
}

// ============================================
// CONFIGURATION
// ============================================

// Find the common ancestor directory of TOOL_ROOT and DOCS_ROOT.
// Typst --root must contain both the .typ source files and the docs images.
function findCommonRoot(a, b) {
  const partsA = a.split('/');
  const partsB = b.split('/');
  const common = [];
  for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
    if (partsA[i] === partsB[i]) common.push(partsA[i]);
    else break;
  }
  return common.join('/') || '/';
}

const TYPST_ROOT = findCommonRoot(TOOL_ROOT, DOCS_ROOT);

// Prefix for docs images when --root is the common ancestor
// e.g. if TYPST_ROOT=/a and DOCS_ROOT=/a/b/docs, then DOCS_PREFIX="/b/docs"
const DOCS_PREFIX = '/' + relative(TYPST_ROOT, DOCS_ROOT);

const CONFIG = {
  docsRoot: DOCS_ROOT,
  docsJsonPath,
  templatePath: join(TOOL_ROOT, 'typst/template.typ'),
  outputDir: join(TOOL_ROOT, 'output'),
  typstOutputPath: join(TOOL_ROOT, 'typst/documentation.typ'),
  pdfOutputPath: join(TOOL_ROOT, 'output/WIKIO-AI-Documentation.pdf'),
};

// Section descriptions for each group (optional customization)
const SECTION_DESCRIPTIONS = {
  'Getting started': 'Welcome to WIKIO AI and learn the fundamentals to get up and running quickly.',
  'Account': 'Manage your profile, preferences, workspace settings, and billing.',
  'Features': 'Explore the powerful features that make WIKIO AI the AI-native video management platform.',
  'Concepts': 'Understand the building blocks of WIKIO AI: users, workspaces, and assets.',
  'Troubleshooting': 'Solutions to common issues and how to get help.',
};

/**
 * Load sections dynamically from docs.json
 * This ensures the PDF only includes published content
 */
function loadSectionsFromDocsJson() {
  const docsJson = JSON.parse(readFileSync(CONFIG.docsJsonPath, 'utf-8'));

  // Get the groups from the first tab's navigation
  const groups = docsJson.navigation?.tabs?.[0]?.groups || [];

  const sections = groups.map((group, index) => {
    const sectionNumber = String(index + 1).padStart(2, '0');
    const groupId = group.group.toLowerCase().replace(/\s+/g, '-');

    // Convert page paths to file paths (add .mdx extension)
    const files = group.pages.map(page => `${page}.mdx`);

    return {
      id: groupId,
      number: sectionNumber,
      title: group.group,
      description: SECTION_DESCRIPTIONS[group.group] || `Content for ${group.group}.`,
      style: 'dark',
      files,
    };
  });

  return sections;
}

// ============================================
// MDX PARSING
// ============================================

function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, content };
  }

  const frontmatterStr = match[1];
  const frontmatter = {};

  frontmatterStr.split('\n').forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let value = line.slice(colonIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      frontmatter[key] = value;
    }
  });

  return {
    frontmatter,
    content: content.slice(match[0].length),
  };
}

// ============================================
// MDX TO TYPST CONVERSION
// ============================================

function mdxToTypst(content, docTitle = '') {
  // Remove import statements
  content = content.replace(/^import\s+.*?;\s*$/gm, '');

  // First, protect code blocks by replacing them with placeholders
  const codeBlocks = [];
  content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push({ lang: lang || '', code: code.trim() });
    return placeholder;
  });

  // Protect inline code (but not triple backticks that might be left over)
  const inlineCode = [];
  content = content.replace(/(?<!`)`([^`]+)`(?!`)/g, (match, code) => {
    const placeholder = `__INLINE_CODE_${inlineCode.length}__`;
    inlineCode.push(code);
    return placeholder;
  });

  // Escape # symbols in user content BEFORE table processing
  // This way, Typst commands created by table processing won't be affected
  content = content.replace(/(?<!^)(?<!= )#(?=\w)/gm, '\\#');

  // Process tables EARLY - before link protection to avoid placeholder conflicts
  content = content.replace(/^(\|[^\n]+\|)\n(\|[\s:|-]+\|)\n((?:\|[^\n]+\|\n?)+)/gm, (match, headerLine, separatorLine, bodyLines) => {
    // Parse header cells
    const headers = headerLine.split('|').slice(1, -1).map(h => h.trim());

    // Parse body rows
    const rows = bodyLines.trim().split('\n').map(row =>
      row.split('|').slice(1, -1).map(cell => cell.trim())
    );

    const numCols = headers.length;

    // Escape special characters in cells for Typst
    const escapeCell = (cell) => {
      return cell
        // Remove markdown links, keep text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove bold markers **text** -> text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        // Remove single italic markers *text* -> text
        .replace(/\*([^*]+)\*/g, '$1')
        // Escape $ symbols
        .replace(/\$/g, '\\$');
      // Note: @ escaping is handled by the main function later
    };

    // Build Typst table with elegant styling
    let tableTypst = `\n#table(\n  columns: ${numCols},\n  align: (left,) * ${numCols},\n`;

    // Add header cells
    headers.forEach(h => {
      tableTypst += `  [#strong[${escapeCell(h)}]],\n`;
    });

    // Add body rows with first column bold
    rows.forEach(row => {
      row.forEach((cell, colIndex) => {
        const escapedCell = escapeCell(cell);
        if (colIndex === 0) {
          tableTypst += `  [#strong[${escapedCell}]],\n`;
        } else {
          tableTypst += `  [${escapedCell}],\n`;
        }
      });
    });

    tableTypst += ')\n';
    return tableTypst;
  });

  // Process Markdown images ![alt](path) -> Typst #image()
  content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, imgPath) => {
    // Images are relative to the docs directory; prefix with DOCS_PREFIX so
    // they resolve correctly under the common --root
    let resolvedPath = imgPath.startsWith('/') ? imgPath : '/' + imgPath;
    resolvedPath = DOCS_PREFIX + resolvedPath;
    const caption = alt ? `\n  caption: [${alt}],` : '';
    return `\n#figure(\n  image("${resolvedPath}", width: 100%),${caption}\n)\n`;
  });

  // Process links early - before @ escaping
  const links = [];
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    let cleanText = text.replace(/\*/g, '').replace(/_/g, '');
    const placeholder = `__LINK_${links.length}__`;
    if (url.startsWith('/') || url.startsWith('#')) {
      links.push(`*${cleanText}*`);
    } else if (url.startsWith('mailto:')) {
      links.push(`#link("${url}")[${cleanText.replace(/@/g, '#"@"')}]`);
    } else {
      links.push(`#link("${url}")[${cleanText}]`);
    }
    return placeholder;
  });

  // Process Mintlify components

  // Process <Callout> components
  content = content.replace(
    /<Callout\s+type="(\w+)">([\s\S]*?)<\/Callout>/gi,
    (_, type, inner) => {
      const funcName = type.toLowerCase() === 'warning' ? 'caution' :
                       type.toLowerCase() === 'info' ? 'note' :
                       type.toLowerCase() === 'error' ? 'danger' :
                       'tip';
      const title = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
      const cleanInner = inner.trim().replace(/\n\n/g, '\n');
      return `\n#${funcName}(title: "${title}")[${cleanInner}]\n`;
    }
  );

  // Process <Note>, <Warning>, <Info>, <Tip> components
  content = content.replace(
    /<(Note|Warning|Info|Tip)>([\s\S]*?)<\/\1>/gi,
    (_, type, inner) => {
      const funcName = type.toLowerCase() === 'warning' ? 'caution' :
                       type.toLowerCase() === 'info' ? 'note' :
                       type.toLowerCase();
      const title = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
      const cleanInner = inner.trim().replace(/\n\n/g, '\n');
      return `\n#${funcName}(title: "${title}")[${cleanInner}]\n`;
    }
  );

  // Process <Columns> containing <Card> children → card-grid
  // Icon names are passed directly to typst-fontawesome's fa-icon()
  content = content.replace(/<Columns\s+cols=\{(\d+)\}>([\s\S]*?)<\/Columns>/g, (_, cols, inner) => {
    const cardMatches = [...inner.matchAll(/<Card\s+title="([^"]+)"(?:\s+icon="([^"]*)")?(?:\s+href="([^"]*)")?[^>]*>([\s\S]*?)<\/Card>/g)];
    if (cardMatches.length === 0) return inner;
    const entries = cardMatches.map(m => {
      const title = m[1];
      const icon = m[2] || 'circle';
      const href = m[3] || '';
      const body = m[4].trim()
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/@/g, '#"@"');
      // Convert href to a Typst label reference (e.g. /welcome/start-guide → welcome-start-guide)
      const labelRef = href.replace(/^\//, '').replace(/\//g, '-');
      if (labelRef) {
        return `  ("${icon}", "${title}", [${body}], "${labelRef}")`;
      }
      return `  ("${icon}", "${title}", [${body}])`;
    });
    return `\n#card-grid(cols: ${cols},\n${entries.join(',\n')},\n)\n`;
  });

  // Process remaining <Columns> components (without Card children)
  content = content.replace(/<Columns[^>]*>([\s\S]*?)<\/Columns>/g, '$1');

  // Process <Accordion> components
  content = content.replace(
    /<Accordion\s+title="([^"]+)">([\s\S]*?)<\/Accordion>/g,
    (_, title, inner) => {
      return `\n*${title}*\n\n${inner.trim()}\n`;
    }
  );

  // Process <AccordionGroup>
  content = content.replace(/<AccordionGroup>([\s\S]*?)<\/AccordionGroup>/g, '$1');

  // Process <Card> components
  content = content.replace(
    /<Card\s+title="([^"]+)"(?:[^>]*)>([\s\S]*?)<\/Card>/g,
    (_, title, inner) => {
      let cleanInner = inner.trim()
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/@/g, '#"@"');
      return `\n#card(title: "${title}")[${cleanInner}]\n`;
    }
  );

  // Process <CardGroup>
  content = content.replace(/<CardGroup[^>]*>([\s\S]*?)<\/CardGroup>/g, '$1');

  // Process <Steps> components
  content = content.replace(/<Steps>([\s\S]*?)<\/Steps>/g, (_, inner) => {
    // Try to find <Step> components
    const stepMatches = [...inner.matchAll(/<Step\s+title="([^"]+)">([\s\S]*?)<\/Step>/g)];

    if (stepMatches.length > 0) {
      let stepsTypst = '\n#steps(\n';
      for (const match of stepMatches) {
        const title = match[1].trim();
        const stepContent = match[2].trim()
          .replace(/\n/g, ' ')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/\s+/g, ' ');
        stepsTypst += `  [*${title}*\n   ${stepContent}],\n`;
      }
      stepsTypst += ')\n';
      return stepsTypst;
    }

    return inner;
  });

  // Process <Step> outside of Steps
  content = content.replace(
    /<Step\s+title="([^"]+)">([\s\S]*?)<\/Step>/g,
    (_, title, inner) => `\n*${title}*\n${inner.trim()}\n`
  );

  // Process <Tabs> and <Tab> components
  content = content.replace(/<Tabs>([\s\S]*?)<\/Tabs>/g, (_, inner) => {
    let tabsTypst = '\n';
    const tabItems = inner.match(/<Tab\s+title="([^"]+)">([\s\S]*?)<\/Tab>/g) || [];

    tabItems.forEach(tab => {
      const match = tab.match(/<Tab\s+title="([^"]+)">([\s\S]*?)<\/Tab>/);
      if (match) {
        tabsTypst += `*${match[1]}:* ${match[2].trim()}\n\n`;
      }
    });

    return tabsTypst;
  });

  // Process <Update> components (changelog entries)
  content = content.replace(
    /<Update\s+label="([^"]+)"(?:\s+description="([^"]*)")?>([\s\S]*?)<\/Update>/g,
    (_, label, desc, inner) => {
      // Remove leading whitespace from each line inside Update
      const cleanInner = inner.split('\n').map(line => line.replace(/^  /, '')).join('\n');
      return `\n*${label}*${desc ? ` - ${desc}` : ''}\n${cleanInner}\n`;
    }
  );

  // Process <Frame> components (just extract content)
  content = content.replace(/<Frame[^>]*>([\s\S]*?)<\/Frame>/g, '$1');

  // Process <img> and <Image> tags
  content = content.replace(/<(?:img|Image)[^>]*\/>/g, '');
  content = content.replace(/<(?:img|Image)[^>]*>([\s\S]*?)<\/(?:img|Image)>/g, '');

  // Process <Icon> components
  content = content.replace(/<Icon\s+[^>]*\/>/g, '');

  // Process <kbd> keyboard shortcut tags
  content = content.replace(/<kbd>([^<]+)<\/kbd>/g, '`$1`');

  // Remove any remaining HTML-style components
  content = content.replace(/<[A-Z][a-zA-Z]*[^>]*\/>/g, '');
  content = content.replace(/<[A-Z][a-zA-Z]*[^>]*>([\s\S]*?)<\/[A-Z][a-zA-Z]*>/g, '$1');

  // Escape @ symbols
  content = content.replace(/@/g, '#"@"');

  // Escape $ symbols
  content = content.replace(/\$/g, '\\$');

  // Process horizontal rules
  content = content.replace(/^---+$/gm, '\n#line(length: 100%, stroke: 0.5pt + rgb("#e5e7eb"))\n');

  // Process headers
  content = content.replace(/^####\s+(.+)$/gm, '==== $1');
  content = content.replace(/^###\s+(.+)$/gm, '=== $1');
  content = content.replace(/^##\s+(.+)$/gm, '== $1');
  content = content.replace(/^#\s+(.+)$/gm, '= $1');

  // Process bold and italic
  // Use placeholders for bold to prevent italic regex from re-matching
  content = content.replace(/\*\*\*([^*]+)\*\*\*/g, '_TYPST_BOLD_START_$1TYPST_BOLD_END__');
  content = content.replace(/\*\*([^*]+)\*\*/g, 'TYPST_BOLD_START_$1TYPST_BOLD_END_');
  content = content.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '_$1_');
  content = content.replace(/TYPST_BOLD_START_/g, '*');
  content = content.replace(/TYPST_BOLD_END_/g, '*');


  // Process unordered lists
  content = content.replace(/^(\s*)-\s+(.+)$/gm, (_, indent, text) => {
    const level = Math.floor(indent.length / 2);
    const prefix = '  '.repeat(level);
    return `${prefix}- ${text}`;
  });

  // Process ordered lists
  content = content.replace(/^(\s*)\d+\.\s+(.+)$/gm, (_, indent, text) => {
    const level = Math.floor(indent.length / 2);
    const prefix = '  '.repeat(level);
    return `${prefix}+ ${text}`;
  });

  // Clean up multiple blank lines
  content = content.replace(/\n{3,}/g, '\n\n');

  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    const placeholder = `__CODE_BLOCK_${i}__`;
    content = content.replace(placeholder, `\n\`\`\`${block.lang}\n${block.code}\n\`\`\`\n`);
  });

  // Restore inline code
  inlineCode.forEach((code, i) => {
    const placeholder = `__INLINE_CODE_${i}__`;
    content = content.replace(placeholder, `\`${code}\``);
  });

  // Restore links
  links.forEach((link, i) => {
    const placeholder = `__LINK_${i}__`;
    content = content.replace(placeholder, link);
  });

  return content.trim();
}

// ============================================
// FILE PROCESSING
// ============================================

function readDocs() {
  const sections = [];
  const docsJsonSections = loadSectionsFromDocsJson();

  for (const section of docsJsonSections) {
    const sectionData = {
      ...section,
      docs: [],
    };

    for (const filePath of section.files) {
      const fullPath = join(CONFIG.docsRoot, filePath);

      if (!existsSync(fullPath)) {
        console.log(`  ⚠ File not found: ${filePath}`);
        continue;
      }

      const rawContent = readFileSync(fullPath, 'utf-8');
      const { frontmatter, content } = parseFrontmatter(rawContent);

      sectionData.docs.push({
        path: filePath,
        title: frontmatter.title || filePath.replace('.mdx', ''),
        description: frontmatter.description || '',
        content: content,
      });
    }

    if (sectionData.docs.length > 0) {
      sections.push(sectionData);
    }
  }

  return sections;
}

// ============================================
// TYPST DOCUMENT GENERATION
// ============================================

function generateTypstDocument(sections) {
  let typst = `// WIKIO AI Documentation
// Generated from Mintlify MDX sources

#import "template.typ": *

#show: wikio-doc.with(
  title: "WIKIO AI Documentation",
  subtitle: "Platform Guide",
  version: "2.0",
)

`;

  for (const section of sections) {
    // Add section break page
    typst += `
#section-break(
  number: "${section.number}",
  title: "${section.title}",
  description: "${section.description}",
  style: "${section.style}",
)

`;

    // Add content for each file
    for (const doc of section.docs) {
      const typstContent = mdxToTypst(doc.content, doc.title);
      // Add the document title as a level-1 heading with a label for internal links
      const docLabel = doc.path.replace('.mdx', '').replace(/\//g, '-');
      typst += `= ${doc.title} <${docLabel}>\n\n`;
      typst += `${typstContent}\n\n`;
    }
  }

  return typst;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Mintlify-to-PDF — Typst PDF Generator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`📂 Docs directory: ${DOCS_ROOT}`);

  // Ensure output directories exist
  if (!existsSync(CONFIG.outputDir)) {
    mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Read documentation
  console.log('📚 Reading Mintlify documentation...');
  const sections = readDocs();

  let totalFiles = 0;
  for (const section of sections) {
    totalFiles += section.docs.length;
  }
  console.log(`   Found ${sections.length} sections with ${totalFiles} files\n`);

  // Generate Typst document
  console.log('📝 Converting MDX to Typst...');
  const typstContent = generateTypstDocument(sections);

  // Save Typst file
  console.log('💾 Saving Typst source...');
  writeFileSync(CONFIG.typstOutputPath, typstContent);
  console.log(`   Saved to: ${CONFIG.typstOutputPath}\n`);

  // Compile to PDF
  // --root is the common ancestor of tool and docs directories so both
  // Typst source files and docs images are accessible
  console.log('🖨️  Compiling PDF with Typst...');
  try {
    execSync(`typst compile --root "${TYPST_ROOT}" "${CONFIG.typstOutputPath}" "${CONFIG.pdfOutputPath}"`, {
      cwd: join(TOOL_ROOT, 'typst'),
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('❌ Typst compilation failed:', error.message);
    process.exit(1);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ PDF generated successfully!`);
  console.log(`   Output: ${CONFIG.pdfOutputPath}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
