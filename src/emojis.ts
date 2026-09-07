export const DEFAULT_EMOJIS: Record<string, string> = {
  monkey: '🐒',
  star2: '🌟',
  speech_balloon: '💬',
  bug: '🐛',
  speak_no_evil: '🙊',
  snail: '🐌',
  birthday: '🎂',
  heart: '❤️',
  fearful: '😨',
  family: '👪',
  thumbsup: '👍',
  '+1': '👍',
  thumbsdown: '👎',
  '-1': '👎',
  smile: '😄',
  tada: '🎉',
  warning: '⚠️',
  rocket: '🚀',
  eyes: '👀',
  fire: '🔥',
  white_check_mark: '✅',
  x: '❌',
  sparkles: '✨',
  bulb: '💡',
};

export function renderEmoji(name: string, customEmojis?: Record<string, string>): string | false {
  const char = customEmojis?.[name] ?? DEFAULT_EMOJIS[name];
  if (char) {
    return `<gl-emoji data-name="${name}" title=":${name}:">${char}</gl-emoji>`;
  }
  return false;
}
