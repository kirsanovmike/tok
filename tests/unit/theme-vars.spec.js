/**
 * Запасные CSS-переменные Тока.
 *
 * В Трансфере `--v-tok-*` объявляет `@tne-ui/core`. Там, где библиотеки нет
 * (демо-стенд, изолированный просмотр компонента), те же переменные пишет
 * `applyTokTheme` из значений `theme/tokens.js`.
 */
import tokens from '@/Tok/theme/tokens';
import { applyTokTheme, hasHostTokTheme, tokThemeCssVars } from '@/Tok/theme/applyTokTheme';

describe('запасные переменные темы Тока', () => {
  it('имя переменной — «--v-» плюс ключ токена, без суффикса -base', () => {
    const vars = tokThemeCssVars('light');

    expect(vars['--v-tok-surface']).toBe(tokens.light['tok-surface']);
    expect(vars['--v-tok-tooltip-text']).toBe(tokens.light['tok-tooltip-text']);
    expect(Object.keys(vars)).toHaveLength(Object.keys(tokens.light).length);
    expect(Object.keys(vars).filter((name) => name.endsWith('-base'))).toEqual([]);
  });

  it('пишет переменные на переданный элемент', () => {
    const target = document.createElement('div');

    expect(applyTokTheme('dark', { target })).toBe(true);
    expect(target.style.getPropertyValue('--v-tok-surface')).toBe(tokens.dark['tok-surface']);
  });

  it('повторный вызов перекрашивает: свои переменные не считаются чужими', () => {
    const target = document.createElement('div');

    applyTokTheme('dark', { target });
    applyTokTheme('light', { target });

    expect(target.style.getPropertyValue('--v-tok-surface')).toBe(tokens.light['tok-surface']);
  });

  it('не трогает элемент, если переменные уже объявил хост', () => {
    const target = document.createElement('div');
    const spy = jest
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({ getPropertyValue: () => tokens.dark['tok-surface'] });

    expect(hasHostTokTheme(target)).toBe(true);
    expect(applyTokTheme('light', { target })).toBe(false);
    expect(target.style.getPropertyValue('--v-tok-surface')).toBe('');

    spy.mockRestore();
  });

  it('флаг force перебивает переменные хоста', () => {
    const target = document.createElement('div');
    const spy = jest
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({ getPropertyValue: () => tokens.dark['tok-surface'] });

    expect(applyTokTheme('light', { target, force: true })).toBe(true);
    expect(target.style.getPropertyValue('--v-tok-surface')).toBe(tokens.light['tok-surface']);

    spy.mockRestore();
  });
});
