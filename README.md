# marked-gitlab

A [Marked](https://marked.js.org/) extension for [GitLab Flavored Markdown (GLFM)](https://docs.gitlab.com/user/markdown/).

[![npm version](https://badge.fury.io/js/marked-gitlab.svg)](https://badge.fury.io/js/marked-gitlab)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Note:** This project was almost entirely vibe coded. If you find something that doesn't match GitLab's rendering or is otherwise broken, please [open an issue](https://github.com/UziTech/marked-gitlab/issues) or submit a PR!

## Installation

```sh
npm install marked-gitlab marked
```

## Usage

```js
import { Marked } from 'marked';
import markedGitlab from 'marked-gitlab';

const marked = new Marked();
marked.use(markedGitlab({
  project: 'gitlab-org/gitlab',
}));

const html = marked.parse('# Hello GitLab\n\nSee issue #123 and commit @alice!');
console.log(html);
```

### Browser / UMD

```html
<script src="https://cdn.jsdelivr.net/npm/marked/lib/marked.umd.js"></script>
<script src="https://cdn.jsdelivr.net/npm/marked-gitlab/lib/index.umd.js"></script>
<script>
  const marked = new marked.Marked();
  marked.use(markedGitlab({ project: 'my-group/my-project' }));
  const html = marked.parse('> [!NOTE]\n> Welcome to GLFM!');
  document.body.innerHTML = html;
</script>
```

---

## Features

### 1. Multiline Blockquotes & Alerts

Supports both standard single-line blockquote alerts and GitLab multiline blockquotes using `>>>`:

```markdown
>>> [!warning] Danger Zone
This action cannot be undone.
Please make sure you have backed up your data.
>>>

> [!NOTE]
> Standard blockquote alerts are also supported (`note`, `tip`, `important`, `caution`, `warning`).
```

### 2. Color Chips

Recognizes color codes inside backticks (HEX, RGB, HSL) and renders visual color previews:

```markdown
`#F00` `#FF0000` `rgb(255, 0, 0)` `hsl(0, 100%, 50%)`
```

Rendered HTML:

```html
<code>#FF0000<span class="gfm-color_chip"><span style="background-color: #FF0000;"></span></span></code>
```

To display a color code without the preview chip, escape it with a backslash: `\`#FF0000\``.

### 3. Description Lists

Define terms and descriptions using `:`:

```markdown
Cat
: Small domesticated feline animal.

Dog
: Domesticated descendant of the wolf.
```

Rendered HTML:

```html
<dl>
<dt>Cat</dt>
<dd>Small domesticated feline animal.</dd>
<dt>Dog</dt>
<dd>Domesticated descendant of the wolf.</dd>
</dl>
```

### 4. Inline Diffs

Highlight added or deleted text using curly brace or square bracket notation:

```markdown
{+ added text +}
[- deleted text -]
[+ also added +]
{- also deleted -}
```

Rendered HTML:

```html
<span class="idiff left right addition">added text</span>
<span class="idiff left right deletion">deleted text</span>
```

### 5. Table of Contents (`[[_TOC_]]` / `[TOC]`) & Heading Anchors

Insert a table of contents automatically generated from document headings:

```markdown
[[_TOC_]]

# Chapter 1
## Section A
# Chapter 2
```

Heading anchors follow GitLab's slugification rules (Unicode letter/digit preservation, space-to-hyphen conversion, punctuation removal, and duplicate deduplication `-1`, `-2`). Each heading includes a GLFM-compatible anchor element:

```html
<h1 id="chapter-1">Chapter 1<a href="#chapter-1" aria-label="Link to heading 'Chapter 1'" data-heading-content="Chapter 1" class="anchor"></a></h1>
```

### 6. Task Lists, Inapplicable Items (`[~]`) & Task Tables

In addition to `- [x]` (completed) and `- [ ]` (incomplete), GitLab supports `- [~]` (inapplicable):

```markdown
- [x] Completed task
- [~] Inapplicable task
- [ ] Incomplete task
```

Rendered HTML:

```html
<li class="task-list-item"><input type="checkbox" disabled class="task-list-item-checkbox" checked> Completed task</li>
<li class="task-list-item"><input type="checkbox" disabled class="task-list-item-checkbox" data-inapplicable="true"> Inapplicable task</li>
<li class="task-list-item"><input type="checkbox" disabled class="task-list-item-checkbox"> Incomplete task</li>
```

#### Task Tables

GitLab supports native task items in Markdown table cells. Per the GLFM specification, the checkbox must be the sole content of the cell (without list markers such as `-` or `*`):

```markdown
| Complete | Task |
| :---: | :--- |
| [x] | Refactor the backend |
| [ ] | Refactor the frontend |
| [~] | Inapplicable task |
```

Rendered HTML applies the `task-table-item` CSS class to the enclosing `<td>` / `<th>` while preserving cell alignment:

```html
<table>
<thead>
<tr>
<th align="center">Complete</th>
<th align="left">Task</th>
</tr>
</thead>
<tbody>
<tr>
<td align="center" class="task-table-item"><input type="checkbox" disabled class="task-list-item-checkbox" checked> </td>
<td align="left">Refactor the backend</td>
</tr>
<tr>
<td align="center" class="task-table-item"><input type="checkbox" disabled class="task-list-item-checkbox"> </td>
<td align="left">Refactor the frontend</td>
</tr>
<tr>
<td align="center" class="task-table-item"><input type="checkbox" disabled class="task-list-item-checkbox" data-inapplicable="true"> </td>
<td align="left">Inapplicable task</td>
</tr>
</tbody>
</table>
```

> **Note:** To add multiple task items in a single cell or task items with additional text, use an HTML `<table>` with Markdown list items inside `<td>`.

### 7. Multimedia & Dimensions

Automatically detects audio and video files, wraps them in media containers, and supports dimension attributes `{width=... height=...}`:

```markdown
![Video](media/demo.mp4)
![Audio](media/podcast.mp3)
![Logo](img/logo.png){width=100 height=50px}
```

Rendered HTML:

```html
<span class="media-container video-container"><video src="media/demo.mp4" controls preload="metadata" class="gl-rounded-lg" data-setup="{}" data-title="Video"><a href="media/demo.mp4">Video</a></video></span>
```

### 8. Diagrams, Math & JSON Tables

- **Diagrams**: Fenced code blocks for `mermaid`, `plantuml`, and `kroki`:

  ````markdown
  ```mermaid
  graph TD
    A-->B
  ```
  ````

- **Math Equations**: Display blocks using ```` ```math ````, multiline `$$...$$` blocks, or `\[...\]`, and inline expressions with `$`, `$`...`$`, `$$...$$`, or `\(...\)`:

  ```markdown
  $`a^2 + b^2 = c^2`$
  \(E = mc^2\)
  $$a + b$$
  ```

  Display math blocks:

  ```markdown
  $$
  a^2 + b^2 = c^2
  $$

  \[x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}\]
  ```

- **JSON Tables**: Render tables directly from JSON data using ```` ```json:table ````:

  ````markdown
  ```json:table
  {
    "fields": [{"key": "name", "label": "Name", "sortable": true}, "role"],
    "items": [{"name": "Alice", "role": "Engineer"}]
  }
  ```
  ````

- **GitLab Query Language (GLQL)**: Render embedded query views with ```` ```glql ````:

  ````markdown
  ```glql
  fields: title, state
  assignee = currentUser()
  ```
  ````

### 9. Front Matter, Placeholders & Includes

- **Front Matter**: Preserves YAML (`---`), TOML (`+++`), and JSON (`;;;`) metadata in `<pre class="gl-front-matter">`.
- **Placeholders**: Replace `%{KEY}` tokens with options passed to `placeholders`:

  ```markdown
  Welcome to %{project_name}!
  ```

- **Includes**: Custom include directive via `includeHandler`:

  ```markdown
  ::include{file=path/to/file.md}
  ```

### 10. GitLab Special References

Parses GitLab's rich reference syntax into styled links:

| Reference | Target | Example |
| :--- | :--- | :--- |
| `@user` / `@group` | Users, groups | `@alice` |
| `namespace/project>` | Projects | `gitlab-org/gitlab>` |
| `#123` / `group/proj#123` | Issues | `#101`, `my/proj#101` |
| `GL-123` / `PROJ-456` | Issue tracker keys | `GL-123`, `PROJ-456` |
| `!123` | Merge requests | `!204` |
| `$123` | Snippets | `$501` |
| `&123` | Epics | `&301` |
| `~label` / `proj~label` / `/proj~label` | Labels | `~bug`, `/my/proj~"feature request"` |
| `%milestone` / `/proj%milestone` | Milestones | `%16.0`, `/my/proj%"Sprint 1"` |
| `*iteration:"title"` | Iterations | `*iteration:"Q3"` |
| `[cadence:1]` / `[cadence:"title"]` | Iteration cadences | `[cadence:1]`, `[cadence:"Sprint"]` |
| `^alert#123` | Alerts | `^alert#45` |
| `[work_item:123]` | Bracket references | `[work_item:123]`, `[vulnerability:1]` |
| `[wiki_page:proj:Page#sec]` | Cross-project wikis | `[wiki_page:gitlab-org/gitlab:Home]` |
| `commit@sha` / 40-char SHA | Commits | `other@9ba12248`, `0123456789abcdef...` |
| `sha...sha` | Commit comparison | `9ba12248...b19a04f5` |
| `[[Page#anchor]]` / `[[Title\|slug#anchor]]` | Wiki pages & anchors | `[[Wiki#setup]]`, `[[User Guide\|user-guide#setup]]` |
| `.../issues/123` / `.../merge_requests/567` | Base entity URLs | Auto-linked to `#123`, `!567`, `&888` (supports `+` / `+s`) |
| `.../issues/123#note_456` | Comment URLs | Rendered as `#123 (comment 456)` |
| `.../issues/123/designs` | Design URLs | Rendered as `#123 (designs)`, `#123[pic.png]` |
| `.../wikis/Page-Slug` | Wiki URLs | Rendered as `Page Slug` |

Prefix references with `\` to prevent linking (e.g. `\#123`, `\GL-123`, `\gitlab-org/gitlab>`).

Rendered reference links include GLFM-standard attributes `data-reference-type`, `data-original`, and `data-link`:

```html
<a href="https://gitlab.com/gitlab-org/gitlab/-/issues/101" class="gfm gfm-issue" data-reference-type="issue" data-original="#101" data-link="false">#101</a>
```

### 11. Footnotes

Add footnotes to your content with inline references and definitions. Footnotes are automatically renumbered sequentially (`1`, `2`, `3`...) by appearance order in the document, regardless of whether identifiers are numbers or names:

```markdown
Something that needs more explanation.[^1]

Another claim.[^note]

[^1]: This is the footnote content.
[^note]: A named footnote with **formatting**.
```

Rendered HTML:

```html
<sup class="footnote-ref"><a href="#fn-1" id="fnref-1" data-footnote-ref>1</a></sup>
...
<sup class="footnote-ref"><a href="#fn-note" id="fnref-note" data-footnote-ref>2</a></sup>
...
<section class="footnotes" data-footnotes>
<ol>
<li id="fn-1"><p>This is the footnote content. <a href="#fnref-1" class="footnote-backref" data-footnote-backref aria-label="Back to reference 1">↩</a></p></li>
<li id="fn-note"><p>A named footnote with <strong>formatting</strong>. <a href="#fnref-note" class="footnote-backref" data-footnote-backref aria-label="Back to reference 2">↩</a></p></li>
</ol>
</section>
```

### 12. Emojis

Converts standard emoji shortcodes from the full [Gemoji](https://github.com/github/gemoji) dataset (~1900 emojis) into `<gl-emoji>` tags:

```markdown
:thumbsup: :heart: :rocket:
```

Rendered HTML:

```html
<gl-emoji data-name="thumbsup" data-unicode-version="6.0" title="thumbs up">👍</gl-emoji>
```

---

## Options

All features can be customized or selectively disabled via `MarkedGitlabOptions`:

```ts
interface MarkedGitlabOptions {
  /** Base GitLab URL (default: 'https://gitlab.com') */
  baseUrl?: string;

  /** Default project path (e.g. 'gitlab-org/gitlab') for unqualified references */
  project?: string;

  /** Enable alert callouts (default: true) */
  alerts?: boolean;

  /** Enable multiline blockquotes with >>> (default: true) */
  multilineBlockquotes?: boolean;

  /** Enable color chip previews for hex, rgb, hsl codes (default: true) */
  colorChips?: boolean;

  /** Enable description lists (default: true) */
  descriptionLists?: boolean;

  /** Enable inline diffs {+ ... +} and [- ... -] (default: true) */
  inlineDiffs?: boolean;

  /** Enable table of contents [[_TOC_]] and [TOC] (default: true) */
  tableOfContents?: boolean;

  /** Generate GitLab-compliant heading id slugs (default: true) */
  headingAnchors?: boolean;

  /** Enable task lists including [~] inapplicable items (default: true) */
  taskLists?: boolean;

  /** Enable task checkboxes inside table cells (default: true) */
  taskTables?: boolean;

  /** Enable GitLab special references (default: true) */
  references?: boolean;

  /** Enable video/audio players and image dimensions (default: true) */
  multimedia?: boolean;

  /** Enable diagram code blocks (mermaid, plantuml, kroki) (default: true) */
  diagrams?: boolean;

  /** Enable math formulas (default: true) */
  math?: boolean;

  /** Enable json:table rendering (default: true) */
  jsonTables?: boolean;

  /** Enable glql blocks (default: true) */
  glql?: boolean;

  /** Enable front matter extraction (default: true) */
  frontMatter?: boolean;

  /** Enable footnotes [^1] (default: true) */
  footnotes?: boolean;

  /** Map of placeholder keys to replacement values (e.g. { KEY: 'val' }) */
  placeholders?: Record<string, string>;

  /** Enable emoji shortcodes or provide a custom emoji override map (default: true) */
  emojis?: boolean | Record<string, string>;

  /** Handler for ::include{file=...} directives */
  includeHandler?: (file: string) => string | undefined;
}
```

---

## Client-Side Rendering & Stylesheets

`marked-gitlab` parses GitLab Flavored Markdown into semantic HTML matching GitLab's DOM structure. Some visual and interactive features (such as math formulas, diagrams, color chips, and alerts) require client-side libraries or CSS styles to render fully in the browser.

### Math Equations (KaTeX / MathJax)

`marked-gitlab` outputs `<span class="gl-math-inline">` for inline formulas and `<div class="gl-math-block">` for display formulas. You can render them using [KaTeX](https://katex.org/) or [MathJax](https://www.mathjax.org/):

```html
<!-- KaTeX Stylesheet & Script -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>

<script>
function renderMath(container = document.body) {
  // Inline math: $`...`$ or \(...\)
  container.querySelectorAll('.gl-math-inline').forEach((el) => {
    katex.render(el.textContent, el, { displayMode: false, throwOnError: false });
  });

  // Display math: ```math or $$...$$ or \[...\]
  container.querySelectorAll('.gl-math-block').forEach((el) => {
    katex.render(el.textContent, el, { displayMode: true, throwOnError: false });
  });
}
</script>
```

### Diagrams (Mermaid, PlantUML & Kroki)

`marked-gitlab` wraps diagram blocks in `<pre class="mermaid">`, `<pre class="plantuml">`, or `<pre class="kroki">`.

#### Mermaid

Use [Mermaid](https://mermaid.js.org/) to render `<pre class="mermaid">` blocks into interactive SVG diagrams:

```html
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: false });

  // Render all mermaid code blocks
  await mermaid.run({
    nodes: document.querySelectorAll('pre.mermaid'),
  });
</script>
```

#### PlantUML & Kroki

PlantUML and Kroki diagrams can be rendered via [Kroki's API](https://kroki.io/) or your own PlantUML server:

```js
// Replace <pre class="kroki"> or <pre class="plantuml"> blocks with rendered SVGs via Kroki
document.querySelectorAll('pre.plantuml, pre.kroki').forEach(async (pre) => {
  const type = pre.classList.contains('plantuml') ? 'plantuml' : pre.dataset.diagramType || 'plantuml';
  const code = pre.querySelector('code')?.textContent || pre.textContent;

  const res = await fetch(`https://kroki.io/${type}/svg`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: code,
  });
  if (res.ok) {
    const div = document.createElement('div');
    div.className = `${type}-diagram`;
    div.innerHTML = await res.text();
    pre.replaceWith(div);
  }
});
```

### Recommended Stylesheet

GitLab uses specific classes for alerts, color chips, inline diffs, and task lists. You can use GitLab's official [`@gitlab/ui`](https://gitlab-org.gitlab.io/gitlab-ui/) CSS or add these minimal styles:

```css
/* Color Chips */
.gfm-color_chip {
  display: inline-flex;
  vertical-align: middle;
  margin-left: 4px;
}
.gfm-color_chip > span {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

/* Inline Diffs */
.idiff.addition {
  background-color: #d4edda;
  color: #155724;
  text-decoration: none;
}
.idiff.deletion {
  background-color: #f8d7da;
  color: #721c24;
  text-decoration: line-through;
}

/* Markdown Alerts */
.markdown-alert {
  padding: 12px 16px;
  margin-bottom: 16px;
  border-left: 4px solid #1f75cb;
  background-color: #f0f6fc;
  border-radius: 0 4px 4px 0;
}
.markdown-alert-title {
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 4px;
}
.markdown-alert-note      { border-left-color: #1f75cb; background-color: #f0f6fc; }
.markdown-alert-tip       { border-left-color: #108548; background-color: #ecfdf3; }
.markdown-alert-warning   { border-left-color: #c17d10; background-color: #fef7ed; }
.markdown-alert-caution   { border-left-color: #dd2b0e; background-color: #fdf2f2; }
.markdown-alert-important { border-left-color: #7b58cf; background-color: #fbf8ff; }

/* Task Lists */
.task-list-item {
  list-style-type: none;
}
.task-list-item-checkbox {
  margin: 0 0.35em 0.25em -1.4em;
  vertical-align: middle;
}
.task-list-item:has([data-inapplicable="true"]) {
  text-decoration: line-through;
  opacity: 0.6;
}
th.task-table-item,
td.task-table-item {
  white-space: nowrap;
}

/* JSON Tables */
.gl-table.gl-json-table {
  width: 100%;
  border-collapse: collapse;
}
.gl-table.gl-json-table th,
.gl-table.gl-json-table td {
  border: 1px solid #dbdbdb;
  padding: 8px 12px;
}
.gl-table.gl-json-table caption {
  font-weight: bold;
  text-align: left;
  padding: 8px 0;
}
```

### Complete Browser Example

Here is a full working example combining `marked`, `marked-gitlab`, KaTeX, Mermaid, and styles:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>marked-gitlab Browser Demo</title>

  <!-- KaTeX CSS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">

  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
    .gfm-color_chip { display: inline-flex; vertical-align: middle; margin-left: 4px; }
    .gfm-color_chip > span { display: inline-block; width: 12px; height: 12px; border: 1px solid rgba(0,0,0,0.2); border-radius: 2px; }
    .idiff.addition { background-color: #d4edda; color: #155724; }
    .idiff.deletion { background-color: #f8d7da; color: #721c24; text-decoration: line-through; }
    .markdown-alert { padding: 12px 16px; margin: 16px 0; border-left: 4px solid #1f75cb; background-color: #f0f6fc; border-radius: 0 4px 4px 0; }
    .markdown-alert-title { font-weight: 600; margin-top: 0; margin-bottom: 4px; }
    .task-list-item { list-style-type: none; }
    .task-list-item-checkbox { margin: 0 0.35em 0.25em -1.4em; vertical-align: middle; }
    .task-list-item:has([data-inapplicable="true"]) { text-decoration: line-through; opacity: 0.6; }
  </style>
</head>
<body>
  <div id="content"></div>

  <!-- Marked & marked-gitlab -->
  <script src="https://cdn.jsdelivr.net/npm/marked/lib/marked.umd.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked-gitlab/lib/index.umd.js"></script>

  <!-- KaTeX -->
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>

  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: false });

    const markedInstance = new marked.Marked();
    markedInstance.use(markedGitlab({ project: 'gitlab-org/gitlab' }));

    const md = `
# GLFM Preview

> [!TIP]
> Alerts, math, and diagrams render with client libraries and styles!

Inline formula: $a^2 + b^2 = c^2$

\`\`\`math
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
\`\`\`

\`\`\`mermaid
graph TD
  A[Markdown] --> B[marked-gitlab HTML]
  B --> C[Client-side Renderers]
\`\`\`

Colors: \`#FF5733\` and \`rgb(0, 128, 255)\`
    `;

    const container = document.getElementById('content');
    container.innerHTML = markedInstance.parse(md);

    // 1. Render KaTeX math
    container.querySelectorAll('.gl-math-inline').forEach((el) => {
      katex.render(el.textContent, el, { displayMode: false, throwOnError: false });
    });
    container.querySelectorAll('.gl-math-block').forEach((el) => {
      katex.render(el.textContent, el, { displayMode: true, throwOnError: false });
    });

    // 2. Render Mermaid diagrams
    await mermaid.run({ nodes: container.querySelectorAll('pre.mermaid') });
  </script>
</body>
</html>
```

---

## Utility Exports

In addition to the default plugin function, `marked-gitlab` exports several helper functions:

```ts
import {
  generateGitlabSlug,
  renderColorCode,
  isColorCode,
  parseGitlabReference,
  renderEmoji,
  DEFAULT_EMOJIS,
  EMOJI_DATA,
} from 'marked-gitlab';
```

## License

[MIT](LICENSE)
