const HEX_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_REGEX = /^rgba?\(\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?(?:\s*,\s*(?:0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i;
const HSL_REGEX = /^hsla?\(\s*\d{1,3}%?\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i;

export function isColorCode(text: string): boolean {
  return HEX_REGEX.test(text) || RGB_REGEX.test(text) || HSL_REGEX.test(text);
}

export function renderColorCode(text: string): string | false {
  if (text.startsWith('\\')) {
    const unescaped = text.slice(1);
    if (isColorCode(unescaped)) {
      return `<code>${unescaped}</code>`;
    }
  }

  if (isColorCode(text)) {
    return `<code><span class="gl-color-chip" style="background-color: ${text};"></span>${text}</code>`;
  }

  return false;
}
