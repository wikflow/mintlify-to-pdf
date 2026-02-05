# Mintlify-to-PDF

Convert [Mintlify](https://mintlify.com) MDX documentation into a professional PDF using [Typst](https://typst.app).

Currently branded for **WIKIO AI** — the template and converter can be customized for any Mintlify project.

## Prerequisites

- **Node.js** >= 18
- **Typst CLI** — install via `brew install typst` (macOS) or see [typst.app](https://typst.app)
- **Font Awesome 6 Desktop** — download the OTF files from [fontawesome.com](https://fontawesome.com) and install them
- **Inter** and **JetBrains Mono** fonts — used by the Typst template

## Usage

```bash
# Clone alongside your Mintlify docs
git clone https://github.com/wikflow/mintlify-to-pdf.git
cd mintlify-to-pdf

# Generate PDF — pass the path to your Mintlify docs directory
node scripts/generate-pdf.mjs /path/to/your-mintlify-docs

# Or if your docs repo is a sibling named "docs":
node scripts/generate-pdf.mjs
```

The generated PDF will be in `output/WIKIO-AI-Documentation.pdf`.

## How It Works

1. Reads `docs.json` from the Mintlify docs directory to discover published sections
2. Parses MDX frontmatter and content from each page
3. Converts MDX (including Mintlify components like `<Card>`, `<Steps>`, `<Accordion>`, etc.) to Typst markup
4. Compiles the Typst document into a styled PDF with cover page, table of contents, section breaks, and back cover

## Project Structure

```
mintlify-to-pdf/
├── scripts/
│   └── generate-pdf.mjs       # MDX → Typst converter & PDF compiler
├── typst/
│   ├── template.typ            # Typst document template & components
│   └── assets/                 # Logos for cover/back pages
├── package.json
└── README.md
```

## Customization

- **Template**: Edit `typst/template.typ` to change colors, fonts, layout, cover page, etc.
- **Section descriptions**: Edit the `SECTION_DESCRIPTIONS` object in `generate-pdf.mjs`
- **Logos**: Replace files in `typst/assets/`

## License

MIT
