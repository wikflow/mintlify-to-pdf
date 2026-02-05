# Mintlify-to-PDF

Convert [Mintlify](https://mintlify.com) MDX documentation into a professionally styled PDF using [Typst](https://typst.app). Zero runtime dependencies — just Node.js and the Typst CLI.

Currently branded for **WIKIO AI** — the template and converter can be customized for any Mintlify project.

## Features

- **Automatic section discovery** — reads your `docs.json` to include only published pages, in the correct order
- **Full Mintlify component support** — converts `<Card>`, `<CardGroup>`, `<Steps>`, `<Accordion>`, `<Tabs>`, `<Callout>`, `<Note>`, `<Warning>`, `<Tip>`, `<Info>`, `<Columns>`, `<Frame>`, `<Update>`, `<Icon>`, `<kbd>`, and more
- **Professional PDF output** — cover page, auto-generated table of contents, numbered section breaks, running headers/footers, and a branded back cover
- **Dark-themed tables** — Markdown tables render with a Mintlify-inspired charcoal style with subtle separators
- **Font Awesome icons** — card grids display FA6 icons via the `typst-fontawesome` package
- **Image embedding** — `![alt](path)` images from your docs directory are embedded at full width
- **Internal cross-references** — `<Card href="/features/search">` links generate clickable Typst label references
- **Code blocks** — fenced code blocks render in JetBrains Mono on a dark navy background; inline code gets a light gray pill
- **Callout boxes** — note (cyan), tip (green), caution (amber), and danger (red) with left-border accent
- **No dependencies** — pure Node.js (ESM) + Typst CLI; no npm install needed

## Prerequisites

| Tool | Install | Notes |
|------|---------|-------|
| **Node.js** >= 18 | [nodejs.org](https://nodejs.org) | ESM support required |
| **Typst CLI** >= 0.12 | `brew install typst` (macOS) or [typst.app](https://typst.app) | Compiles `.typ` to PDF |
| **Font Awesome 6 Desktop** | [fontawesome.com/download](https://fontawesome.com/download) | Install the OTF files system-wide |
| **Inter** font | [rsms.me/inter](https://rsms.me/inter/) | Body text |
| **JetBrains Mono** font | [jetbrains.com/lp/mono](https://www.jetbrains.com/lp/mono/) | Code blocks |

> Typst will auto-download the `@preview/fontawesome:0.6.0` package on first compile.

## Quick Start

```bash
# Clone alongside your Mintlify docs repo
git clone https://github.com/wikflow/mintlify-to-pdf.git
cd mintlify-to-pdf

# Generate the PDF — pass the path to your Mintlify docs directory
node scripts/generate-pdf.mjs /path/to/your-mintlify-docs

# Or if your docs repo is a sibling directory named "docs/":
node scripts/generate-pdf.mjs
```

Output: `output/WIKIO-AI-Documentation.pdf`

### Example directory layout

```
your-workspace/
├── docs/                      # Your Mintlify docs repo (wikflow/docs)
│   ├── docs.json              # Mintlify config — defines navigation & sections
│   ├── index.mdx
│   ├── welcome/
│   ├── features/
│   ├── concepts/
│   ├── images/                # Screenshots and diagrams
│   └── ...
└── mintlify-to-pdf/           # This repo
    ├── scripts/generate-pdf.mjs
    ├── typst/template.typ
    └── output/                # Generated PDF appears here (gitignored)
```

## How It Works

The pipeline has 4 stages:

### 1. Section Discovery

Reads `docs.json` from your Mintlify docs directory. It parses `navigation.tabs[0].groups` to discover which pages are published and in what order. Each group becomes a numbered section in the PDF.

The expected `docs.json` structure:

```json
{
  "navigation": {
    "tabs": [{
      "tab": "Documentation",
      "groups": [
        {
          "group": "Getting started",
          "pages": ["index", "welcome/start-guide", "welcome/concepts"]
        },
        {
          "group": "Features",
          "pages": ["features/search", "features/video-player"]
        }
      ]
    }]
  }
}
```

Each page path (e.g. `"features/search"`) maps to a file `features/search.mdx` in the docs directory.

### 2. MDX Parsing

For each `.mdx` file:
- Extracts YAML frontmatter (`title`, `description`)
- Strips `import` statements
- The frontmatter `title` becomes a level-1 heading with a Typst label (e.g. `<features-search>`) for cross-referencing

### 3. MDX-to-Typst Conversion

The converter (`mdxToTypst` function) transforms Markdown + Mintlify JSX into Typst markup. The conversion order is carefully sequenced to avoid conflicts:

1. **Protect** code blocks and inline code with placeholders (prevents escaping inside code)
2. **Escape** `#` symbols in body text (Typst uses `#` for commands)
3. **Convert tables** (must happen before link protection to avoid placeholder interference)
4. **Convert images** with docs-relative path resolution
5. **Protect links** with placeholders (preserves URLs from `@` and `$` escaping)
6. **Convert Mintlify components** — each component type has a dedicated regex:
   - `<Callout>`, `<Note>`, `<Warning>`, `<Info>`, `<Tip>` &rarr; colored callout boxes
   - `<Columns cols={N}>` + `<Card>` &rarr; `#card-grid()` with FA icons
   - `<Accordion>` &rarr; bold title + content
   - `<Card>` &rarr; `#card()` bordered block
   - `<Steps>` + `<Step>` &rarr; `#steps()` numbered circles
   - `<Tabs>` + `<Tab>` &rarr; bold tab headers
   - `<Update>` &rarr; bold label (changelog entries)
   - `<Frame>`, `<CardGroup>`, `<AccordionGroup>` &rarr; unwrapped (pass-through content)
   - `<img>`, `<Image>`, `<Icon>` &rarr; removed (handled by Markdown image syntax)
   - `<kbd>` &rarr; inline code
7. **Escape** `@` (Typst citation syntax) and `$` (Typst math mode)
8. **Convert** Markdown syntax: headings (`#` &rarr; `=`), bold, italic, lists, horizontal rules
9. **Restore** protected code blocks, inline code, and links

### 4. Typst Compilation

The generated `.typ` document imports `template.typ` and compiles via:

```
typst compile --root <common-ancestor> typst/documentation.typ output/WIKIO-AI-Documentation.pdf
```

The `--root` is automatically set to the lowest common ancestor of the tool directory and the docs directory. This allows Typst to access both:
- Template assets (`typst/assets/`) via relative paths
- Docs images (`images/`) via absolute paths prefixed with the docs directory's path under root

## Project Structure

```
mintlify-to-pdf/
├── scripts/
│   └── generate-pdf.mjs       # MDX parser, converter, and PDF compiler (605 lines)
├── typst/
│   ├── template.typ            # Typst document template & all components (558 lines)
│   ├── assets/
│   │   ├── Wikio_AI_logo_black.png   # Used in page footers & light section breaks
│   │   └── Wikio_AI_logo_white.png   # Used on cover page, back cover & dark section breaks
│   └── documentation.typ      # Generated intermediate file (gitignored)
├── output/                     # Generated PDF output (gitignored)
├── package.json
├── LICENSE                     # MIT
└── README.md
```

### `scripts/generate-pdf.mjs`

The single-file converter. Key functions:

| Function | Purpose |
|----------|---------|
| `findCommonRoot(a, b)` | Computes lowest common ancestor of two paths for Typst `--root` |
| `loadSectionsFromDocsJson()` | Reads `docs.json` navigation to discover sections and pages |
| `parseFrontmatter(content)` | Extracts YAML frontmatter from MDX files |
| `mdxToTypst(content, docTitle)` | Core converter: Markdown + Mintlify JSX &rarr; Typst markup |
| `readDocs()` | Reads all MDX files for each section |
| `generateTypstDocument(sections)` | Assembles the full Typst document with section breaks |
| `main()` | Orchestrates the pipeline and invokes Typst CLI |

### `typst/template.typ`

The Typst template defines the document layout and all custom components:

| Component | Typst function | Description |
|-----------|---------------|-------------|
| Document wrapper | `wikio-doc()` | Page setup, typography, heading styles, code block styling, table styling |
| Cover page | (inline in `wikio-doc`) | Black background, brand title, version, date, logo |
| Table of contents | (inline in `wikio-doc`) | Auto-generated, 2 levels deep |
| Back cover | (inline in `wikio-doc`) | Navy background, company description, logo |
| Note callout | `note()` | Cyan left-border, light blue background |
| Tip callout | `tip()` | Green left-border, light green background |
| Caution callout | `caution()` | Amber left-border, light yellow background |
| Danger callout | `danger()` | Red left-border, light red background |
| Card | `card()` | White box with gray border |
| Card grid | `card-grid()` | Multi-column grid of icon cards with optional label links |
| Steps | `steps()` | Numbered circle badges with content |
| Keyboard key | `kbd()` | Styled inline key cap |
| Section break | `section-break()` | Full-page divider with number, title, description, logo |

### Brand colors (defined in `template.typ`)

| Variable | Hex | Usage |
|----------|-----|-------|
| `wikio-cyan` | `#00d4ff` | Section numbers, note callouts, cover label |
| `wikio-coral` | `#E85A4F` | Accent bars under headings |
| `wikio-navy` | `#1a1f2e` | Headings, code block backgrounds, cover elements |
| `wikio-mint` | `#C4E8E8` | Optional mint section break style |
| `text-body` | `#374151` | Body text |
| `text-light` | `#9ca3af` | Headers, footers, secondary text |

## Customization

### Changing branding

1. **Colors**: Edit the `#let wikio-*` variables at the top of `typst/template.typ`
2. **Logos**: Replace `typst/assets/Wikio_AI_logo_black.png` and `Wikio_AI_logo_white.png`
3. **Cover page text**: Edit the `COVER PAGE` section in `template.typ` (lines 174-232)
4. **Back cover**: Edit the `BACK COVER` section in `template.typ` (lines 270-316)
5. **Document title**: Edit the `generateTypstDocument()` function in `generate-pdf.mjs`

### Changing section descriptions

Edit the `SECTION_DESCRIPTIONS` object in `generate-pdf.mjs`. These appear on section break pages. Groups not listed get a generic fallback.

```js
const SECTION_DESCRIPTIONS = {
  'Getting started': 'Welcome to WIKIO AI and learn the fundamentals.',
  'Features': 'Explore the powerful features of the platform.',
  // Add your custom groups here
};
```

### Changing typography

Edit the `set text()` and `show heading` rules in `template.typ`:
- Body font: line 59 (`font: "Inter"`)
- Code font: lines 116, 128 (`font: "JetBrains Mono"`)
- Heading sizes: lines 72-109

### Changing page layout

Edit the `set page()` block in `template.typ`:
- Paper size: line 36 (`paper: "a4"`)
- Margins: line 37

## Troubleshooting

### "source file must be contained in project root"

This means the Typst `--root` directory doesn't contain the `.typ` source file. The tool automatically computes the common ancestor of the tool and docs directories. Make sure both paths are on the same filesystem.

### "docs.json not found"

Pass the correct path to your Mintlify docs directory: `node scripts/generate-pdf.mjs /absolute/path/to/docs`

### Missing fonts

Typst will warn about missing fonts. Install Inter, JetBrains Mono, and Font Awesome 6 Desktop OTFs system-wide. On macOS, double-click each `.otf` file to install, or copy to `~/Library/Fonts/`.

### Images not appearing

Images in your MDX files must use paths relative to the docs root (e.g., `![alt](/images/screenshot.png)`). The converter prefixes these with the docs directory's path under the Typst root.

### Mintlify component not converting

The converter handles the most common Mintlify components. If a component isn't recognized, it's stripped as a generic HTML tag (content is preserved). Check the `mdxToTypst` function for the list of supported components.

## License

MIT - see [LICENSE](LICENSE).
