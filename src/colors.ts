const HEX_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
// Legacy comma syntax: rgb(255, 0, 0), rgba(255, 0, 0, 0.5)
// Modern space syntax: rgb(255 0 0), rgb(255 0 0 / 50%), rgb(255 0 0 / 0.5)
const RGB_REGEX = /^rgba?\(\s*\d{1,3}%?(?:\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?(?:\s*,\s*(?:0|1|0?\.\d+|\d{1,3}%))?|\s+\d{1,3}%?\s+\d{1,3}%?(?:\s*\/\s*(?:0|1|0?\.\d+|\d{1,3}%))?)\s*\)$/i;
// Legacy comma syntax: hsl(0, 100%, 50%), hsla(0, 100%, 50%, 0.5)
// Modern space syntax: hsl(0 100% 50%), hsl(0 100% 50% / 50%), hsl(0 100% 50% / 0.5)
const HSL_REGEX = /^hsla?\(\s*\d{1,3}%?(?:\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+|\d{1,3}%))?|\s+\d{1,3}%\s+\d{1,3}%(?:\s*\/\s*(?:0|1|0?\.\d+|\d{1,3}%))?)\s*\)$/i;

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
    return `<code>${text}<span class="gfm-color_chip"><span style="background-color: ${text};"></span></span></code>`;
  }

  return false;
}
