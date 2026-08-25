/**
 * Сборка темы демо-приложения: палитры хоста + поверхности демо-дашборда + цвета Тока.
 *
 * Цвета Тока лежат здесь потому, что объявлять их — забота хоста, а переключать —
 * забота Vuetify: парсер темы печатает их в `:root` как `--v-tok-*-base`, а
 * `src/demo/styles/tok-vars.scss` переименовывает в те имена, которые читает Ток.
 * В Трансфере ту же работу делает `@tne-ui/core`. См. ADR-0010.
 */
import palettes from './palettes';
import hostTokens from './hostTokens';
import tokTokens from './tokTokens';

export const THEME_STORAGE_KEY = 'tok-demo:theme:v1';

function composeTheme(mode) {
  return {
    ...palettes[mode],
    ...hostTokens[mode],
    ...tokTokens[mode],
  };
}

export const themes = {
  light: composeTheme('light'),
  dark: composeTheme('dark'),
};

export default themes;
