import { describe, test } from 'node:test';
import { Marked } from 'marked';
import markedGitlab, {
  generateGitlabSlug,
  renderColorCode,
  isColorCode,
  parseGitlabReference,
  renderEmoji,
  EMOJI_DATA,
} from '../src/index.ts';

describe('marked-gitlab', () => {
  describe('heading anchors and TOC', () => {
    test('generates gitlab heading slugs with deduplication and special rules', (t) => {
      const counts = new Map<string, number>();
      t.assert.equal(generateGitlabSlug('This heading has spaces in it', counts), 'this-heading-has-spaces-in-it');
      t.assert.equal(generateGitlabSlug('This heading has a :thumbsup: in it', counts), 'this-heading-has-a-thumbsup-in-it');
      t.assert.equal(generateGitlabSlug('This heading has Unicode in it: 한글', counts), 'this-heading-has-unicode-in-it-한글');
      t.assert.equal(generateGitlabSlug('This heading has spaces in it', counts), 'this-heading-has-spaces-in-it-1');
      t.assert.equal(generateGitlabSlug('This heading has spaces in it', counts), 'this-heading-has-spaces-in-it-2');
      t.assert.equal(generateGitlabSlug('This heading has 3.5 in it (and parentheses)', counts), 'this-heading-has-35-in-it-and-parentheses');
      t.assert.equal(
        generateGitlabSlug('This heading has  multiple spaces and --- hyphens_and_underscores', counts),
        'this-heading-has--multiple-spaces-and-----hyphens_and_underscores',
      );
    });

    test('renders headings with id and links [[_TOC_]]', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '[[_TOC_]]\n\n# Section One\n\n## Sub Section\n\n# Section Two\n';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<h1 id="section-one">Section One<a href="#section-one" aria-label="Link to heading 'Section One'" data-heading-content="Section One" class="anchor"><\/a><\/h1>/);
      t.assert.match(html, /<h2 id="sub-section">Sub Section<a href="#sub-section" aria-label="Link to heading 'Sub Section'" data-heading-content="Sub Section" class="anchor"><\/a><\/h2>/);
      t.assert.match(html, /<h1 id="section-two">Section Two<a href="#section-two" aria-label="Link to heading 'Section Two'" data-heading-content="Section Two" class="anchor"><\/a><\/h1>/);
      t.assert.match(html, /<ul class="section-nav">/);
      t.assert.match(html, /<a href="#section-one">Section One<\/a>/);
      t.assert.match(html, /<a href="#sub-section">Sub Section<\/a>/);
    });

    test('supports [TOC] tag and deep nesting', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '[TOC]\n\n# H1\n\n## H2\n\n### H3\n\n# Back to H1\n';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<ul class="section-nav">/);
      t.assert.match(html, /<a href="#h1">H1<\/a>/);
      t.assert.match(html, /<a href="#h2">H2<\/a>/);
      t.assert.match(html, /<a href="#h3">H3<\/a>/);
      t.assert.match(html, /<a href="#back-to-h1">Back to H1<\/a>/);
    });

    test('renders TOC with consecutive same-depth headings', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '[[_TOC_]]\n\n# H1 A\n\n# H1 B\n\n## H2 A\n\n## H2 B\n';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<a href="#h1-a">H1 A<\/a><\/li>\n<li><a href="#h1-b">H1 B<\/a>/);
      t.assert.match(html, /<a href="#h2-a">H2 A<\/a><\/li>\n<li><a href="#h2-b">H2 B<\/a>/);
    });

    test('TOC with no headings returns empty string', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const html = marked.parse('[[_TOC_]]\n\nJust text, no headings.') as string;
      t.assert.doesNotMatch(html, /<ul class="section-nav">/);
    });

    test('options headingAnchors and tableOfContents can be disabled', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ headingAnchors: false, tableOfContents: false }));
      const html = marked.parse('[TOC]\n\n# No Anchor\n') as string;

      t.assert.doesNotMatch(html, /<h1 id=/);
      t.assert.doesNotMatch(html, /<ul class="section-nav">/);
    });
  });

  describe('multiline blockquotes and alerts', () => {
    test('renders multiline blockquotes with >>>', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '>>>\nLine 1\n\nLine 2\n>>>';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<blockquote>\s*<p>Line 1<\/p>\s*<p>Line 2<\/p>\s*<\/blockquote>/);
    });

    test('renders multiline blockquote with unknown alert type as regular blockquote', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '>>> [!unknown] Not an alert\nBody text\n>>>';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<blockquote>/);
      t.assert.doesNotMatch(html, /markdown-alert/);
    });

    test('renders multiline blockquote alert with custom title', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '>>> [!warning] Data deletion\nThe following will delete data.\n>>>';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<div class="markdown-alert markdown-alert-warning">/);
      t.assert.match(html, /<p class="markdown-alert-title">Data deletion<\/p>/);
      t.assert.match(html, /<p>The following will delete data\.<\/p>/);
    });

    test('renders multiline blockquote alert with default capitalized title', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '>>> [!note]\nDefault title note.\n>>>';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<div class="markdown-alert markdown-alert-note">/);
      t.assert.match(html, /<p class="markdown-alert-title">Note<\/p>/);
    });

    test('renders standard blockquote alerts with > [!note]', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '> [!note]\n> This is useful information.';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<div class="markdown-alert markdown-alert-note">/);
      t.assert.match(html, /<p class="markdown-alert-title">Note<\/p>/);
      t.assert.match(html, /<p>This is useful information\.<\/p>/);
    });

    test('renders standard blockquote alert with no following body', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '> [!note]';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<div class="markdown-alert markdown-alert-note">/);
      t.assert.match(html, /<p class="markdown-alert-title">Note<\/p>/);
    });

    test('renders all alert types: tip, important, caution, warning', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const types = ['tip', 'important', 'caution', 'warning'];

      for (const kind of types) {
        const input = `> [!${kind}] Custom ${kind}\n> Content of ${kind}`;
        const html = marked.parse(input) as string;
        t.assert.match(html, new RegExp(`<div class="markdown-alert markdown-alert-${kind}">`));
        t.assert.match(html, new RegExp(`<p class="markdown-alert-title">Custom ${kind}</p>`));
      }
    });

    test('standard blockquote without alert is preserved', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '> Just a normal quote';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<blockquote>\s*<p>Just a normal quote<\/p>\s*<\/blockquote>/);
    });

    test('alerts can be disabled in options', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ alerts: false, multilineBlockquotes: false }));
      const input = '> [!note]\n> Just quote';
      const html = marked.parse(input) as string;

      t.assert.doesNotMatch(html, /markdown-alert/);
    });
  });

  describe('colors', () => {
    test('recognizes HEX, RGB, HSL color codes in backticks', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '- `#F00`\n- `#FF0000AA`\n- `RGB(0,255,0)`\n- `RGBA(0,255,0,0.3)`\n- `HSL(540,70%,50%)`\n- `HSLA(540,70%,50%,0.3)`';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<code>#F00<span class="gfm-color_chip"><span style="background-color: #F00;"><\/span><\/span><\/code>/);
      t.assert.match(html, /<code>#FF0000AA<span class="gfm-color_chip"><span style="background-color: #FF0000AA;"><\/span><\/span><\/code>/);
      t.assert.match(html, /<code>RGB\(0,255,0\)<span class="gfm-color_chip"><span style="background-color: RGB\(0,255,0\);"><\/span><\/span><\/code>/);
      t.assert.match(html, /<code>RGBA\(0,255,0,0\.3\)<span class="gfm-color_chip"><span style="background-color: RGBA\(0,255,0,0\.3\);"><\/span><\/span><\/code>/);
      t.assert.match(html, /<code>HSL\(540,70%,50%\)<span class="gfm-color_chip"><span style="background-color: HSL\(540,70%,50%\);"><\/span><\/span><\/code>/);
      t.assert.match(html, /<code>HSLA\(540,70%,50%,0\.3\)<span class="gfm-color_chip"><span style="background-color: HSLA\(540,70%,50%,0\.3\);"><\/span><\/span><\/code>/);
    });

    test('recognizes modern space-separated CSS color syntax', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '- `rgb(255 0 0)`\n- `rgb(255 0 0 / 50%)`\n- `rgb(255 0 0 / 0.5)`\n- `hsl(0 100% 50%)`\n- `hsl(0 100% 50% / 0.5)`';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<code>rgb\(255 0 0\)<span class="gfm-color_chip"><span style="background-color: rgb\(255 0 0\);"><\/span><\/span><\/code>/);
      t.assert.match(html, /<code>rgb\(255 0 0 \/ 50%\)<span class="gfm-color_chip"><span style="background-color: rgb\(255 0 0 \/ 50%\);"><\/span><\/span><\/code>/);
      t.assert.match(html, /<code>rgb\(255 0 0 \/ 0\.5\)<span class="gfm-color_chip"><span style="background-color: rgb\(255 0 0 \/ 0\.5\);"><\/span><\/span><\/code>/);
      t.assert.match(html, /<code>hsl\(0 100% 50%\)<span class="gfm-color_chip"><span style="background-color: hsl\(0 100% 50%\);"><\/span><\/span><\/code>/);
      t.assert.match(html, /<code>hsl\(0 100% 50% \/ 0\.5\)<span class="gfm-color_chip"><span style="background-color: hsl\(0 100% 50% \/ 0\.5\);"><\/span><\/span><\/code>/);
    });

    test('escapes color codes with backslash to omit color chip', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '- `\\#FF0000`\n- `\\RGB(255,0,0)`\n- `\\HSL(0,100%,50%)`';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<code>#FF0000<\/code>/);
      t.assert.match(html, /<code>RGB\(255,0,0\)<\/code>/);
      t.assert.match(html, /<code>HSL\(0,100%,50%\)<\/code>/);
      t.assert.doesNotMatch(html, /gfm-color_chip/);
    });

    test('does not affect regular codespans', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const html = marked.parse('`const x = 10;`') as string;
      t.assert.match(html, /<code>const x = 10;<\/code>/);
      t.assert.doesNotMatch(html, /gfm-color_chip/);
    });

    test('color helper functions test edge cases', (t) => {
      t.assert.equal(isColorCode('not-a-color'), false);
      t.assert.equal(renderColorCode('not-a-color'), false);
      t.assert.equal(renderColorCode('\\not-a-color'), false);
    });

    test('colorChips can be disabled in options', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ colorChips: false }));
      const html = marked.parse('`#FF0000`') as string;
      t.assert.doesNotMatch(html, /gfm-color_chip/);
    });
  });

  describe('description lists', () => {
    test('renders single and multiple terms with descriptions', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = 'Fruits\n: apple\n: orange\n\nVegetables\n: broccoli\n: kale';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<dl>/);
      t.assert.match(html, /<dt>Fruits<\/dt>/);
      t.assert.match(html, /<dd>apple<\/dd>/);
      t.assert.match(html, /<dd>orange<\/dd>/);
      t.assert.match(html, /<dt>Vegetables<\/dt>/);
      t.assert.match(html, /<dd>broccoli<\/dd>/);
    });

    test('handles blank line between term and description', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = 'Fruits\n\n: apple\n\n: orange';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<dl>\s*<dt>Fruits<\/dt>\s*<dd>apple<\/dd>\s*<dd>orange<\/dd>\s*<\/dl>/);
    });

    test('renders consecutive terms without blank lines between items', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = 'First\n: desc 1\nSecond\n: desc 2';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<dt>First<\/dt>\s*<dd>desc 1<\/dd>\s*<dt>Second<\/dt>\s*<dd>desc 2<\/dd>/);
    });

    test('supports inline formatting in description lists', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '**Important Term**\n: *italic* description and `code`';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<dt><strong>Important Term<\/strong><\/dt>/);
      t.assert.match(html, /<dd><em>italic<\/em> description and <code>code<\/code><\/dd>/);
    });

    test('descriptionLists can be disabled in options', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ descriptionLists: false }));
      const input = 'Fruits\n: apple';
      const html = marked.parse(input) as string;

      t.assert.doesNotMatch(html, /<dl>/);
    });
  });

  describe('inline diffs', () => {
    test('renders additions and deletions with curly braces and brackets', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '- {+ addition 1 +}\n- [+ addition 2 +]\n- {- deletion 1 -}\n- [- deletion 2 -]';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<span class="idiff left right addition">addition 1<\/span>/);
      t.assert.match(html, /<span class="idiff left right addition">addition 2<\/span>/);
      t.assert.match(html, /<span class="idiff left right deletion">deletion 1<\/span>/);
      t.assert.match(html, /<span class="idiff left right deletion">deletion 2<\/span>/);
    });

    test('supports inline formatting inside diffs', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '{+ Added **bold** text +}';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<span class="idiff left right addition">Added <strong>bold<\/strong> text<\/span>/);
    });

    test('inlineDiffs can be disabled in options', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ inlineDiffs: false }));
      const input = '{+ addition +}';
      const html = marked.parse(input) as string;

      t.assert.doesNotMatch(html, /<span class="idiff/);
    });
  });

  describe('task lists', () => {
    test('renders inapplicable [~] tasks with data-inapplicable', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '- [x] Completed\n- [~] Inapplicable\n- [ ] Incomplete\n- [~]';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<li class="task-list-item"><input type="checkbox" disabled class="task-list-item-checkbox" checked> Completed<\/li>/);
      t.assert.match(html, /<li class="task-list-item"><input type="checkbox" disabled class="task-list-item-checkbox" data-inapplicable="true"> Inapplicable<\/li>/);
      t.assert.match(html, /<li class="task-list-item"><input type="checkbox" disabled class="task-list-item-checkbox"> Incomplete<\/li>/);
      t.assert.match(html, /<li class="task-list-item"><input type="checkbox" disabled class="task-list-item-checkbox" data-inapplicable="true"> <\/li>/);
    });

    test('preserves normal non-task list items', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const html = marked.parse('- Normal item') as string;
      t.assert.match(html, /<li>Normal item<\/li>/);
      t.assert.doesNotMatch(html, /task-list-item/);
    });

    test('renders native GLFM task lists in table cells with task-table-item class', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '| [x] | [~] | [ ] |\n'
        + '| :---: | --- | ---: |\n'
        + '| [x] | [ ] | Plain cell |\n'
        + '| [~] | Inapplicable row | [ ] |\n';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<th align="center" class="task-table-item"><input type="checkbox" disabled class="task-list-item-checkbox" checked> <\/th>/);
      t.assert.match(html, /<th class="task-table-item"><input type="checkbox" disabled class="task-list-item-checkbox" data-inapplicable="true"> <\/th>/);
      t.assert.match(html, /<th align="right" class="task-table-item"><input type="checkbox" disabled class="task-list-item-checkbox"> <\/th>/);
      t.assert.match(html, /<td align="center" class="task-table-item"><input type="checkbox" disabled class="task-list-item-checkbox" checked> <\/td>/);
      t.assert.match(html, /<td class="task-table-item"><input type="checkbox" disabled class="task-list-item-checkbox"> <\/td>/);
      t.assert.match(html, /<td align="right">Plain cell<\/td>/);
      t.assert.match(html, /<td align="center" class="task-table-item"><input type="checkbox" disabled class="task-list-item-checkbox" data-inapplicable="true"> <\/td>/);
      t.assert.match(html, /<td>Inapplicable row<\/td>/);
    });

    test('does not parse table cells with dashes or extra text as task items', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '| - [x] Done | - [~] Inapplicable | - [ ] Normal |\n'
        + '| --- | --- | --- |\n'
        + '| - [x] | [ ] Task with text | Plain cell |\n';
      const html = marked.parse(input) as string;

      t.assert.doesNotMatch(html, /task-table-item/);
      t.assert.doesNotMatch(html, /<input/);
      t.assert.match(html, /<th>- \[x\] Done<\/th>/);
      t.assert.match(html, /<td>- \[x\]<\/td>/);
      t.assert.match(html, /<td>\[ \] Task with text<\/td>/);
    });

    test('renders native GLFM table cell task lists without list markers', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '| Complete | Task |\n'
        + '| --- | --- |\n'
        + '|   [x]   | Refactor the backend |\n'
        + '|   [ ]   | Refactor the frontend |\n'
        + '|   [~]   | Inapplicable task |\n';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<td class="task-table-item"><input type="checkbox" disabled class="task-list-item-checkbox" checked> <\/td>\s*<td>Refactor the backend<\/td>/);
      t.assert.match(html, /<td class="task-table-item"><input type="checkbox" disabled class="task-list-item-checkbox"> <\/td>\s*<td>Refactor the frontend<\/td>/);
      t.assert.match(html, /<td class="task-table-item"><input type="checkbox" disabled class="task-list-item-checkbox" data-inapplicable="true"> <\/td>\s*<td>Inapplicable task<\/td>/);
    });

    test('taskLists can be disabled in options', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ taskLists: false }));
      const html = marked.parse('- [x] Task') as string;
      t.assert.match(html, /<input/);
    });

    test('taskTables can be disabled independently from taskLists', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ taskTables: false }));
      const listHtml = marked.parse('- [x] Task\n- [~] Inapplicable') as string;
      t.assert.match(listHtml, /task-list-item/);
      t.assert.match(listHtml, /data-inapplicable/);

      const tableHtml = marked.parse('| [x] |\n| --- |\n| [ ] |') as string;
      t.assert.doesNotMatch(tableHtml, /task-table-item/);
      t.assert.doesNotMatch(tableHtml, /<input/);
    });
  });

  describe('multimedia', () => {
    test('renders video players for valid video extensions', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '![Sample Video](img/video.mp4 "Video Title")';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<span class="media-container video-container"><video src="img\/video\.mp4" controls preload="metadata" class="gl-rounded-lg" data-setup="{}" data-title="Video Title" title="Video Title"><a href="img\/video\.mp4">Sample Video<\/a><\/video><\/span>/);
    });

    test('renders audio players for valid audio extensions', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '![Sample Audio](audio.mp3 "Audio Title")\n\n[Audio Without Title](audio.mp3)';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<span class="media-container audio-container"><audio src="audio\.mp3" controls data-setup="{}" data-title="Audio Title" title="Audio Title"><a href="audio\.mp3">Sample Audio<\/a><\/audio><\/span>/);
      t.assert.match(html, /<span class="media-container audio-container"><audio src="audio\.mp3" controls data-setup="{}" data-title="Audio Without Title"><a href="audio\.mp3">Audio Without Title<\/a><\/audio><\/span>/);
    });

    test('renders images with width and height dimensions', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '![GitLab Logo](img/logo.png "GitLab"){width=100 height=50px}\n\n![GitLab Logo](img/logo.png){width=75%}\n\n![GitLab Logo](img/logo.png){height=40px}';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<img src="img\/logo\.png" alt="GitLab Logo" title="GitLab" width="100" height="50">/);
      t.assert.match(html, /<img src="img\/logo\.png" alt="GitLab Logo" width="75%">/);
      t.assert.match(html, /<img src="img\/logo\.png" alt="GitLab Logo" height="40">/);
    });

    test('renders video players for valid video extensions without exclamation', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '[Sample Video](img/video.mp4)';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<span class="media-container video-container"><video src="img\/video\.mp4" controls preload="metadata" class="gl-rounded-lg" data-setup="{}" data-title="Sample Video"><a href="img\/video\.mp4">Sample Video<\/a><\/video><\/span>/);
    });

    test('renders .3gp video files', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const html = marked.parse('![3GP Video](clip.3gp)') as string;
      t.assert.match(html, /<span class="media-container video-container"><video src="clip\.3gp" controls preload="metadata" class="gl-rounded-lg" data-setup="{}" data-title="3GP Video"><a href="clip\.3gp">3GP Video<\/a><\/video><\/span>/);
    });

    test('standard images without dimensions or media extensions use standard img', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const html = marked.parse('![Standard](img/pic.png)') as string;
      t.assert.match(html, /<img src="img\/pic\.png" alt="Standard">/);
    });

    test('multimedia can be disabled in options', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ multimedia: false }));
      const html = marked.parse('![Sample Video](img/video.mp4)') as string;
      t.assert.doesNotMatch(html, /<video/);
    });
  });

  describe('diagrams, math, and JSON tables', () => {
    test('renders mermaid, plantuml, and kroki code blocks', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '```mermaid\ngraph TD\nA-->B\n```\n\n```plantuml\nBob -> Alice\n```\n\n```kroki\nblock\n```';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<pre class="mermaid"><code>graph TD\nA--&gt;B<\/code><\/pre>/);
      t.assert.match(html, /<pre class="plantuml"><code>Bob -&gt; Alice<\/code><\/pre>/);
      t.assert.match(html, /<pre class="kroki"><code>block<\/code><\/pre>/);
    });

    test('renders math code blocks and inline math', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '```math\na^2+b^2=c^2\n```\n\nInline: $`x+y=z`$ and $$a+b$$ and $c+d$';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<div class="gl-math-block" data-math-style="display">a\^2\+b\^2=c\^2<\/div>/);
      t.assert.match(html, /<span class="gl-math-inline" data-math-style="inline">x\+y=z<\/span>/);
      t.assert.match(html, /<span class="gl-math-inline" data-math-style="display">a\+b<\/span>/);
      t.assert.match(html, /<span class="gl-math-inline" data-math-style="inline">c\+d<\/span>/);
    });

    test('renders $$ display math blocks', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '$$\na^2+b^2=c^2\n$$\n\nand single line block:\n\n$$E = mc^2$$\n';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<div class="gl-math-block" data-math-style="display">a\^2\+b\^2=c\^2<\/div>/);
      t.assert.match(html, /<div class="gl-math-block" data-math-style="display">E = mc\^2<\/div>/);
    });

    test('renders LaTeX \\(...\\) inline math and \\[...\\] display math', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = 'Inline: \\(x^2\\) and $y^2$ and \\(z^2\\) and display:\n\n\\[E = mc^2\\]';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<span class="gl-math-inline" data-math-style="inline">x\^2<\/span>/);
      t.assert.match(html, /<span class="gl-math-inline" data-math-style="inline">y\^2<\/span>/);
      t.assert.match(html, /<span class="gl-math-inline" data-math-style="inline">z\^2<\/span>/);
      t.assert.match(html, /<div class="gl-math-block" data-math-style="display">E = mc\^2<\/div>/);
    });

    test('renders JSON tables with custom fields, caption, sortable, and markdown', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '```json:table\n{\n  "fields": [{"key": "a", "label": "AA", "sortable": true}, {"key": "no_label"}, "b"],\n  "items": [{"a": "**11**", "no_label": "NL", "b": "#123"}, {"a": "22"}],\n  "caption": "Custom Caption",\n  "markdown": true\n}\n```';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<table class="gl-table gl-json-table">/);
      t.assert.match(html, /<caption>Custom Caption<\/caption>/);
      t.assert.match(html, /<th>AA <span class="sortable">↕<\/span><\/th>/);
      t.assert.match(html, /<th>no_label<\/th>/);
      t.assert.match(html, /<th>b<\/th>/);
      t.assert.match(html, /<td><strong>11<\/strong><\/td>/);
    });

    test('renders JSON table with inferred fields', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '```json:table\n{\n  "items": [{"col1": "val1", "col2": "val2"}]\n}\n```';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<th>col1<\/th>/);
      t.assert.match(html, /<th>col2<\/th>/);
      t.assert.match(html, /<td>val1<\/td>/);
      t.assert.match(html, /<caption>Generated with JSON data<\/caption>/);
    });

    test('renders error for invalid JSON table', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '```json:table\n{ not valid json }\n```';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<div class="gl-json-table-error"><p>Invalid JSON table<\/p>/);
    });

    test('renders empty JSON table with default caption', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '```json:table\n{}\n```';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<caption>Generated with JSON data<\/caption>/);
    });

    test('standard code blocks without diagram/math/json are preserved', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '```javascript\nconsole.log(1);\n```\n\n```\nplain\n```';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<pre><code class="language-javascript">console\.log\(1\);\n<\/code><\/pre>/);
      t.assert.match(html, /<pre><code>plain\n<\/code><\/pre>/);
    });

    test('renders glql code blocks', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '```glql\nfields: title, state\nassignee = currentUser()\n```';
      const html = marked.parse(input) as string;

      t.assert.match(
        html,
        /<div class="glql-wrapper" data-glql><pre class="glql"><code>fields: title, state\nassignee = currentUser\(\)<\/code><\/pre><\/div>/,
      );
    });

    test('diagrams, math, jsonTables, glql can be disabled in options', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ diagrams: false, math: false, jsonTables: false, glql: false }));
      const input = '```mermaid\nA-->B\n```\n\n```math\n1+1\n```\n\n```json:table\n{}\n```\n\n```glql\nquery\n```';
      const html = marked.parse(input) as string;

      t.assert.doesNotMatch(html, /<pre class="mermaid">/);
      t.assert.doesNotMatch(html, /gl-math-block/);
      t.assert.doesNotMatch(html, /gl-json-table/);
      t.assert.doesNotMatch(html, /glql-wrapper/);
    });
  });

  describe('front matter, placeholders, and includes', () => {
    test('renders YAML front matter by default', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '---\ntitle: Hello\nexample: yaml\n---\n# Post Content';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<pre class="gl-front-matter" data-lang="yaml"><code>title: Hello\nexample: yaml<\/code><\/pre>/);
      t.assert.match(html, /<h1 id="post-content">Post Content<a href="#post-content" aria-label="Link to heading 'Post Content'" data-heading-content="Post Content" class="anchor"><\/a><\/h1>/);
    });

    test('renders TOML, JSON, and custom lang front matter', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const tomlInput = '+++\ntitle = "TOML"\n+++\nContent';
      const jsonInput = ';;;\n{"title": "JSON"}\n;;;\nContent';
      const phpInput = '---php\n$title = "PHP";\n---\nContent';

      t.assert.match(marked.parse(tomlInput) as string, /data-lang="toml"/);
      t.assert.match(marked.parse(jsonInput) as string, /data-lang="json"/);
      t.assert.match(marked.parse(phpInput) as string, /data-lang="php"/);
    });

    test('strips front matter when frontMatter: false', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ frontMatter: false }));
      const input = '---\ntitle: Strip Me\n---\n# Header';
      const html = marked.parse(input) as string;

      t.assert.doesNotMatch(html, /gl-front-matter/);
      t.assert.doesNotMatch(html, /Strip Me/);
      t.assert.match(html, /<h1 id="header">Header<a href="#header" aria-label="Link to heading 'Header'" data-heading-content="Header" class="anchor"><\/a><\/h1>/);
    });

    test('replaces placeholders with configured values', (t) => {
      const marked = new Marked();
      marked.use(
        markedGitlab({
          placeholders: {
            project_name: 'marked-gitlab',
            gitlab_server: 'gitlab.com',
          },
        }),
      );
      const input = 'Welcome to %{project_name} on %{gitlab_server} (%{unknown_key})';
      const html = marked.parse(input) as string;

      t.assert.match(html, /Welcome to marked-gitlab on gitlab\.com \(%\{unknown_key\}\)/);
    });

    test('placeholders can be disabled in options', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ placeholders: false as unknown as Record<string, string> }));
      const input = 'Hello %{name}';
      const html = marked.parse(input) as string;

      t.assert.match(html, /Hello %\{name\}/);
    });

    test('replaces ::include directive with includeHandler result', (t) => {
      const marked = new Marked();
      marked.use(
        markedGitlab({
          includeHandler: (file) => (file === 'part.md' ? '### Included Title\n' : undefined),
        }),
      );
      const input = 'Before\n::include{file=part.md}\n::include{file=missing.md}\nAfter';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<h3 id="included-title">Included Title<a href="#included-title" aria-label="Link to heading 'Included Title'" data-heading-content="Included Title" class="anchor"><\/a><\/h3>/);
      t.assert.match(html, /::include\{file=missing\.md\}/);
    });
  });

  describe('GitLab references', () => {
    test('parses mentions, issues, MRs, snippets, epics', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ project: 'gitlab-org/gitlab' }));
      const input = 'Mention @user and @group/subgroup and @all. See #123, !456, $789, and &999.';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/user" class="gfm gfm-project_member" data-reference-type="user" data-original="@user" data-link="false">@user<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/group\/subgroup" class="gfm gfm-project_member" data-reference-type="user" data-original="@group\/subgroup" data-link="false">@group\/subgroup<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/issues\/123" class="gfm gfm-issue" data-reference-type="issue" data-original="#123" data-link="false">#123<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/merge_requests\/456" class="gfm gfm-merge_request" data-reference-type="merge_request" data-original="!456" data-link="false">!456<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/snippets\/789" class="gfm gfm-snippet" data-reference-type="snippet" data-original="\$789" data-link="false">\$789<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/epics\/999" class="gfm gfm-epic" data-reference-type="epic" data-original="&amp;999" data-link="false">&amp;999<\/a>/);
    });

    test('parses cross-project references and title suffixes (+ and +s)', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ project: 'default/proj' }));
      const input = 'See other/proj#42 and #100+ and !200+s.';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/other\/proj\/-\/issues\/42" class="gfm gfm-issue" data-reference-type="issue" data-original="other\/proj#42" data-link="false">other\/proj#42<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/default\/proj\/-\/issues\/100" class="gfm gfm-issue" data-reference-type="issue" data-original="#100\+" data-link="false" title="Show issue title">#100\+<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/default\/proj\/-\/merge_requests\/200" class="gfm gfm-merge_request" data-reference-type="merge_request" data-original="!200\+s" data-link="false" title="Show merge_request summary">!200\+s<\/a>/);
    });

    test('parses labels, milestones, iterations, alerts, contacts, wikis', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ project: 'my/proj' }));
      const input = 'Label ~bug and ~"feature request" and milestone %v1.0 and %"release 2".\n'
        + 'Iteration *iteration:"Sprint 1". Alert ^alert#123. Contact [contact:test@example.com].\n'
        + 'Wiki [[Home]] and [[User Guide|user-guide]].';
      const html = marked.parse(input) as string;

      t.assert.match(html, /class="gfm gfm-label" data-reference-type="label" data-original="~bug" data-link="false">~bug<\/a>/);
      t.assert.match(html, /class="gfm gfm-label" data-reference-type="label" data-original="~&quot;feature request&quot;" data-link="false">~&quot;feature request&quot;<\/a>/);
      t.assert.match(html, /class="gfm gfm-milestone" data-reference-type="milestone" data-original="%v1\.0" data-link="false" title="v1\.0">%v1\.0<\/a>/);
      t.assert.match(html, /class="gfm gfm-milestone" data-reference-type="milestone" data-original="%&quot;release 2&quot;" data-link="false" title="release 2">%(&quot;|")release 2(&quot;|")<\/a>/);
      t.assert.match(html, /class="gfm gfm-iteration" data-reference-type="iteration" data-original="\*iteration:&quot;Sprint 1&quot;" data-link="false" title="Sprint 1">\*iteration:&quot;Sprint 1&quot;<\/a>/);
      t.assert.match(html, /class="gfm gfm-alert" data-reference-type="alert" data-original="\^alert#123" data-link="false">\^alert#123<\/a>/);
      t.assert.match(html, /<a href="mailto:test@example\.com" class="gfm gfm-contact" data-reference-type="contact" data-original="\[contact:test@example\.com\]" data-link="false">\[contact:test@example\.com\]<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/my\/proj\/-\/wikis\/Home" class="gfm gfm-wiki_page" data-reference-type="wiki_page" data-original="\[\[Home\]\]" data-link="false">Home<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/my\/proj\/-\/wikis\/user-guide" class="gfm gfm-wiki_page" data-reference-type="wiki_page" data-original="\[\[User Guide\|user-guide\]\]" data-link="false">User Guide<\/a>/);
    });

    test('parses bracket references and commits', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ project: 'my/proj' }));
      const input = '[issue:123] [work_item:456] [epic:789] [cadence:1] [vulnerability:10] [feature_flag:20] [wiki_page:Help].\n'
        + 'Commit other@9ba12248 and range 9ba12248...b19a04f5.';
      const html = marked.parse(input) as string;

      t.assert.match(html, /class="gfm gfm-issue" data-reference-type="issue" data-original="\[issue:123\]" data-link="false">\[issue:123\]<\/a>/);
      t.assert.match(html, /class="gfm gfm-work_item" data-reference-type="work_item" data-original="\[work_item:456\]" data-link="false">\[work_item:456\]<\/a>/);
      t.assert.match(html, /class="gfm gfm-epic" data-reference-type="epic" data-original="\[epic:789\]" data-link="false">\[epic:789\]<\/a>/);
      t.assert.match(html, /class="gfm gfm-cadence" data-reference-type="cadence" data-original="\[cadence:1\]" data-link="false">\[cadence:1\]<\/a>/);
      t.assert.match(html, /class="gfm gfm-vulnerability" data-reference-type="vulnerability" data-original="\[vulnerability:10\]" data-link="false">\[vulnerability:10\]<\/a>/);
      t.assert.match(html, /class="gfm gfm-feature_flag" data-reference-type="feature_flag" data-original="\[feature_flag:20\]" data-link="false">\[feature_flag:20\]<\/a>/);
      t.assert.match(html, /class="gfm gfm-wiki_page" data-reference-type="wiki_page" data-original="\[wiki_page:Help\]" data-link="false">\[wiki_page:Help\]<\/a>/);
      t.assert.match(html, /class="gfm gfm-commit" data-reference-type="commit" data-original="other@9ba12248" data-link="false">other@9ba12248<\/a>/);
      t.assert.match(html, /class="gfm gfm-commit_range" data-reference-type="commit_range" data-original="9ba12248\.\.\.b19a04f5" data-link="false">9ba12248\.\.\.b19a04f5<\/a>/);
    });

    test('parses project references, issue keys, cadence titles, and GitLab URLs', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ project: 'my/proj' }));
      const input = 'Project gitlab-org/gitlab> and issue key GL-123 and PROJ-456+ and JIRA-789+s.\n'
        + 'Cadence [cadence:"Sprint Cadence"] and [cadence:plan].\n'
        + 'Issue comment https://gitlab.com/gitlab-org/gitlab/-/issues/1234#note_101075757 and MR comment https://gitlab.com/gitlab-org/gitlab/-/merge_requests/567#note_999.\n'
        + 'Epic comment https://gitlab.com/groups/gitlab-org/-/epics/888#note_777.\n'
        + 'Designs https://gitlab.com/gitlab-org/gitlab/-/issues/1234/designs and design file https://gitlab.com/gitlab-org/gitlab/-/issues/1234/designs/layout.png.\n'
        + 'Wiki URL https://gitlab.com/gitlab-org/gitlab/-/wikis/Home-page-new-slug.';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab" class="gfm gfm-project" data-reference-type="project" data-original="gitlab-org\/gitlab&gt;" data-link="false">gitlab-org\/gitlab<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/my\/proj\/-\/issues\/GL-123" class="gfm gfm-issue" data-reference-type="issue" data-original="GL-123" data-link="false">GL-123<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/my\/proj\/-\/issues\/PROJ-456" class="gfm gfm-issue" data-reference-type="issue" data-original="PROJ-456\+" data-link="false" title="Show issue title">PROJ-456\+<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/my\/proj\/-\/issues\/JIRA-789" class="gfm gfm-issue" data-reference-type="issue" data-original="JIRA-789\+s" data-link="false" title="Show issue summary">JIRA-789\+s<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/my\/proj\/-\/cadences\?title=Sprint%20Cadence" class="gfm gfm-cadence" data-reference-type="cadence" data-original="\[cadence:&quot;Sprint Cadence&quot;\]" data-link="false">\[cadence:&quot;Sprint Cadence&quot;\]<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/my\/proj\/-\/cadences\?title=plan" class="gfm gfm-cadence" data-reference-type="cadence" data-original="\[cadence:plan\]" data-link="false">\[cadence:plan\]<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/issues\/1234#note_101075757" class="gfm gfm-issue" data-reference-type="issue" data-original="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/issues\/1234#note_101075757" data-link="true">#1234 \(comment 101075757\)<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/merge_requests\/567#note_999" class="gfm gfm-merge_request" data-reference-type="merge_request" data-original="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/merge_requests\/567#note_999" data-link="true">!567 \(comment 999\)<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/groups\/gitlab-org\/-\/epics\/888#note_777" class="gfm gfm-epic" data-reference-type="epic" data-original="https:\/\/gitlab\.com\/groups\/gitlab-org\/-\/epics\/888#note_777" data-link="true">&amp;888 \(comment 777\)<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/issues\/1234\/designs" class="gfm gfm-issue" data-reference-type="issue" data-original="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/issues\/1234\/designs" data-link="true">#1234 \(designs\)<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/issues\/1234\/designs\/layout\.png" class="gfm gfm-issue" data-reference-type="issue" data-original="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/issues\/1234\/designs\/layout\.png" data-link="true">#1234\[layout\.png\]<\/a>\./);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/wikis\/Home-page-new-slug" class="gfm gfm-wiki_page" data-reference-type="wiki_page" data-original="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/wikis\/Home-page-new-slug" data-link="true">Home page new slug<\/a>\./);
    });

    test('escaped references are not linked and backslash is removed', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '\\#123 and \\@user and \\!456 and \\~bug and \\%v1.0 and \\$789 and \\&999 and \\^alert#1 and \\GL-123 and \\gitlab-org/gitlab>';
      const html = marked.parse(input) as string;

      t.assert.match(html, /#123 and @user and !456 and ~bug and %v1\.0 and \$789 and &amp;999 and \^alert#1 and GL-123 and gitlab-org\/gitlab(&gt;|>)/);
      t.assert.doesNotMatch(html, /class="gfm /);
    });

    test('references can be disabled in options', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ references: false }));
      const html = marked.parse('#123 and @user') as string;

      t.assert.doesNotMatch(html, /class="gfm /);
    });

    test('parseGitlabReference returns null for non-references', (t) => {
      t.assert.equal(parseGitlabReference('plain text'), null);
      t.assert.equal(parseGitlabReference('\\#123'), null);
      t.assert.equal(parseGitlabReference('https://gitlab.com/gitlab-org/gitlab/-/issues'), null);
      t.assert.equal(parseGitlabReference('https://gitlab.com/gitlab-org/gitlab/-/wikis'), null);
      t.assert.equal(parseGitlabReference('https://example.com/not-gitlab'), null);
    });

    test('auto-links base GitLab entity URLs with and without default project', (t) => {
      const markedSame = new Marked();
      markedSame.use(markedGitlab({ project: 'gitlab-org/gitlab' }));
      const inputSame = 'Issue https://gitlab.com/gitlab-org/gitlab/-/issues/1234 and MR https://gitlab.com/gitlab-org/gitlab/-/merge_requests/567 and epic https://gitlab.com/groups/gitlab-org/-/epics/888.\n'
        + 'Extended: https://gitlab.com/gitlab-org/gitlab/-/issues/1234+ and https://gitlab.com/gitlab-org/gitlab/-/issues/1234+s\n'
        + 'Other: https://gitlab.com/other-org/other-proj/-/issues/999';
      const htmlSame = markedSame.parse(inputSame) as string;

      t.assert.match(htmlSame, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/issues\/1234" class="gfm gfm-issue" data-reference-type="issue" data-original="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/issues\/1234" data-link="true">#1234<\/a>/);
      t.assert.match(htmlSame, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/merge_requests\/567" class="gfm gfm-merge_request" data-reference-type="merge_request" data-original="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/merge_requests\/567" data-link="true">!567<\/a>/);
      t.assert.match(htmlSame, /<a href="https:\/\/gitlab\.com\/groups\/gitlab-org\/-\/epics\/888" class="gfm gfm-epic" data-reference-type="epic" data-original="https:\/\/gitlab\.com\/groups\/gitlab-org\/-\/epics\/888" data-link="true">&amp;888<\/a>/);
      t.assert.match(htmlSame, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/issues\/1234\+" class="gfm gfm-issue" data-reference-type="issue" data-original="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/issues\/1234\+" data-link="true" title="Show issue title">#1234\+<\/a>/);
      t.assert.match(htmlSame, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/issues\/1234\+s" class="gfm gfm-issue" data-reference-type="issue" data-original="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/issues\/1234\+s" data-link="true" title="Show issue summary">#1234\+s<\/a>/);
      t.assert.match(htmlSame, /<a href="https:\/\/gitlab\.com\/other-org\/other-proj\/-\/issues\/999" class="gfm gfm-issue" data-reference-type="issue" data-original="https:\/\/gitlab\.com\/other-org\/other-proj\/-\/issues\/999" data-link="true">other-org\/other-proj#999<\/a>/);

      const markedNone = new Marked();
      markedNone.use(markedGitlab());
      const htmlNone = markedNone.parse('https://gitlab.com/gitlab-org/gitlab/-/issues/1234') as string;
      t.assert.match(htmlNone, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/issues\/1234" class="gfm gfm-issue" data-reference-type="issue" data-original="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/issues\/1234" data-link="true">gitlab-org\/gitlab#1234<\/a>/);
    });

    test('supports cross-project wiki page references and wiki fragment anchors', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ project: 'my/proj' }));
      const input = '[wiki_page:gitlab-org/gitlab:Home] and [wiki_page:group1/subgroup:Guide#intro] and [[Wiki#section]] and [[Custom Title|Page#anchor]].';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/wikis\/Home" class="gfm gfm-wiki_page" data-reference-type="wiki_page" data-original="\[wiki_page:gitlab-org\/gitlab:Home\]" data-link="false">\[wiki_page:gitlab-org\/gitlab:Home\]<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/group1\/subgroup\/-\/wikis\/Guide#intro" class="gfm gfm-wiki_page" data-reference-type="wiki_page" data-original="\[wiki_page:group1\/subgroup:Guide#intro\]" data-link="false">\[wiki_page:group1\/subgroup:Guide#intro\]<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/my\/proj\/-\/wikis\/Wiki#section" class="gfm gfm-wiki_page" data-reference-type="wiki_page" data-original="\[\[Wiki#section\]\]" data-link="false">Wiki#section<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/my\/proj\/-\/wikis\/Page#anchor" class="gfm gfm-wiki_page" data-reference-type="wiki_page" data-original="\[\[Custom Title\|Page#anchor\]\]" data-link="false">Custom Title<\/a>/);
    });

    test('supports leading slash on project prefixes for labels and milestones', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '/gitlab-org/gitlab~bug and /gitlab-org/gitlab~"feature request" and /gitlab-org/gitlab%16.0 and \\/gitlab-org/gitlab~escaped';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/issues\?label_name=bug" class="gfm gfm-label" data-reference-type="label" data-original="\/gitlab-org\/gitlab~bug" data-link="false">\/gitlab-org\/gitlab~bug<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/issues\?label_name=feature%20request" class="gfm gfm-label" data-reference-type="label" data-original="\/gitlab-org\/gitlab~&quot;feature request&quot;" data-link="false">\/gitlab-org\/gitlab~&quot;feature request&quot;<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/milestones" class="gfm gfm-milestone" data-reference-type="milestone" data-original="\/gitlab-org\/gitlab%16\.0" data-link="false" title="16\.0">\/gitlab-org\/gitlab%16\.0<\/a>/);
      t.assert.match(html, /\/gitlab-org\/gitlab~escaped/);
      t.assert.doesNotMatch(html, /label_name=escaped/);
    });

    test('parses cross-project references and standalone commit SHAs', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ project: 'my/proj' }));
      const input = 'Bracket: [issue:gitlab-org/gitlab/999].\n'
        + 'Commit 0123456789abcdef0123456789abcdef01234567 and range group/repo@9ba12248...b19a04f5.\n'
        + 'Cross-proj alert other/group^alert#42, label other/group~bug, milestone other/group%1.0.\n'
        + 'Wiki [[WikiNoSlug]].';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/gitlab-org\/gitlab\/-\/issues\/999" class="gfm gfm-issue" data-reference-type="issue" data-original="\[issue:gitlab-org\/gitlab\/999\]" data-link="false">\[issue:gitlab-org\/gitlab\/999\]<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/my\/proj\/-\/commit\/0123456789abcdef0123456789abcdef01234567" class="gfm gfm-commit" data-reference-type="commit" data-original="0123456789abcdef0123456789abcdef01234567" data-link="false">0123456789abcdef0123456789abcdef01234567<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/group\/repo\/-\/compare\/9ba12248\.\.\.b19a04f5" class="gfm gfm-commit_range" data-reference-type="commit_range" data-original="group\/repo@9ba12248\.\.\.b19a04f5" data-link="false">group\/repo@9ba12248\.\.\.b19a04f5<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/other\/group\/-\/alert_management\/42" class="gfm gfm-alert" data-reference-type="alert" data-original="other\/group\^alert#42" data-link="false">other\/group\^alert#42<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/other\/group\/-\/issues\?label_name=bug" class="gfm gfm-label" data-reference-type="label" data-original="other\/group~bug" data-link="false">other\/group~bug<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/other\/group\/-\/milestones" class="gfm gfm-milestone" data-reference-type="milestone" data-original="other\/group%1\.0" data-link="false" title="1\.0">other\/group%1\.0<\/a>/);
      t.assert.match(html, /<a href="https:\/\/gitlab\.com\/my\/proj\/-\/wikis\/WikiNoSlug" class="gfm gfm-wiki_page" data-reference-type="wiki_page" data-original="\[\[WikiNoSlug\]\]" data-link="false">WikiNoSlug<\/a>/);
    });

    test('parseGitlabReference handles custom base URLs and defaults', (t) => {
      const refDefault = parseGitlabReference('#123');
      t.assert.equal(refDefault?.href, 'https://gitlab.com/-/issues/123');

      const refCustom = parseGitlabReference('#123', 'https://custom-gitlab.com/', '/org/proj/');
      t.assert.equal(refCustom?.href, 'https://custom-gitlab.com/org/proj/-/issues/123');
    });
  });

  describe('emojis', () => {
    test('replaces standard emoji shortcodes with gl-emoji tag', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = 'Thumbs up :thumbsup: and a heart :heart:!';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<gl-emoji data-name="thumbsup" data-unicode-version="6\.0" title="thumbs up">👍<\/gl-emoji>/);
      t.assert.match(html, /<gl-emoji data-name="heart" title="red heart">❤️<\/gl-emoji>/);
    });

    test('supports custom emoji mapping in options', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ emojis: { custom_fox: '🦊' } }));
      const input = 'Custom :custom_fox: and fallback :thumbsup:';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<gl-emoji data-name="custom_fox" title=":custom_fox:">🦊<\/gl-emoji>/);
      t.assert.match(html, /<gl-emoji data-name="thumbsup" data-unicode-version="6\.0" title="thumbs up">👍<\/gl-emoji>/);
    });

    test('unknown emoji code is left unchanged', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const html = marked.parse(':not_real_emoji_xyz:') as string;

      t.assert.match(html, /:not_real_emoji_xyz:/);
      t.assert.doesNotMatch(html, /<gl-emoji/);
    });

    test('emojis can be disabled in options', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ emojis: false }));
      const html = marked.parse(':thumbsup:') as string;

      t.assert.doesNotMatch(html, /<gl-emoji/);
    });

    test('renderEmoji returns false for missing emoji', (t) => {
      t.assert.equal(renderEmoji('nonexistent_emoji_abc'), false);
    });

    test('full gemoji dataset is available and has >1800 entries', (t) => {
      t.assert.ok(Object.keys(EMOJI_DATA).length > 1800, 'EMOJI_DATA should have >1800 entries');
      t.assert.ok(EMOJI_DATA.wave, ':wave: should exist');
      t.assert.ok(EMOJI_DATA['100'], ':100: should exist');
      t.assert.ok(EMOJI_DATA.thinking, ':thinking: should exist');
    });

    test('renders previously-missing emojis from full dataset', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = ':wave: :100: :thinking:';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<gl-emoji data-name="wave" data-unicode-version/);
      t.assert.match(html, /<gl-emoji data-name="100" data-unicode-version/);
      t.assert.match(html, /<gl-emoji data-name="thinking" data-unicode-version/);
    });
  });

  describe('footnotes', () => {
    test('renders footnote references and definitions', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = 'Something important.[^1]\n\n[^1]: This is the footnote content.';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<sup class="footnote-ref"><a href="#fn-1" id="fnref-1" data-footnote-ref>1<\/a><\/sup>/);
      t.assert.match(html, /<section class="footnotes" data-footnotes>/);
      t.assert.match(html, /<li id="fn-1">/);
      t.assert.match(html, /This is the footnote content\./);
      t.assert.match(html, /<a href="#fnref-1" class="footnote-backref" data-footnote-backref aria-label="Back to reference 1">↩<\/a>/);
    });

    test('renders multiple footnotes', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = 'First[^1] and second[^2].\n\n[^1]: Footnote one.\n\n[^2]: Footnote two.';
      const html = marked.parse(input) as string;

      t.assert.match(html, /id="fnref-1"/);
      t.assert.match(html, /id="fnref-2"/);
      t.assert.match(html, /id="fn-1"/);
      t.assert.match(html, /id="fn-2"/);
      t.assert.match(html, /Footnote one\./);
      t.assert.match(html, /Footnote two\./);
    });

    test('renders footnotes with named identifiers renumbered sequentially', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = 'See note[^note].\n\n[^note]: A named footnote.';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<a href="#fn-note" id="fnref-note" data-footnote-ref>1<\/a>/);
      t.assert.match(html, /<li id="fn-note">/);
      t.assert.match(html, /A named footnote\./);
    });

    test('renumbers and orders footnotes sequentially by appearance order', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = 'Alpha[^beta] and omega[^alpha].\n\n[^alpha]: Definition Alpha.\n\n[^beta]: Definition Beta.';
      const html = marked.parse(input) as string;

      // In text, [^beta] appears first -> numbered 1, [^alpha] appears second -> numbered 2
      t.assert.match(html, /<sup class="footnote-ref"><a href="#fn-beta" id="fnref-beta" data-footnote-ref>1<\/a><\/sup>/);
      t.assert.match(html, /<sup class="footnote-ref"><a href="#fn-alpha" id="fnref-alpha" data-footnote-ref>2<\/a><\/sup>/);

      // Section order should match appearance order (beta first, alpha second)
      const betaIdx = html.indexOf('<li id="fn-beta">');
      const alphaIdx = html.indexOf('<li id="fn-alpha">');
      t.assert.ok(betaIdx !== -1 && alphaIdx !== -1, 'Both definitions should be present');
      t.assert.ok(betaIdx < alphaIdx, 'Footnote section should order definitions by appearance order');
    });

    test('handles unreferenced footnote definitions', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const input = '[^unref1]: Unreferenced one.\n\nOnly one ref[^first].\n\n[^first]: First def.\n\n[^unref2]: Unreferenced two.';
      const html = marked.parse(input) as string;

      t.assert.match(html, /<li id="fn-first">/);
      t.assert.match(html, /<li id="fn-unref1">/);
      t.assert.match(html, /<li id="fn-unref2">/);
      const firstIdx = html.indexOf('<li id="fn-first">');
      const unref1Idx = html.indexOf('<li id="fn-unref1">');
      const unref2Idx = html.indexOf('<li id="fn-unref2">');
      t.assert.ok(firstIdx < unref1Idx, 'Referenced footnotes should sort before unreferenced ones');
      t.assert.ok(firstIdx < unref2Idx, 'Referenced footnotes should sort before unreferenced ones');
    });

    test('footnotes can be disabled in options', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab({ footnotes: false }));
      const input = 'Text[^1].\n\n[^1]: Footnote.';
      const html = marked.parse(input) as string;

      t.assert.doesNotMatch(html, /<section class="footnotes"/);
      t.assert.doesNotMatch(html, /footnote-ref/);
    });

    test('no footnote section when there are no definitions', (t) => {
      const marked = new Marked();
      marked.use(markedGitlab());
      const html = marked.parse('Just normal text, no footnotes.') as string;

      t.assert.doesNotMatch(html, /<section class="footnotes"/);
    });
  });
});
