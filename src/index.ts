// node:coverage ignore next
import { Lexer } from 'marked';
import type { MarkedExtension, Token, Tokens } from 'marked';
import type { MarkedGitlabOptions } from './types.ts';
import { generateGitlabSlug } from './slug.ts';
import { renderColorCode, isColorCode } from './colors.ts';
import { parseGitlabReference } from './references.ts';
import { renderEmoji, DEFAULT_EMOJIS } from './emojis.ts';

export type { MarkedGitlabOptions };
export { generateGitlabSlug, renderColorCode, isColorCode, parseGitlabReference, renderEmoji, DEFAULT_EMOJIS };

interface CustomHeading extends Tokens.Heading {
  anchor?: string;
}

interface CustomListItem extends Tokens.ListItem {
  inapplicable?: boolean;
}

interface CustomAlert extends Tokens.Generic {
  type: 'alert';
  alertType: string;
  title: string;
}

interface CustomTableOfContents extends Tokens.Generic {
  type: 'tableOfContents';
  headings?: Array<{ depth: number; text: string; slug: string }>;
}

interface JsonTableField {
  key: string;
  label: string;
  sortable?: boolean;
}

interface JsonTableData {
  caption?: string;
  items?: Record<string, unknown>[];
  fields?: Array<string | JsonTableField>;
  filter?: boolean;
  markdown?: boolean;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderToc(headings: Array<{ depth: number; text: string; slug: string }>): string {
  if (headings.length === 0) {
    return '';
  }

  let html = '<ul class="section-nav">\n';
  let currentDepth = headings[0].depth;

  for (let i = 0; i < headings.length; i++) {
    const { depth, text, slug } = headings[i];

    if (depth > currentDepth) {
      while (depth > currentDepth) {
        html += '<ul>\n';
        currentDepth++;
      }
    } else if (depth < currentDepth) {
      while (depth < currentDepth) {
        html += '</li>\n</ul>\n';
        currentDepth--;
      }
      html += '</li>\n';
    } else if (i > 0) {
      html += '</li>\n';
    }

    html += `<li><a href="#${slug}">${text}</a>`;
  }

  while (currentDepth >= headings[0].depth) {
    html += '</li>\n</ul>\n';
    currentDepth--;
  }

  return html;
}

const VIDEO_EXTENSIONS = new Set(['.mp4', '.m4v', '.mov', '.webm', '.ogv']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.oga', '.ogg', '.spx', '.wav']);
const ALERT_TYPES = new Set(['note', 'tip', 'important', 'caution', 'warning']);

export default function markedGitlab(options: MarkedGitlabOptions = {}): MarkedExtension {
  const {
    baseUrl = 'https://gitlab.com',
    project = '',
    alerts = true,
    multilineBlockquotes = true,
    colorChips = true,
    descriptionLists = true,
    inlineDiffs = true,
    tableOfContents = true,
    headingAnchors = true,
    taskLists = true,
    references = true,
    multimedia = true,
    diagrams = true,
    math = true,
    jsonTables = true,
    frontMatter = true,
    placeholders = {},
    emojis = true,
    includeHandler,
  } = options;

  let currentHeadings: Array<{ depth: number; text: string; slug: string }> = [];

  const extensions: NonNullable<MarkedExtension['extensions']> = [];

  // Front matter extension
  if (frontMatter) {
    extensions.push({
      name: 'frontMatter',
      level: 'block',
      start(src) {
        return src.match(/^[+-;]{3}/)?.index;
      },
      tokenizer(src) {
        const match = src.match(/^([+-;]{3})([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)\r?\n\1(?:\r?\n|$)/);
        if (match) {
          const delim = match[1];
          const lang = match[2] || (delim === '---' ? 'yaml' : delim === '+++' ? 'toml' : 'json');
          return {
            type: 'frontMatter',
            raw: match[0],
            lang,
            content: match[3],
          };
        }
      },
      renderer(token: Tokens.Generic) {
        return `<pre class="gl-front-matter" data-lang="${token.lang}"><code>${escapeHtml(token.content)}</code></pre>\n`;
      },
    });
  }

  // Multiline blockquotes extension: >>>
  if (multilineBlockquotes) {
    extensions.push({
      name: 'multilineBlockquote',
      level: 'block',
      start(src) {
        return src.indexOf('>>>');
      },
      tokenizer(src) {
        const match = src.match(
          /^>>>[ \t]*(?:\[!([a-zA-Z]+)\](?:[ \t]+([^\n]*))?)?[ \t]*\r?\n([\s\S]*?)(?:\r?\n>>>[ \t]*(?:\r?\n|$)|$)/,
        );
        if (match) {
          const raw = match[0];
          const alertType = match[1]?.toLowerCase();
          const alertTitle = match[2]?.trim();
          const content = match[3];

          if (alerts && alertType && ALERT_TYPES.has(alertType)) {
            const title = alertTitle || (alertType.charAt(0).toUpperCase() + alertType.slice(1));
            const tokens: Token[] = [];
            this.lexer.blockTokens(content, tokens);
            return {
              type: 'alert',
              raw,
              alertType,
              title,
              tokens,
            };
          }

          const tokens: Token[] = [];
          this.lexer.blockTokens(content, tokens);
          return {
            type: 'multilineBlockquote',
            raw,
            tokens,
          };
        }
      },
      renderer(token: Tokens.Generic) {
        return `<blockquote>\n${this.parser.parse(token.tokens!)}\n</blockquote>\n`;
      },
    });
  }

  // Alert extension
  if (alerts) {
    extensions.push({
      name: 'alert',
      level: 'block',
      renderer(token: Tokens.Generic) {
        return `<div class="markdown-alert markdown-alert-${token.alertType}">\n<p class="markdown-alert-title">${token.title}</p>\n${this.parser.parse(token.tokens!)}</div>\n`;
      },
    });
  }

  // Description lists extension
  if (descriptionLists) {
    extensions.push({
      name: 'descriptionList',
      level: 'block',
      start(src) {
        return src.search(/\r?\n:[ \t]+/);
      },
      tokenizer(src) {
        const DESC_ITEM_REGEX = /^([^\n:#>][^\n]*)\r?\n(?:[ \t]*\r?\n)?((?::[ \t]+[^\n]+(?:\r?\n|$)(?:[ \t]*\r?\n(?=:[ \t]))?)+)/;
        if (!DESC_ITEM_REGEX.test(src)) {
          return;
        }

        let fullRaw = '';
        let remaining = src;
        const items: Array<{
          term: string;
          termTokens: Token[];
          descriptions: Array<{ text: string; tokens: Token[] }>;
        }> = [];

        let m: RegExpMatchArray | null = remaining.match(DESC_ITEM_REGEX);
        while (m) {
          fullRaw += m[0];
          const term = m[1].trim();
          const descLines = m[2]
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l.startsWith(':'));

          items.push({
            term,
            termTokens: this.lexer.inlineTokens(term),
            descriptions: descLines.map((l) => {
              const text = l.replace(/^:[ \t]+/, '').trim();
              return { text, tokens: this.lexer.inlineTokens(text) };
            }),
          });
          remaining = remaining.slice(m[0].length);
          const blankMatch = remaining.match(/^[ \t]*\r?\n/);
          const lookahead = blankMatch ? remaining.slice(blankMatch[0].length) : remaining;
          m = lookahead.match(DESC_ITEM_REGEX);
          if (m && blankMatch) {
            fullRaw += blankMatch[0];
            remaining = lookahead;
          }
        }

        return {
          type: 'descriptionList',
          raw: fullRaw,
          items,
        };
      },
      renderer(token: Tokens.Generic) {
        let html = '<dl>\n';
        for (const item of token.items) {
          html += `<dt>${this.parser.parseInline(item.termTokens)}</dt>\n`;
          for (const desc of item.descriptions) {
            html += `<dd>${this.parser.parseInline(desc.tokens)}</dd>\n`;
          }
        }
        html += '</dl>\n';
        return html;
      },
    });
  }

  // Inline diffs extension
  if (inlineDiffs) {
    extensions.push({
      name: 'inlineDiff',
      level: 'inline',
      start(src) {
        return src.search(/[{}\[](?:\+|\-)/);
      },
      tokenizer(src) {
        const match = src.match(/^(?:\{\+([\s\S]*?)\+\}|\[\+([\s\S]*?)\+\]|\{-([\s\S]*?)-\}|\[-([\s\S]*?)-\])/);
        if (match) {
          const isAddition = match[1] !== undefined || match[2] !== undefined;
          const text = (match[1] ?? match[2] ?? match[3] ?? match[4]).trim();
          return {
            type: 'inlineDiff',
            raw: match[0],
            diffType: isAddition ? 'addition' : 'deletion',
            text,
            tokens: this.lexer.inlineTokens(text),
          };
        }
      },
      renderer(token: Tokens.Generic) {
        const tag = token.diffType === 'addition' ? 'ins' : 'del';
        return `<${tag} class="diff ${token.diffType}">${this.parser.parseInline(token.tokens!)}</${tag}>`;
      },
    });
  }

  // Table of contents extension
  if (tableOfContents) {
    extensions.push({
      name: 'tableOfContents',
      level: 'block',
      start(src) {
        return src.search(/^(\[\[_TOC_\]\]|\[TOC\])/m);
      },
      tokenizer(src) {
        const match = src.match(/^(\[\[_TOC_\]\]|\[TOC\])[ \t]*(?:\r?\n|$)/);
        if (match) {
          return {
            type: 'tableOfContents',
            raw: match[0],
            headings: [],
          };
        }
      },
      renderer(token: Tokens.Generic) {
        return renderToc((token as CustomTableOfContents).headings!);
      },
    });
  }

  // Inline math extension
  if (math) {
    extensions.push({
      name: 'inlineMath',
      level: 'inline',
      start(src) {
        return src.indexOf('$');
      },
      tokenizer(src) {
        const match = src.match(/^(?:\$`([^`]+)`\$|\$\$([^$]+)\$\$|\$([^$\r\n]+)\$)/);
        if (match) {
          const mathExpr = match[1] ?? match[2] ?? match[3];
          return {
            type: 'inlineMath',
            raw: match[0],
            math: mathExpr,
          };
        }
      },
      renderer(token: Tokens.Generic) {
        return `<span class="gl-math-inline" data-math-style="inline">${escapeHtml(token.math)}</span>`;
      },
    });
  }

  // GitLab multimedia extension (video, audio, and dimensioned images)
  if (multimedia) {
    extensions.push({
      name: 'gitlabMedia',
      level: 'inline',
      start(src) {
        return src.search(/!?\[/);
      },
      tokenizer(src) {
        const match = src.match(/^(!)?\[(.*?)\]\((.*?)\)(?:\{([a-zA-Z0-9%=\s]+)\})?/);
        if (match) {
          const isImage = match[1] === '!';
          const text = match[2];
          let hrefWithTitle = match[3].trim();
          let title: string | null = null;
          const titleMatch = hrefWithTitle.match(/^(.*?)\s+["'](.*?)["']$/);
          if (titleMatch) {
            hrefWithTitle = titleMatch[1];
            title = titleMatch[2];
          }

          const cleanPath = hrefWithTitle.split(/[?#]/)[0].toLowerCase();
          const ext = cleanPath.slice(cleanPath.lastIndexOf('.'));
          const isVideo = VIDEO_EXTENSIONS.has(ext);
          const isAudio = AUDIO_EXTENSIONS.has(ext);

          let dimensions: { width?: string; height?: string } | undefined;
          if (match[4]) {
            dimensions = {};
            const w = match[4].match(/width=(\d+(?:px|%)?)/);
            if (w) {
              dimensions.width = w[1].replace(/px$/, '');
            }
            const h = match[4].match(/height=(\d+(?:px|%)?)/);
            if (h) {
              dimensions.height = h[1].replace(/px$/, '');
            }
          }

          if (isVideo || isAudio || (isImage && dimensions)) {
            return {
              type: 'gitlabMedia',
              raw: match[0],
              mediaType: isVideo ? 'video' : isAudio ? 'audio' : 'image',
              href: hrefWithTitle,
              title,
              text,
              dimensions,
            };
          }
        }
      },
      renderer(token: Tokens.Generic) {
        const titleAttr = token.title ? ` title="${escapeHtml(token.title)}"` : '';
        const dims = token.dimensions as { width?: string; height?: string } | undefined;
        let dimAttrs = '';
        if (dims?.width) {
          dimAttrs += ` width="${escapeHtml(dims.width)}"`;
        }
        if (dims?.height) {
          dimAttrs += ` height="${escapeHtml(dims.height)}"`;
        }

        if (token.mediaType === 'video') {
          return `<video src="${escapeHtml(token.href)}" controls${titleAttr}${dimAttrs}><a href="${escapeHtml(token.href)}">${escapeHtml(token.text)}</a></video>`;
        }

        if (token.mediaType === 'audio') {
          return `<audio src="${escapeHtml(token.href)}" controls${titleAttr}><a href="${escapeHtml(token.href)}">${escapeHtml(token.text)}</a></audio>`;
        }

        return `<img src="${escapeHtml(token.href)}" alt="${escapeHtml(token.text)}"${titleAttr}${dimAttrs}>`;
      },
    });
  }

  // GitLab references extension
  if (references) {
    extensions.push({
      name: 'gitlabReference',
      level: 'inline',
      start(src) {
        const escIdx = src.search(
          /\\(?:[@#!~$%&^]|\[(?:issue|epic|work_item|cadence|vulnerability|feature_flag|contact|wiki_page):)/,
        );
        const sigilIdx = src.search(
          /[@#!~$%&^]|\[(?:issue|epic|work_item|cadence|vulnerability|feature_flag|contact|wiki_page):|\[\[|\*iteration:/,
        );

        let earliest = -1;
        if (escIdx !== -1) {
          earliest = escIdx;
        }
        if (sigilIdx !== -1) {
          const before = src.slice(0, sigilIdx);
          const projMatch = before.match(/(?:^|[\s(])((?:[a-zA-Z0-9_\-.]+\/)?[a-zA-Z0-9_\-.]+)$/);
          const startIdx = projMatch ? sigilIdx - projMatch[1].length : sigilIdx;
          if (earliest === -1 || startIdx < earliest) {
            earliest = startIdx;
          }
        }

        const commitRangeIdx = src.search(/\b[0-9a-f]{8,40}\.\.\.[0-9a-f]{8,40}\b/i);
        if (commitRangeIdx !== -1 && (earliest === -1 || commitRangeIdx < earliest)) {
          earliest = commitRangeIdx;
        }

        const commitIdx = src.search(/\b[0-9a-f]{40}\b/i);
        if (commitIdx !== -1 && (earliest === -1 || commitIdx < earliest)) {
          earliest = commitIdx;
        }

        return earliest === -1 ? undefined : earliest;
      },
      tokenizer(src) {
        const escaped = src.match(
          /^\\(\^alert#\d+|[@#!~$%&]|\[(?:issue|epic|work_item|cadence|vulnerability|feature_flag|contact|wiki_page):[^\]]+\])/,
        );
        if (escaped) {
          return {
            type: 'text',
            raw: escaped[0],
            text: escaped[0].slice(1),
          };
        }

        const ref = parseGitlabReference(src, baseUrl, project);
        if (ref) {
          return {
            type: 'gitlabReference',
            raw: ref.raw,
            href: ref.href,
            text: ref.text,
            className: ref.className,
            title: ref.title,
          };
        }
      },
      renderer(token: Tokens.Generic) {
        const titleAttr = token.title ? ` title="${escapeHtml(token.title)}"` : '';
        return `<a href="${escapeHtml(token.href)}" class="${token.className}"${titleAttr}>${escapeHtml(token.text)}</a>`;
      },
    });
  }

  // Emoji extension
  if (emojis) {
    extensions.push({
      name: 'gitlabEmoji',
      level: 'inline',
      start(src) {
        return src.indexOf(':');
      },
      tokenizer(src) {
        const match = src.match(/^:([a-zA-Z0-9_+]+):/);
        if (match) {
          const custom = typeof emojis === 'object' ? emojis : undefined;
          const rendered = renderEmoji(match[1], custom);
          if (rendered) {
            return {
              type: 'gitlabEmoji',
              raw: match[0],
              name: match[1],
              html: rendered,
            };
          }
        }
      },
      renderer(token: Tokens.Generic) {
        return token.html;
      },
    });
  }

  return {
    extensions,
    hooks: {
      preprocess(markdown: string) {
        let text = markdown;

        // Front matter strip if disabled
        if (!frontMatter) {
          text = text.replace(/^[+-;]{3}[a-zA-Z0-9_-]*\r?\n[\s\S]*?\r?\n[+-;]{3}(?:\r?\n|$)/, '');
        }

        // Include directive
        if (includeHandler) {
          text = text.replace(/^::include\{file=([^}]+)\}[ \t]*(?:\r?\n|$)/gm, (_, file) => {
            return includeHandler(file) ?? `::include{file=${file}}\n`;
          });
        }

        // Placeholders: %{KEY}
        if (placeholders && typeof placeholders === 'object') {
          text = text.replace(/%\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
            return Object.hasOwn(placeholders, key) ? placeholders[key] : match;
          });
        }

        return text;
      },
      processAllTokens(tokens: Token[]) {
        const slugCounts = new Map<string, number>();
        currentHeadings = [];

        const walk = (toks: Token[]) => {
          for (let i = 0; i < toks.length; i++) {
            const tok = toks[i];

            // Heading anchor slug computation
            if (tok.type === 'heading') {
              const h = tok as CustomHeading;
              const slug = generateGitlabSlug(h.text, slugCounts);
              h.anchor = slug;
              currentHeadings.push({ depth: h.depth, text: h.text, slug });
            }

            // Standard blockquote alerts conversion: > [!note]
            if (alerts && tok.type === 'blockquote' && (tok as Tokens.Blockquote).tokens?.length) {
              const bq = tok as Tokens.Blockquote;
              const first = bq.tokens[0];
              if (first?.type === 'paragraph' && typeof first.text === 'string') {
                const m = first.text.match(/^\[!([a-zA-Z]+)\](?:[ \t]+([^\n]*))?(?:\r?\n|$)?/);
                if (m && ALERT_TYPES.has(m[1].toLowerCase())) {
                  const alertType = m[1].toLowerCase();
                  const title = m[2]?.trim() || (alertType.charAt(0).toUpperCase() + alertType.slice(1));
                  const remainingText = first.text.slice(m[0].length);

                  const alertToken = tok as unknown as CustomAlert;
                  alertToken.type = 'alert';
                  alertToken.alertType = alertType;
                  alertToken.title = title;

                  if (!remainingText.trim()) {
                    bq.tokens.shift();
                  } else {
                    first.text = remainingText;
                    first.raw = first.raw.replace(m[0], '');
                    first.tokens = Lexer.lexInline(remainingText);
                  }
                }
              }
            }

            // Inapplicable task list item: [~]
            if (taskLists && tok.type === 'list_item') {
              const li = tok as CustomListItem;
              if (li.text.startsWith('[~] ') || li.text === '[~]') {
                li.inapplicable = true;
                li.task = true;
                li.text = li.text.replace(/^\[~\][ \t]?/, '');
                if (li.tokens) {
                  const stripInapp = (subToks: Token[]) => {
                    for (const t of subToks) {
                      if ('text' in t && typeof t.text === 'string') {
                        t.text = t.text.replace(/^\[~\][ \t]?/, '');
                      }
                      if ('raw' in t && typeof t.raw === 'string') {
                        t.raw = t.raw.replace(/^\[~\][ \t]?/, '');
                      }
                      if ('tokens' in t && Array.isArray(t.tokens)) {
                        stripInapp(t.tokens);
                      }
                    }
                  };
                  stripInapp(li.tokens);
                }
              }
            }

            // Nested tokens
            if ('tokens' in tok && Array.isArray(tok.tokens)) {
              walk(tok.tokens);
            }
            if ('items' in tok && Array.isArray(tok.items)) {
              walk(tok.items);
            }
          }
        };

        walk(tokens);

        // Assign headings to tableOfContents tokens
        const assignToc = (toks: Token[]) => {
          for (const tok of toks) {
            if (tok.type === 'tableOfContents') {
              (tok as CustomTableOfContents).headings = currentHeadings;
            }
            if ('tokens' in tok && Array.isArray(tok.tokens)) {
              assignToc(tok.tokens);
            }
          }
        };
        assignToc(tokens);

        return tokens;
      },
    },
    renderer: {
      heading(token: Tokens.Heading) {
        if (!headingAnchors) {
          return false;
        }
        const slug = (token as CustomHeading).anchor!;
        return `<h${token.depth} id="${slug}">${this.parser.parseInline(token.tokens)}</h${token.depth}>\n`;
      },

      codespan(token: Tokens.Codespan) {
        if (!colorChips) {
          return false;
        }
        const rendered = renderColorCode(token.text);
        if (rendered !== false) {
          return rendered;
        }
        return false;
      },

      checkbox({ checked }: Tokens.Checkbox) {
        if (!taskLists) {
          return false;
        }
        return `<input type="checkbox" disabled class="task-list-item-checkbox"${checked ? ' checked' : ''}> `;
      },

      listitem(item: Tokens.ListItem) {
        if (!taskLists) {
          return false;
        }
        if ((item as CustomListItem).inapplicable) {
          return `<li class="task-list-item"><input type="checkbox" disabled class="task-list-item-checkbox" data-inapplicable="true"> ${this.parser.parse(item.tokens)}</li>\n`;
        }
        if (item.task) {
          return `<li class="task-list-item">${this.parser.parse(item.tokens)}</li>\n`;
        }
        return false;
      },

      code(token: Tokens.Code) {
        const lang = token.lang?.trim();

        // Diagram blocks
        if (diagrams && lang && ['mermaid', 'plantuml', 'kroki'].includes(lang)) {
          return `<pre class="${lang}"><code>${escapeHtml(token.text)}</code></pre>\n`;
        }

        // Math blocks
        if (math && lang === 'math') {
          return `<div class="gl-math-block" data-math-style="display">${escapeHtml(token.text)}</div>\n`;
        }

        // JSON tables
        if (jsonTables && lang === 'json:table') {
          try {
            const data = JSON.parse(token.text) as JsonTableData;
            const caption = data.caption ?? 'Generated with JSON data';
            const items: Record<string, unknown>[] = Array.isArray(data.items) ? data.items : [];
            let fields: JsonTableField[] = [];

            if (Array.isArray(data.fields)) {
              fields = data.fields.map((f) => {
                if (typeof f === 'string') {
                  return { key: f, label: f };
                }
                return { key: f.key, label: f.label ?? f.key, sortable: !!f.sortable };
              });
            } else if (items.length > 0) {
              fields = Object.keys(items[0]).map((key) => ({ key, label: key }));
            }

            const isMarkdown = !!data.markdown;
            const captionHtml = isMarkdown
              ? this.parser.parseInline(Lexer.lexInline(caption))
              : escapeHtml(caption);

            let tableHtml = '<table class="gl-table gl-json-table">\n';
            tableHtml += `<caption>${captionHtml}</caption>\n`;
            tableHtml += '<thead>\n<tr>\n';
            for (const f of fields) {
              tableHtml += `<th>${escapeHtml(f.label)}${f.sortable ? ' <span class="sortable">↕</span>' : ''}</th>\n`;
            }
            tableHtml += '</tr>\n</thead>\n';
            tableHtml += '<tbody>\n';

            for (const row of items) {
              tableHtml += '<tr>\n';
              for (const f of fields) {
                const val = row[f.key] !== undefined ? String(row[f.key]) : '';
                const cellContent = isMarkdown
                  ? this.parser.parseInline(Lexer.lexInline(val))
                  : escapeHtml(val);
                tableHtml += `<td>${cellContent}</td>\n`;
              }
              tableHtml += '</tr>\n';
            }

            tableHtml += '</tbody>\n</table>\n';
            return tableHtml;
          } catch {
            return `<div class="gl-json-table-error"><p>Invalid JSON table</p><pre><code>${escapeHtml(token.text)}</code></pre></div>\n`;
          }
        }

        return false;
      },
    },
  };
}
