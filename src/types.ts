export interface MarkedGitlabOptions {
  /**
   * Base GitLab URL (default: 'https://gitlab.com')
   */
  baseUrl?: string;

  /**
   * Current project path (e.g., 'gitlab-org/gitlab')
   */
  project?: string;

  /**
   * Enable alerts / callouts (default: true)
   */
  alerts?: boolean;

  /**
   * Enable multiline blockquotes `>>>` (default: true)
   */
  multilineBlockquotes?: boolean;

  /**
   * Enable color chips for HEX, RGB, HSL codes in backticks (default: true)
   */
  colorChips?: boolean;

  /**
   * Enable description lists (default: true)
   */
  descriptionLists?: boolean;

  /**
   * Enable inline diffs `{+added+}` / `[-deleted-]` (default: true)
   */
  inlineDiffs?: boolean;

  /**
   * Enable table of contents `[[_TOC_]]` or `[TOC]` (default: true)
   */
  tableOfContents?: boolean;

  /**
   * Enable heading anchors using GitLab slug algorithm (default: true)
   */
  headingAnchors?: boolean;

  /**
   * Enable task lists with inapplicable `[~]` support (default: true)
   */
  taskLists?: boolean;

  /**
   * Enable GitLab-specific references like `#123`, `@user`, `!123` (default: true)
   */
  references?: boolean;

  /**
   * Enable multimedia video/audio embeds and dimensions (default: true)
   */
  multimedia?: boolean;

  /**
   * Enable diagram blocks (mermaid, plantuml, kroki) (default: true)
   */
  diagrams?: boolean;

  /**
   * Enable math equations (default: true)
   */
  math?: boolean;

  /**
   * Enable JSON tables (default: true)
   */
  jsonTables?: boolean;

  /**
   * Enable front matter handling (default: true)
   */
  frontMatter?: boolean;

  /**
   * Enable footnotes `[^1]` (default: true)
   */
  footnotes?: boolean;

  /**
   * Placeholders map, or false to disable (default: {})
   */
  placeholders?: Record<string, string> | false;

  /**
   * Enable emojis or custom emoji dictionary (default: true)
   */
  emojis?: boolean | Record<string, string>;

  /**
   * Custom include handler for `::include{file=...}`
   */
  includeHandler?: (file: string) => string | undefined;
}
