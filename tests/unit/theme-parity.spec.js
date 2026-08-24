import palettes from '@/demo/theme/palettes';
import hostTokens from '@/demo/theme/hostTokens';
import tokTokens from '@/Tok/theme/tokens';
import { themes } from '@/demo/theme';
import { tokThemeCssVars } from '@/Tok/theme/applyTokTheme';

/** Плоский список ключей: `indigo.lighten5`, `tok-surface`, ... */
function flatKeys(palette) {
  return Object.keys(palette)
    .sort()
    .reduce((acc, group) => {
      const value = palette[group];
      if (value && typeof value === 'object') {
        Object.keys(value)
          .sort()
          .forEach((variant) => acc.push(`${group}.${variant}`));
      } else {
        acc.push(group);
      }
      return acc;
    }, []);
}

function diff(a, b) {
  return a.filter((key) => !b.includes(key));
}

describe('паритет палитр', () => {
  it.each([
    ['палитры хоста', palettes],
    ['поверхности демо-хоста', hostTokens],
    ['токены Тока', tokTokens],
    ['итоговая тема', themes],
  ])('%s: наборы ключей light и dark совпадают', (_name, source) => {
    const light = flatKeys(source.light);
    const dark = flatKeys(source.dark);

    expect(diff(light, dark)).toEqual([]);
    expect(diff(dark, light)).toEqual([]);
    expect(light).toEqual(dark);
  });

  it('группы *Deep из docs/theme.txt сохранены', () => {
    ['indigoDeep', 'greyDeep', 'shadesDeep'].forEach((group) => {
      expect(palettes.light[group]).toBeDefined();
      expect(palettes.dark[group]).toBeDefined();
    });
  });

  it('все значения палитр — hex или transparent', () => {
    const isColor = (value) => value === 'transparent' || /^#[0-9A-F]{3,8}$/i.test(value);
    const broken = [];

    ['light', 'dark'].forEach((mode) => {
      Object.entries(themes[mode]).forEach(([group, value]) => {
        if (value && typeof value === 'object') {
          Object.entries(value).forEach(([variant, color]) => {
            if (!isColor(color)) broken.push(`${mode}.${group}.${variant} = ${color}`);
          });
        } else if (!isColor(value)) {
          broken.push(`${mode}.${group} = ${value}`);
        }
      });
    });

    expect(broken).toEqual([]);
  });

  it('токенов Тока в палитре Vuetify больше нет: их объявляет @tne-ui/core', () => {
    // ADR-0009. Раньше цвета вливались в тему, и Vuetify дописывал им суффикс
    // `-base`. Теперь переменные `--v-tok-*` объявляет хост, а стенду их пишет
    // `applyTokTheme` — палитра Vuetify о Токе знать не должна.
    Object.keys(tokTokens.light).forEach((token) => {
      expect(themes.light[token]).toBeUndefined();
      expect(themes.dark[token]).toBeUndefined();
    });
  });

  it('каждый токен Тока превращается в переменную --v-tok-* в обеих темах', () => {
    ['light', 'dark'].forEach((mode) => {
      const vars = tokThemeCssVars(mode);

      Object.keys(tokTokens[mode]).forEach((token) => {
        expect(vars[`--v-${token}`]).toBe(tokTokens[mode][token]);
      });
    });
  });
});
