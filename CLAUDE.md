# CLAUDE.md — Mintlify-to-PDF

## What This Project Does

This tool converts Mintlify MDX documentation into a styled PDF via Typst. It's a two-file system: a Node.js script (`scripts/generate-pdf.mjs`) that parses MDX and generates a `.typ` file, and a Typst template (`typst/template.typ`) that defines the PDF layout and components.

The tool is currently branded for WIKIO AI but is designed to be rebranded by editing the template and a few constants in the script.

## Repository Layout

```
mintlify-to-pdf/
├── scripts/
│   └── generate-pdf.mjs          # The entire converter pipeline (single file, ~600 lines)
├── typst/
│   ├── template.typ              # Typst template: layout, components, cover pages (~560 lines)
│   ├── assets/                   # Brand logos (PNG) used by template
│   │   ├── Wikio_AI_logo_black.png
│   │   └── Wikio_AI_logo_white.png
│   └── documentation.typ         # GENERATED file (gitignored) — intermediate Typst output
├── output/                        # GENERATED directory (gitignored) — PDF output goes here
├── package.json                   # ESM module, no runtime dependencies
├── .gitignore
├── LICENSE                        # MIT
├── CLAUDE.md                      # This file
└── README.md
```

## How to Run

```bash
node scripts/generate-pdf.mjs <path-to-mintlify-docs>
```

- If no argument: defaults to `../docs` (sibling directory)
- Output: `output/WIKIO-AI-Documentation.pdf`
- Intermediate: `typst/documentation.typ` (the generated Typst source)

### Prerequisites

- Node.js >= 18 (ESM)
- Typst CLI >= 0.12 (`brew install typst`)
- System fonts: Inter, JetBrains Mono, Font Awesome 6 Desktop (OTF)

## Architecture

### Pipeline stages

1. **`loadSectionsFromDocsJson()`** — Reads `docs.json` from the Mintlify docs dir. Extracts `navigation.tabs[0].groups` to find sections and their pages. Each group becomes a numbered section.

2. **`readDocs()`** — For each section, reads each `.mdx` file, extracts YAML frontmatter (`title`, `description`), and collects the body content.

3. **`mdxToTypst(content, docTitle)`** — Core converter. Transforms Markdown + Mintlify JSX into Typst markup. This is where all the complexity lives.

4. **`generateTypstDocument(sections)`** — Assembles the full `.typ` file: imports the template, calls `wikio-doc.with()`, inserts section breaks and converted content.

5. **Typst compilation** — Shells out to `typst compile --root <common-ancestor>` to produce the PDF.

### The `--root` problem

Typst requires the source file to be inside `--root`, and images use `/`-prefixed paths resolved from root. Since the tool and docs live in different directories, we compute their lowest common ancestor as `--root` and prefix all image paths with the docs dir's relative position under that root.

Key variables:
- `TOOL_ROOT` — this repo's root
- `DOCS_ROOT` — the Mintlify docs directory (from CLI arg)
- `TYPST_ROOT` — `findCommonRoot(TOOL_ROOT, DOCS_ROOT)` — passed to `--root`
- `DOCS_PREFIX` — `'/' + relative(TYPST_ROOT, DOCS_ROOT)` — prepended to image paths

### Conversion order in `mdxToTypst()` (matters!)

The regex transforms must run in a specific order to avoid conflicts:

1. Protect code blocks → placeholders `__CODE_BLOCK_N__`
2. Protect inline code → placeholders `__INLINE_CODE_N__`
3. Escape `#` in body text (before Typst commands are created)
4. Convert Markdown tables (before link protection — tables contain `|` that can interfere)
5. Convert images `![alt](path)` → `#figure(#image(...))`
6. Protect links → placeholders `__LINK_N__` (before `@`/`$` escaping)
7. Convert Mintlify components (Callout, Card, Steps, Accordion, Tabs, etc.)
8. Escape `@` → `#"@"` and `$` → `\$`
9. Convert Markdown: headings, bold/italic (with placeholder trick to prevent re-matching), lists
10. Clean up blank lines
11. Restore code blocks, inline code, and links from placeholders

