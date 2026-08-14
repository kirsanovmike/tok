/**
 * Сборка темы демо-приложения: палитры хоста + поверхности демо-дашборда + токены Тока.
 *
 * Ровно этот же приём применяется при переносе в Трансферу: к её палитрам добавляются
 * `tokThemeTokens`, остальное остаётся как есть (см. `src/Tok/README.md`).
 */
import { tokThemeTokens } from '@/Tok';

import palettes from './palettes';
import hostTokens from './hostTokens';

export const THEME_STORAGE_KEY = 'tok-demo:theme:v1';

function composeTheme(mode) {
  return {
    ...palettes[mode],
    ...hostTokens[mode],
    ...tokThemeTokens[mode],
  };
}

export const themes = {
  light: composeTheme('light'),
  dark: composeTheme('dark'),
};

export default themes;
