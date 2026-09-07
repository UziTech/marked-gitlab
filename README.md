# marked-gitlab

A [Marked](https://marked.js.org/) extension for [GitLab Flavored Markdown (GLFM)](https://docs.gitlab.com/user/markdown/).

[![npm version](https://badge.fury.io/js/marked-gitlab.svg)](https://badge.fury.io/js/marked-gitlab)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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
<code><span class="gl-color-chip" style="background-color: #FF0000;"></span>#FF0000</code>
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
<ins class="diff addition">added text</ins>
<del class="diff deletion">deleted text</del>
```

### 5. Table of Contents (`[[_TOC_]]` / `[TOC]`) & Heading Anchors

Insert a table of contents automatically generated from document headings:

```markdown
[[_TOC_]]

# Chapter 1
## Section A
# Chapter 2
```

Heading anchors follow GitLab's slugification rules (Unicode letter/digit preservation, space-to-hyphen conversion, punctuation removal, and duplicate deduplication `-1`, `-2`).

### 6. Task Lists & Inapplicable Items (`[~]`)

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

### 7. Multimedia & Dimensions

Automatically detects audio and video files, and supports dimension attributes `{width=... height=...}`:

```markdown
![Video](media/demo.mp4)
![Audio](media/podcast.mp3)
![Logo](img/logo.png){width=100 height=50px}
```

### 8. Diagrams, Math & JSON Tables

- **Diagrams**: Fenced code blocks for `mermaid`, `plantuml`, and `kroki`:

  ````markdown
  ```mermaid
  graph TD
    A-->B
  ```
  ````

- **Math Equations**: Display blocks using ```` ```math ```` and inline expressions with `$`:

  ```markdown
  $`a^2 + b^2 = c^2`$
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
| `#123` / `group/proj#123` | Issues | `#101`, `my/proj#101` |
| `!123` | Merge requests | `!204` |
| `$123` | Snippets | `$501` |
| `&123` | Epics | `&301` |
| `~label` / `~"label name"` | Labels | `~bug`, `~"feature request"` |
| `%milestone` / `%"milestone"` | Milestones | `%16.0`, `%"Sprint 1"` |
| `*iteration:"title"` | Iterations | `*iteration:"Q3"` |
| `^alert#123` | Alerts | `^alert#45` |
| `[work_item:123]` | Bracket references | `[work_item:123]`, `[vulnerability:1]` |
| `commit@sha` / 40-char SHA | Commits | `other@9ba12248`, `0123456789abcdef...` |
| `sha...sha` | Commit comparison | `9ba12248...b19a04f5` |
| `[[Page]]` / `[[Title\|slug]]` | Wiki pages | `[[User Guide\|user-guide]]` |

Prefix references with `\` to prevent linking (e.g. `\#123`).

### 11. Emojis

Converts standard emoji shortcodes into `<gl-emoji>` tags:

```markdown
:thumbsup: :heart: :rocket:
```

Rendered HTML:

```html
<gl-emoji title="thumbs up" data-name="thumbsup" data-unicode-version="6.0">👍</gl-emoji>
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

  /** Enable front matter extraction (default: true) */
  frontMatter?: boolean;

  /** Map of placeholder keys to replacement values (e.g. { KEY: 'val' }) */
  placeholders?: Record<string, string>;

  /** Enable emoji shortcodes or provide a custom emoji map (default: true) */
  emojis?: boolean | Record<string, { emoji: string; title: string }>;

  /** Handler for ::include{file=...} directives */
  includeHandler?: (file: string) => string | undefined;
}
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
} from 'marked-gitlab';
```

## License

[MIT](LICENSE)
