// WIKIO AI Documentation Template
// Professional Typst template matching brand guidelines

// ============================================
// IMPORTS & CONFIGURATION
// ============================================

#import "@preview/fontawesome:0.6.0": *

#let wikio-cyan = rgb("#00d4ff")
#let wikio-coral = rgb("#E85A4F")
#let wikio-navy = rgb("#1a1f2e")
#let wikio-mint = rgb("#C4E8E8")
#let text-body = rgb("#374151")
#let text-light = rgb("#9ca3af")
#let current-section = state("current-section", "")

// ============================================
// DOCUMENT TEMPLATE
// ============================================

#let wikio-doc(
  title: "WIKIO AI Documentation",
  subtitle: "Platform Guide",
  version: "1.0",
  date: datetime.today().display("[month repr:long] [year]"),
  body,
) = {
  // Use Font Awesome 6 (matching installed desktop fonts)
  fa-version("6")

  // Document settings
  set document(title: title, author: "WIKIO AI")

  // Page settings
  set page(
    paper: "a4",
    margin: (top: 2.5cm, bottom: 2.5cm, left: 2cm, right: 2cm),
    header: context {
      if counter(page).get().first() > 2 {
        set text(size: 8pt, fill: text-light, weight: "semibold")
        let section = current-section.get()
        if section != "" {
          text(tracking: 0.1em)[#upper[#section]]
        }
        h(1fr)
        let chapter = query(selector(heading.where(level: 1)).before(here()))
        if chapter.len() > 0 {
          text(fill: text-body)[#chapter.last().body]
        }
      }
    },
    footer: context {
      if counter(page).get().first() > 1 {
        box(height: 14pt, image("assets/Wikio_AI_logo_black.png"))
        h(1fr)
        text(weight: "bold", fill: wikio-navy, size: 11pt)[#counter(page).display("01")]
      }
    },
  )

  // Typography
  set text(
    font: "Inter",
    size: 10.5pt,
    fill: text-body,
    lang: "en",
  )

  set par(
    leading: 0.75em,
    justify: true,
  )

  // Heading styles
  show heading.where(level: 1): it => {
    pagebreak(weak: true)
    v(1cm)
    block[
      #set text(size: 42pt, weight: "extrabold", fill: wikio-navy, tracking: -0.02em, hyphenate: false)
      #it.body
    ]
    v(0.3cm)
    block(width: 3.5cm, height: 4pt, fill: rgb("#2d3a6b"))
    v(1cm)
  }

  show heading.where(level: 2): it => {
    v(1cm)
    block[
      #set text(size: 16pt, weight: "bold", fill: wikio-navy, hyphenate: false)
      #it.body
    ]
    v(0.5cm)
  }

  show heading.where(level: 3): it => {
    v(0.6cm)
    block[
      #set text(size: 12pt, weight: "bold", fill: wikio-navy, hyphenate: false)
      #it.body
    ]
    v(0.2cm)
  }

  show heading.where(level: 4): it => {
    v(0.4cm)
    block[
      #set text(size: 11pt, weight: "bold", fill: wikio-navy, hyphenate: false)
      #it.body
    ]
    v(0.15cm)
  }

  // Links
  show link: it => text(fill: rgb("#4A90D9"), it)

  // Code blocks
  show raw.where(block: true): it => {
    set text(font: "JetBrains Mono", size: 9pt)
    block(
      width: 100%,
      fill: wikio-navy,
      inset: 16pt,
      radius: 6pt,
      text(fill: rgb("#e5e7eb"), it)
    )
  }

  // Inline code
  show raw.where(block: false): it => {
    set text(font: "JetBrains Mono", size: 9pt)
    box(
      fill: rgb("#f3f4f6"),
      inset: (x: 4pt, y: 2pt),
      radius: 3pt,
      text(fill: wikio-navy, it)
    )
  }

  // Tables - Mintlify-inspired elegant dark style
  set table(
    stroke: (x, y) => (
      top: if y == 1 { 1pt + rgb("#4b5563") } else { 0pt },
      bottom: if y > 0 { 0.5pt + rgb("#374151") } else { 0pt },
      left: 0pt,
      right: 0pt,
    ),
    fill: rgb("#1f2937"),
    inset: (x: 12pt, y: 10pt),
  )

  // Header row styling
  show table.cell.where(y: 0): set text(fill: rgb("#9ca3af"), weight: "medium", size: 9pt)

  // Body cells styling
  show table.cell: it => {
    if it.y > 0 {
      set text(fill: rgb("#d1d5db"), size: 9.5pt)
      it
    } else {
      it
    }
  }

  // Figure captions - suppress "Figure N:" prefix
  show figure.caption: it => align(center, text(size: 9pt, fill: text-light, style: "italic")[#it.body])

  // Wrap tables in styled blocks
  show table: it => block(
    breakable: false,
    width: 100%,
    radius: 8pt,
    clip: true,
    it
  )

  // ============================================
  // COVER PAGE
  // ============================================

  page(
    margin: 0pt,
    header: none,
    footer: none,
  )[
    #set align(left)
    #block(
      width: 100%,
      height: 100%,
      fill: black,
      inset: (x: 50pt, y: 50pt),
    )[
      #v(3cm)

      // Label
      #text(
        size: 14pt,
        weight: "bold",
        fill: wikio-cyan,
        tracking: 0.15em,
      )[PLATFORM GUIDE]

      #v(1.5cm)

      // Main title
      #set par(justify: false)
      #set text(hyphenate: false)
      #stack(
        dir: ttb,
        spacing: 8pt,
        text(size: 42pt, weight: "extrabold", fill: white, tracking: -0.02em)[AI-NATIVE],
        text(size: 42pt, weight: "extrabold", fill: white, tracking: -0.02em)[MAM PLATFORM],
      )

      #v(1cm)

      // Subtitle
      #text(
        size: 14pt,
        weight: "regular",
        fill: text-light,
      )[
        WIKIO AI transforms videos into\ searchable, reusable, and valuable assets
      ]

      #v(1fr)

      // Version info
      #text(size: 10pt, fill: text-light)[
        Version #version #h(2em) #date
      ]

      #v(0.5cm)

      // Logo
      #image("assets/Wikio_AI_logo_white.png", width: 120pt)
    ]
  ]

  // ============================================
  // TABLE OF CONTENTS
  // ============================================

  page(header: none)[
    #v(1cm)
    #text(size: 36pt, weight: "extrabold", fill: wikio-navy, tracking: -0.02em)[Contents]
    #v(0.3cm)
    #block(width: 3.5cm, height: 4pt, fill: wikio-coral)
    #v(1cm)

    #set text(size: 10.5pt)
    #show outline.entry.where(level: 1): it => {
      v(0.6cm)
      strong(it)
    }
    #show outline.entry.where(level: 2): it => {
      h(1em)
      it
    }

    #outline(
      title: none,
      indent: 1.5em,
      depth: 2,
    )
  ]

  // ============================================
  // MAIN CONTENT
  // ============================================

  body

  // ============================================
  // BACK COVER
  // ============================================

  pagebreak()
  page(
    margin: 0pt,
    header: none,
    footer: none,
  )[
    #block(
      width: 100%,
      height: 100%,
      fill: wikio-navy,
      inset: (x: 50pt, y: 50pt),
    )[
      #v(1fr)

      #text(size: 22pt, weight: "bold", fill: white)[About WIKIO AI]

      #v(0.8cm)

      #text(size: 12pt, fill: rgb("#d1d5db"))[
        WIKIO AI is a Paris-based SaaS company building the AI-native foundation for the video-driven enterprise.
      ]

      #v(0.8cm)

      #set text(size: 11pt, fill: rgb("#e5e7eb"))
      #list(
        marker: text(fill: rgb("#4A90D9"))[◆],
        indent: 0pt,
        body-indent: 0.8em,
        [Turn your archives into monetizable assets],
        [Unlock automation and intelligence],
        [Collaborate faster and at scale],
      )

      #v(1cm)

      #text(size: 11pt, fill: text-light)[
        Contact us at #text(fill: rgb("#4A90D9"))[contact\@wikio.ai] to request a demo.
      ]

      #v(2cm)

      #image("assets/Wikio_AI_logo_white.png", width: 120pt)
    ]
  ]
}

