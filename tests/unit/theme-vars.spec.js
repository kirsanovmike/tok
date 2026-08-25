/**
 * Объявление переменных Тока на стороне хоста.
 *
 * Компоненты Тока читают цвета как `var(--v-tok-<токен>)` и больше о теме
 * ничего не знают (ADR-0010). Объявить эти переменные обязан хост: в Трансфере —
 * `@tne-ui/core`, на стенде — `src/demo/styles/tok-vars.scss`, который
 * переименовывает то, что напечатал в `:root` парсер темы Vuetify.
 *
 * Цепочка длиной в два звена рвётся молча: забытый в SCSS токен даёт не ошибку
 * сборки, а невидимый элемент в одной из тем. Поэтому она проверяется здесь.
 */
import fs from 'fs';
import path from 'path';

import tokTokens from '@/demo/theme/tokTokens';

const TOK_VARS_SCSS = fs.readFileSync(
  path.resolve(__dirname, '../../src/demo/styles/tok-vars.scss'),
  'utf8',
);

/** Пары «объявленная переменная → переменная, из которой взято значение». */
function declarations(source) {
  const pattern = /^\s*(--v-tok-[\w-]+):\s*var\((--v-tok-[\w-]+)\);$/gm;

  return Array.from(source.matchAll(pattern)).reduce(
    (acc, [, name, from]) => ({ ...acc, [name]: from }),
    {},
  );
}

describe('переменные Тока на стенде', () => {
  const declared = declarations(TOK_VARS_SCSS);

  it('каждый цвет из палитры объявлен переменной без суффикса -base', () => {
    Object.keys(tokTokens.light).forEach((token) => {
      // Слева — имя, которое стоит в стилях компонентов; справа — то, что
      // напечатал Vuetify из палитры (`src/demo/theme/tokTokens.js`).
      expect(declared[`--v-${token}`]).toBe(`--v-${token}-base`);
    });
  });

  it('лишнего в файле нет: он повторяет палитру ключ в ключ', () => {
    const expected = Object.keys(tokTokens.light)
      .map((token) => `--v-${token}`)
      .sort();

    expect(Object.keys(declared).sort()).toEqual(expected);
  });

  it('компоненты Тока читают ровно эти имена', () => {
    const tokDir = path.resolve(__dirname, '../../src/Tok');
    const walk = (dir) =>
      fs.readdirSync(dir, { withFileTypes: true }).reduce((acc, entry) => {
        const full = path.join(dir, entry.name);
        return entry.isDirectory() ? acc.concat(walk(full)) : acc.concat(full);
      }, []);

    const used = walk(tokDir)
      .filter((file) => file.endsWith('.vue') || file.endsWith('.js'))
      .reduce((acc, file) => {
        const matches = fs.readFileSync(file, 'utf8').match(/var\((--v-tok-[\w-]+)\)/g) || [];
        matches.forEach((match) => acc.add(match.slice(4, -1)));
        return acc;
      }, new Set());

    expect(Array.from(used).filter((name) => !declared[name])).toEqual([]);
  });
});
