import { EMOJI_DATA } from './emoji-data.ts';
import type { EmojiEntry } from './emoji-data.ts';

export { EMOJI_DATA };
export type { EmojiEntry };

/**
 * Backward-compatible map of emoji name → emoji character.
 * Derived from the full gemoji dataset.
 */
export const DEFAULT_EMOJIS: Record<string, string> = /* @__PURE__ */ (() => {
  const map: Record<string, string> = {};
  for (const [name, entry] of Object.entries(EMOJI_DATA)) {
    map[name] = entry.e;
  }
  return map;
})();

export function renderEmoji(name: string, customEmojis?: Record<string, string>): string | false {
  const custom = customEmojis?.[name];
  if (custom) {
    return `<gl-emoji data-name="${name}" title=":${name}:">${custom}</gl-emoji>`;
  }

  const entry = EMOJI_DATA[name];
  if (entry) {
    const uv = entry.u ? ` data-unicode-version="${entry.u}"` : '';
    return `<gl-emoji data-name="${name}"${uv} title="${entry.d}">${entry.e}</gl-emoji>`;
  }

  return false;
}