### Why placeholders?

Several elements contain characters that would be mangled by later escaping passes:
- **Code blocks**: May contain `#`, `@`, `$`, `*` that shouldn't be escaped
- **Inline code**: Same reason
- **Links**: URLs contain `@` (mailto) that shouldn't become `#"@"`, and the Typst link syntax uses `#` that shouldn't be double-escaped

## Template Components (`typst/template.typ`)

### Document wrapper: `wikio-doc()`

Parameters: `title`, `subtitle`, `version`, `date` (auto-filled to current month/year)

Sets up:
- A4 paper, 2.5cm top/bottom, 2cm left/right margins
- Running header: "WIKIO AI DOCUMENTATION" (left) + current chapter (right), visible from page 3
- Running footer: logo (left) + page number (right), visible from page 2
- Body text: Inter 10.5pt, justified, 0.75em leading
- 4 heading levels with navy color and decreasing sizes (28pt → 11pt)
- Code blocks: JetBrains Mono 9pt, navy background, rounded corners
- Inline code: JetBrains Mono 9pt, light gray pill
- Tables: charcoal dark background, no vertical borders, unbreakable
- Cover page, TOC, and back cover (all generated automatically)

### Callout components

| Function | Left border | Background | Title color |
|----------|------------|------------|-------------|
| `note()` | cyan `#00d4ff` | `#e0f7fa` | `#0891b2` |
| `tip()` | green `#10b981` | `#d1fae5` | `#059669` |
| `caution()` | amber `#f59e0b` | `#fef3c7` | `#d97706` |
| `danger()` | red `#ef4444` | `#fee2e2` | `#dc2626` |

### `card-grid(cols, ..cards)`

Each card is a tuple: `(icon-name, title, body-content, optional-label-ref)`.
- Icons rendered via `fa-icon(icon-name, solid: true)` in a navy circle
- If a label ref is provided and exists in the document, the entire card becomes a clickable link
- Rows are rendered individually and marked unbreakable

### `section-break(number, title, description, style)`

Full-page divider. Styles: `"dark"` (navy bg, white text), `"mint"` (mint bg), `"light"` (white bg). Includes section number in cyan, title at 42pt, coral accent bar, and logo.

### `steps(..items)`

Numbered circle badges (navy background, white number) with content blocks.

## Brand Colors

| Variable | Hex | RGB |
|----------|-----|-----|
| `wikio-cyan` | `#00d4ff` | 0, 212, 255 |
| `wikio-coral` | `#E85A4F` | 232, 90, 79 |
| `wikio-navy` | `#1a1f2e` | 26, 31, 46 |
| `wikio-mint` | `#C4E8E8` | 196, 232, 232 |
| `text-body` | `#374151` | 55, 65, 81 |
| `text-light` | `#9ca3af` | 156, 163, 175 |

## Expected `docs.json` Format

The tool reads `navigation.tabs[0].groups` from the Mintlify `docs.json`. Each group must have:

```json
{
  "group": "Section Title",
  "pages": ["path/to/page1", "path/to/page2"]
}
```

Page paths are relative to the docs root, without `.mdx` extension. The tool appends `.mdx` automatically. Missing files are logged as warnings and skipped.

## Section Descriptions

The `SECTION_DESCRIPTIONS` object in `generate-pdf.mjs` maps group names to descriptions shown on section break pages:

```js
const SECTION_DESCRIPTIONS = {
  'Getting started': 'Welcome to WIKIO AI and learn the fundamentals to get up and running quickly.',
  'Account': 'Manage your profile, preferences, workspace settings, and billing.',
  'Features': 'Explore the powerful features that make WIKIO AI the AI-native video management platform.',
  'Concepts': 'Understand the building blocks of WIKIO AI: users, workspaces, and assets.',
  'Troubleshooting': 'Solutions to common issues and how to get help.',
};
```