// ============================================
// CALLOUT COMPONENTS
// ============================================

#let note(title: "Note", body) = {
  block(
    width: 100%,
    fill: rgb("#e0f7fa"),
    stroke: (left: 3pt + wikio-cyan),
    inset: 14pt,
    radius: (right: 4pt),
  )[
    #text(weight: "bold", fill: rgb("#0891b2"), size: 10pt)[#title]
    #v(0.3em)
    #text(size: 10pt)[#body]
  ]
}

#let tip(title: "Tip", body) = {
  block(
    width: 100%,
    fill: rgb("#d1fae5"),
    stroke: (left: 3pt + rgb("#10b981")),
    inset: 14pt,
    radius: (right: 4pt),
  )[
    #text(weight: "bold", fill: rgb("#059669"), size: 10pt)[#title]
    #v(0.3em)
    #text(size: 10pt)[#body]
  ]
}

#let caution(title: "Caution", body) = {
  block(
    width: 100%,
    fill: rgb("#fef3c7"),
    stroke: (left: 3pt + rgb("#f59e0b")),
    inset: 14pt,
    radius: (right: 4pt),
  )[
    #text(weight: "bold", fill: rgb("#d97706"), size: 10pt)[#title]
    #v(0.3em)
    #text(size: 10pt)[#body]
  ]
}

#let danger(title: "Warning", body) = {
  block(
    width: 100%,
    fill: rgb("#fee2e2"),
    stroke: (left: 3pt + rgb("#ef4444")),
    inset: 14pt,
    radius: (right: 4pt),
  )[
    #text(weight: "bold", fill: rgb("#dc2626"), size: 10pt)[#title]
    #v(0.3em)
    #text(size: 10pt)[#body]
  ]
}

