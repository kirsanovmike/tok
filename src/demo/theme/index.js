/**
 * Сборка темы демо-приложения: палитры хоста + поверхности демо-дашборда.
 *
 * Цветов Тока здесь больше нет: его переменные `--v-tok-*` объявляются не через
 * палитру Vuetify (та дописала бы им суффикс `-base`), а напрямую — в Трансфере
 * их даёт `@tne-ui/core`, на стенде их пишет `applyTokTheme` из `src/demo/App.vue`.
 * См. ADR-0009.
 */
import palettes from './palettes';
import hostTokens from './hostTokens';

export const THEME_STORAGE_KEY = 'tok-demo:theme:v1';

function composeTheme(mode) {
  return {
    ...palettes[mode],
    ...hostTokens[mode],
  };
}

export const themes = {
  light: composeTheme('light'),
  dark: composeTheme('dark'),
};

export default themes;
