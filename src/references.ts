export interface ReferenceMatch {
  raw: string;
  type: string;
  href: string;
  text: string;
  className: string;
  title?: string;
}

export function parseGitlabReference(
  src: string,
  baseUrl = 'https://gitlab.com',
  defaultProject = '',
): ReferenceMatch | null {
  // Escaped references: e.g. \#123, \@user, \!123, \~label, \%milestone, \&123, \$123, \^alert#123
  if (/^\\([@#!~$%&^]|\[(?:issue|epic|work_item|cadence|vulnerability|feature_flag|contact|wiki_page):)/i.test(src)) {
    return null;
  }

  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const cleanProject = defaultProject.replace(/^\/+|\/+$/g, '');
  const projectBase = cleanProject ? `${cleanBaseUrl}/${cleanProject}` : cleanBaseUrl;

  // Bracket references: [issue:...], [work_item:...], [epic:...], [cadence:...], [vulnerability:...], [feature_flag:...], [contact:...], [wiki_page:...]
  const bracketMatch = src.match(
    /^\[(issue|work_item|epic|cadence|vulnerability|feature_flag|contact|wiki_page):([^\]]+)\]/,
  );
  if (bracketMatch) {
    const [, kind, target] = bracketMatch;
    let href = '';
    const className = `gfm gfm-${kind}`;
    if (kind === 'contact') {
      href = `mailto:${target}`;
    } else if (kind === 'wiki_page') {
      href = `${projectBase}/-/wikis/${target}`;
    } else {
      const parts = target.split('/');
      const id = parts.pop()!;
      const proj = parts.length > 0 ? `${cleanBaseUrl}/${parts.join('/')}` : projectBase;
      const resourceMap: Record<string, string> = {
        issue: 'issues',
        work_item: 'work_items',
        epic: 'epics',
        cadence: 'cadences',
        vulnerability: 'security/vulnerabilities',
        feature_flag: 'feature_flags',
      };
      href = `${proj}/-/${resourceMap[kind]}/${id}`;
    }
    return {
      raw: bracketMatch[0],
      type: kind,
      href,
      text: bracketMatch[0],
      className,
    };
  }

  // Wiki page: [[Page]] or [[Title|slug]]
  const wikiMatch = src.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
  if (wikiMatch) {
    const title = wikiMatch[1];
    const slug = wikiMatch[2] ?? title;
    return {
      raw: wikiMatch[0],
      type: 'wiki_page',
      href: `${projectBase}/-/wikis/${encodeURIComponent(slug)}`,
      text: title,
      className: 'gfm gfm-wiki_page',
    };
  }

  // Iteration: *iteration:"title"
  const iterationMatch = src.match(/^\*iteration:"([^"]+)"/);
  if (iterationMatch) {
    return {
      raw: iterationMatch[0],
      type: 'iteration',
      href: `${projectBase}/-/iterations`,
      text: iterationMatch[0],
      className: 'gfm gfm-iteration',
      title: iterationMatch[1],
    };
  }

  // Alert: ^alert#123 or project^alert#123
  const alertRefMatch = src.match(/^((?:[a-zA-Z0-9_\-.]+\/)?[a-zA-Z0-9_\-.]+)?\^alert#(\d+)/);
  if (alertRefMatch) {
    const proj = alertRefMatch[1] ? `${cleanBaseUrl}/${alertRefMatch[1]}` : projectBase;
    return {
      raw: alertRefMatch[0],
      type: 'alert',
      href: `${proj}/-/alert_management/${alertRefMatch[2]}`,
      text: alertRefMatch[0],
      className: 'gfm gfm-alert',
    };
  }

  // Commit comparison: sha...sha or proj@sha...sha
  const commitRangeMatch = src.match(/^((?:[a-zA-Z0-9_\-.]+\/)?[a-zA-Z0-9_\-.]+@)?([0-9a-f]{8,40})\.\.\.([0-9a-f]{8,40})/i);
  if (commitRangeMatch) {
    const proj = commitRangeMatch[1] ? `${cleanBaseUrl}/${commitRangeMatch[1].slice(0, -1)}` : projectBase;
    return {
      raw: commitRangeMatch[0],
      type: 'commit_range',
      href: `${proj}/-/compare/${commitRangeMatch[2]}...${commitRangeMatch[3]}`,
      text: commitRangeMatch[0],
      className: 'gfm gfm-commit_range',
    };
  }

  // Commit SHA: proj@sha or standalone sha (40 hex chars)
  const commitMatch = src.match(/^((?:[a-zA-Z0-9_\-.]+\/)?[a-zA-Z0-9_\-.]+@)?([0-9a-f]{8,40})(?![0-9a-fA-F])/i);
  if (commitMatch && (commitMatch[1] || commitMatch[2].length === 40)) {
    const proj = commitMatch[1] ? `${cleanBaseUrl}/${commitMatch[1].slice(0, -1)}` : projectBase;
    return {
      raw: commitMatch[0],
      type: 'commit',
      href: `${proj}/-/commit/${commitMatch[2]}`,
      text: commitMatch[0],
      className: 'gfm gfm-commit',
    };
  }

  // User / group mention: @user, @group/subgroup, @all
  const mentionMatch = src.match(/^@([a-zA-Z0-9_\-./]+)/);
  if (mentionMatch) {
    const target = mentionMatch[1];
    return {
      raw: mentionMatch[0],
      type: 'user',
      href: `${cleanBaseUrl}/${target}`,
      text: mentionMatch[0],
      className: 'gfm gfm-project_member',
    };
  }

  // Issue / Merge request / Snippet / Epic: (#|!|$|&)(\d+)(\+s|\+)?
  const itemMatch = src.match(/^((?:[a-zA-Z0-9_\-.]+\/)?[a-zA-Z0-9_\-.]+)?([#!$&])(\d+)(\+s|\+)?/);
  if (itemMatch) {
    const [, projPrefix, sigil, id, suffix] = itemMatch;
    const proj = projPrefix ? `${cleanBaseUrl}/${projPrefix}` : projectBase;
    const typeMap: Record<string, { kind: string; path: string }> = {
      '#': { kind: 'issue', path: 'issues' },
      '!': { kind: 'merge_request', path: 'merge_requests' },
      $: { kind: 'snippet', path: 'snippets' },
      '&': { kind: 'epic', path: 'epics' },
    };
    const info = typeMap[sigil]!;
    return {
      raw: itemMatch[0],
      type: info.kind,
      href: `${proj}/-/${info.path}/${id}`,
      text: itemMatch[0],
      className: `gfm gfm-${info.kind}`,
      title: suffix ? `Show ${info.kind} ${suffix === '+s' ? 'summary' : 'title'}` : undefined,
    };
  }

  // Label: ~123, ~bug, ~"feature request", ~"scoped::label", proj~label
  const labelMatch = src.match(/^((?:[a-zA-Z0-9_\-.]+\/)?[a-zA-Z0-9_\-.]+)?~("([^"]+)"|[a-zA-Z0-9_\-.:]+)/);
  if (labelMatch) {
    const [, projPrefix, , labelName] = labelMatch;
    const name = labelName ?? labelMatch[2];
    const proj = projPrefix ? `${cleanBaseUrl}/${projPrefix}` : projectBase;
    return {
      raw: labelMatch[0],
      type: 'label',
      href: `${proj}/-/issues?label_name=${encodeURIComponent(name)}`,
      text: labelMatch[0],
      className: 'gfm gfm-label',
    };
  }

  // Milestone: %123, %v1.23, %"milestone name", proj%123
  const milestoneMatch = src.match(/^((?:[a-zA-Z0-9_\-.]+\/)?[a-zA-Z0-9_\-.]+)?%("([^"]+)"|[a-zA-Z0-9_\-]+(?:\.[a-zA-Z0-9_\-]+)*)/);
  if (milestoneMatch) {
    const [, projPrefix, , msName] = milestoneMatch;
    const name = msName ?? milestoneMatch[2];
    const proj = projPrefix ? `${cleanBaseUrl}/${projPrefix}` : projectBase;
    return {
      raw: milestoneMatch[0],
      type: 'milestone',
      href: `${proj}/-/milestones`,
      text: milestoneMatch[0],
      className: 'gfm gfm-milestone',
      title: name,
    };
  }

  return null;
}
