import { Marked } from 'marked';
import markedGitlab, {
  type MarkedGitlabOptions,
  generateGitlabSlug,
  renderColorCode,
  parseGitlabReference,
  renderEmoji,
  DEFAULT_EMOJIS,
} from 'marked-gitlab';

const marked = new Marked();

const options: MarkedGitlabOptions = {
  baseUrl: 'https://gitlab.com',
  project: 'group/project',
  alerts: true,
  multilineBlockquotes: true,
  colorChips: true,
  descriptionLists: true,
  inlineDiffs: true,
  tableOfContents: true,
  headingAnchors: true,
  taskLists: true,
  references: true,
  multimedia: true,
  diagrams: true,
  math: true,
  jsonTables: true,
  frontMatter: true,
  footnotes: true,
  placeholders: {
    project_name: 'marked-gitlab',
  },
  emojis: true,
  includeHandler: (file: string) => `content of ${file}`,
};

marked.use(markedGitlab(options));

const html: string = marked.parse('# Hello GLFM', { async: false });
console.log(html);

const slug: string = generateGitlabSlug('Hello World', new Map<string, number>());
console.log(slug);

const colorHtml = renderColorCode('#FF0000');
console.log(colorHtml);

const ref = parseGitlabReference('#123');
console.log(ref);

const emojiHtml = renderEmoji('thumbsup', DEFAULT_EMOJIS);
console.log(emojiHtml);