Groups not listed here get a generic fallback: `"Content for <group name>."`.

## Supported Mintlify Components

| MDX Component | Typst Output | Notes |
|---------------|-------------|-------|
| `<Callout type="...">` | `#note()` / `#tip()` / `#caution()` / `#danger()` | Maps type to color |
| `<Note>`, `<Warning>`, `<Info>`, `<Tip>` | Same callout functions | Shorthand components |
| `<Columns cols={N}>` + `<Card>` | `#card-grid(cols: N, ...)` | With FA icons and optional label links |
| `<Card title="...">` | `#card(title: "...")` | Standalone bordered card |
| `<CardGroup>` | Unwrapped | Children rendered directly |
| `<Steps>` + `<Step title="...">` | `#steps(...)` | Numbered circle badges |
| `<Accordion title="...">` | Bold title + content | No collapse in PDF |
| `<AccordionGroup>` | Unwrapped | Children rendered directly |
| `<Tabs>` + `<Tab title="...">` | Bold tab title + content | All tabs shown (no switching in PDF) |
| `<Update label="..." description="...">` | Bold label + description | Changelog entries |
| `<Frame>` | Unwrapped | Content passed through |
| `<img>`, `<Image>` | Removed | Use `![alt](path)` syntax instead |
| `<Icon>` | Removed | Only supported inside card-grid |
| `<kbd>` | Inline code | Rendered as backtick code |
| Unknown `<Component>` | Content extracted, tags stripped | Generic fallback |

## Common Issues & Fixes

### Typst character escaping

Typst uses `#`, `@`, and `$` as special characters. The converter escapes them:
- `#` → `\#` (except at start of line for headings and in Typst commands)
- `@` → `#"@"` (Typst string interpolation trick)
- `$` → `\$`

These escaping steps must happen AFTER code blocks are protected and AFTER Typst commands are generated — otherwise the commands themselves get escaped.

### Bold/italic conflict

Markdown uses `*` for both bold (`**text**`) and italic (`*text*`). The converter uses a placeholder approach:
1. Replace `***bold-italic***` first
2. Replace `**bold**` with `TYPST_BOLD_START_..._TYPST_BOLD_END_` placeholder
3. Replace `*italic*` with `_italic_`
4. Restore bold placeholders to `*bold*` (Typst bold syntax)

### Tables must be processed before link protection

If links are protected first, their placeholders (`__LINK_N__`) appear inside table cells and confuse the table regex. Processing tables first avoids this.

### Image path resolution

MDX images like `![alt](/images/screenshot.png)` are relative to the docs root. Since Typst `--root` is the common ancestor (not the docs root), the converter prepends `DOCS_PREFIX` to create the correct absolute path under root.

## Git Workflow

Push to GitHub:
```bash
GIT_CONFIG_GLOBAL=/dev/null git -c "credential.helper=!gh auth git-credential" push
```

(SSH keys for the `github.com-wikflow` alias aren't configured; use HTTPS via `gh` credential helper instead.)

## Future Tasks

- **Switch body font from Inter to Manrope** — The WIKIO AI whitepaper uses Manrope. Typst does not support variable fonts, so static weight instances are needed. Generating static fonts from the variable `Manrope-VariableFont_wght.ttf` via `fontTools.varLib.mutator.instantiateVariableFont` + stripping `fvar`/`gvar` tables did not produce working bold weights (all instances reported as `usWeightClass: 200` / `subfamily: Regular` even after manual metadata fixes). Next steps: download pre-built static Manrope `.ttf` files from Google Fonts (the static/ subfolder in the GitHub repo github.com/nicolehansendev/manrope), or use a different font instancing tool. The template change is trivial: `font: "Inter"` → `font: "Manrope"` in `template.typ` line 64.

## Related Repos

- **[wikflow/docs](https://github.com/wikflow/docs)** — The Mintlify documentation content (MDX files, images, docs.json). This tool reads from that repo but does not modify it.
