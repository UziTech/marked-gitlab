/**
 * Generates an anchor slug for a heading following GitLab Flavored Markdown rules:
 * 1. Convert all text to lowercase.
 * 2. Remove all characters except letters, numbers, hyphens, underscores, and spaces.
 * 3. Convert all spaces to hyphens.
 * 4. Deduplicate by appending -1, -2, etc. if identical slug has already occurred.
 */
export function generateGitlabSlug(text: string, slugCounts: Map<string, number>): string {
  const base = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\-_ ]/gu, '')
    .replace(/ /g, '-');

  const count = slugCounts.get(base) ?? 0;
  slugCounts.set(base, count + 1);

  if (count > 0) {
    return `${base}-${count}`;
  }
  return base;
}