// ============================================
// CARD COMPONENT
// ============================================

#let card(title: "", body) = {
  block(
    width: 100%,
    fill: white,
    stroke: 1pt + rgb("#e5e7eb"),
    inset: 16pt,
    radius: 6pt,
  )[
    #set par(justify: false)
    #if title != "" {
      text(weight: "bold", fill: wikio-navy, size: 11pt)[#title]
      v(0.4em)
    }
    #text(size: 10pt)[#body]
  ]
}

// ============================================
// CARD GRID COMPONENT (for <Columns> + <Card>)
// ============================================

#let card-grid(cols: 2, ..cards) = {
  v(0.3cm)
  let items = cards.pos()
  let cell(c) = {
    let (icon-name, title, body, ..rest) = c
    let target = if rest.len() > 0 { rest.at(0) } else { none }
    let card-content = block(
      width: 100%,
      fill: white,
      stroke: 1pt + rgb("#e5e7eb"),
      inset: 16pt,
      radius: 8pt,
    )[
      #set par(justify: false)
      #box(
        width: 28pt,
        height: 28pt,
        fill: wikio-navy,
        radius: 50%,
        align(center + horizon, text(fill: white, size: 13pt)[#fa-icon(icon-name, solid: true)])
      )
      #v(0.5em)
      #text(weight: "bold", fill: wikio-navy, size: 11pt)[#title]
      #v(0.3em)
      #text(size: 9.5pt, fill: text-body)[#body]
    ]
    if target != none {
      context {
        let matches = query(label(target))
        if matches.len() > 0 {
          link(label(target), card-content)
        } else {
          card-content
        }
      }
    } else {
      card-content
    }
  }
  // Render one row at a time so each row is unbreakable
  let i = 0
  while i < items.len() {
    let row-items = items.slice(i, calc.min(i + cols, items.len()))
    let cells = row-items.map(c => cell(c))
    while cells.len() < cols { cells.push([]) }
    block(breakable: false, width: 100%)[
      #grid(
        columns: (1fr,) * cols,
        gutter: 12pt,
        ..cells
      )
    ]
    if i + cols < items.len() { v(12pt) }
    i = i + cols
  }
  v(0.3cm)
}

// ============================================
// STEPS COMPONENT
// ============================================

#let steps(..items) = {
  set enum(numbering: n => {
    box(
      width: 24pt,
      height: 24pt,
      fill: wikio-navy,
      radius: 50%,
      align(center + horizon, text(fill: white, weight: "bold", size: 10pt)[#n])
    )
  })
  v(0.3cm)
  for (i, item) in items.pos().enumerate() {
    grid(
      columns: (28pt, 1fr),
      gutter: 12pt,
      box(
        width: 24pt,
        height: 24pt,
        fill: wikio-navy,
        radius: 50%,
        align(center + horizon, text(fill: white, weight: "bold", size: 10pt)[#(i + 1)])
      ),
      block(above: 0pt)[#item],
    )
    v(0.4cm)
  }
}

// ============================================
// KEYBOARD KEY COMPONENT
// ============================================

#let kbd(key) = {
  box(
    fill: rgb("#f3f4f6"),
    stroke: 1pt + rgb("#d1d5db"),
    inset: (x: 5pt, y: 2pt),
    radius: 3pt,
    baseline: 2pt,
    text(font: "JetBrains Mono", size: 9pt, fill: wikio-navy)[#key]
  )
}

// ============================================
// SECTION BREAK COMPONENT
// ============================================

#let section-break(
  number: "01",
  title: "",
  description: "",
  style: "light",
) = {
  let bg-color = if style == "dark" { wikio-navy } else if style == "mint" { wikio-mint } else { white }
  let text-color = if style == "dark" { white } else { wikio-navy }
  let desc-color = if style == "dark" { rgb("#d1d5db") } else { text-body }

  current-section.update(title)
  page(
    margin: (x: 50pt, y: 60pt),
    header: none,
    footer: none,
    fill: bg-color,
  )[
    #v(3cm)

    // Section number
    #text(size: 14pt, weight: "bold", fill: wikio-cyan, tracking: 0.1em)[#number]

    #v(0.8cm)

    // Title
    #set text(hyphenate: false)
    #text(size: 42pt, weight: "extrabold", fill: text-color, tracking: -0.02em)[#title]

    #v(0.5cm)

    // Accent bar
    #block(width: 3.5cm, height: 4pt, fill: wikio-cyan)

    #v(1cm)

    // Description
    #text(size: 13pt, fill: desc-color)[#description]

    #v(1fr)

    // Footer
    #if style == "dark" {
      image("assets/Wikio_AI_logo_white.png", width: 100pt)
    } else {
      image("assets/Wikio_AI_logo_black.png", width: 100pt)
    }
  ]
}
