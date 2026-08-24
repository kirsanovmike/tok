const fs = require('fs');
const path = require('path');

const TOK_DIR = path.resolve(__dirname, '../../src/Tok');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((acc, entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? acc.concat(walk(full)) : acc.concat(full);
  }, []);
}

const files = walk(TOK_DIR);
const sources = files.filter((file) => /\.(js|vue|scss)$/.test(file));

describe('граница переносимой папки src/Tok', () => {
  it('в папке есть исходники', () => {
    expect(sources.length).toBeGreaterThan(0);
  });

  it('не импортирует ничего из демо-хоста', () => {
    const offenders = sources.filter((file) =>
      /['"@/\w.-]*\bdemo\//.test(fs.readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('не содержит тестов', () => {
    const specs = files.filter((file) => /\.spec\.[jt]s$/.test(file));
    expect(specs).toEqual([]);
  });

  it('hex-цвета встречаются только в theme/tokens.js', () => {
    const offenders = sources
      .filter((file) => !file.endsWith(path.join('theme', 'tokens.js')))
      .filter((file) => /#[0-9a-fA-F]{3,8}\b/.test(fs.readFileSync(file, 'utf8')));

    expect(offenders).toEqual([]);
  });

  it('многопоточное ядро ffmpeg не подключено', () => {
    // `@ffmpeg/core-mt` требует SharedArrayBuffer, а тот — заголовков COOP/COEP
    // на всей странице-хосте: в Трансфере это сломало бы сторонние ресурсы и iframe
    // (ADR-0002). Проверка grep-ом, чтобы требование не нарушила будущая правка.
    // Упоминание в комментарии-объяснении внутри `encodeToMp3.js` — не подключение.
    const offenders = sources
      .filter((file) => !file.endsWith(path.join('services', 'voice', 'encodeToMp3.js')))
      .filter((file) => /core-mt|SharedArrayBuffer/.test(fs.readFileSync(file, 'utf8')));

    expect(offenders).toEqual([]);
  });

  it('linear-gradient встречается только в styles/_tokens.scss', () => {
    const offenders = sources
      .filter((file) => !file.endsWith(path.join('styles', '_tokens.scss')))
      .filter((file) => fs.readFileSync(file, 'utf8').includes('linear-gradient('));

    expect(offenders).toEqual([]);
  });

  it('в папке нет абсолютных импортов — она копируется как есть', () => {
    // Алиаса `@` в чужом проекте может не быть вовсе: папку кладут в общую
    // библиотеку компонентов целиком, вместе с этой проверкой.
    const offenders = sources
      .filter((file) => /\.(js|vue)$/.test(file))
      .filter((file) => /from ['"]@\//.test(fs.readFileSync(file, 'utf8')));

    expect(offenders).toEqual([]);
  });

  it('цвета читаются как --v-tok-<токен>, без суффикса -base', () => {
    // Переменные объявляет `@tne-ui/core` (ADR-0009). Суффикс `-base` дописывал
    // парсер темы Vuetify 2 — этого пути больше нет ни в стилях, ни в графиках.
    const tokensScss = fs.readFileSync(path.join(TOK_DIR, 'styles', '_tokens.scss'), 'utf8');

    expect(tokensScss).toContain('@return var(--v-tok-#{$token});');

    const offenders = sources.filter((file) =>
      /--v-[\w-]+-base/.test(fs.readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('функции host-color в папке нет — базовые цвета хоста и так объявлены', () => {
    const offenders = sources.filter((file) => /host-color/.test(fs.readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('контракт стилей совпадает с набором из @tne-ui/core', () => {
    const tokensScss = fs.readFileSync(path.join(TOK_DIR, 'styles', '_tokens.scss'), 'utf8');

    // Постановка `docs/Задача на доработку 1.md`, строки 20–80: ровно этот набор
    // заказчик положил в core. Расхождение сломает сборку в библиотеке.
    [
      '@function tok-color($token)',
      '@mixin tok-button-color($token)',
      '@mixin tok-gradient($angle: 135deg)',
      '@mixin tok-thin-scrollbar($size: $tok-scrollbar-size)',
      '$tok-scrollbar-size: 6px;',
      '$tok-panel-min-width: 520px;',
      '$tok-radius-lg: 20px;',
      '$tok-radius-md: 16px;',
      '$tok-radius-sm: 12px;',
      '$tok-space-xs: 4px;',
      '$tok-space-sm: 8px;',
      '$tok-space-md: 16px;',
      '$tok-space-lg: 24px;',
      '$tok-space-xl: 32px;',
      '$tok-z-overlay: 200;',
      '$tok-z-panel: 201;',
      '$tok-z-entry: 199;',
      '$tok-duration-panel: 280ms;',
      '$tok-easing-panel: cubic-bezier(0.22, 1, 0.36, 1);',
    ].forEach((line) => expect(tokensScss).toContain(line));

    // Скругление шторки в core не входит: оно объявлено в том SFC, который им пользуется.
    expect(tokensScss).not.toContain('$tok-panel-radius');
    expect(fs.readFileSync(path.join(TOK_DIR, 'SubComponents', 'TokPanel.vue'), 'utf8')).toContain(
      '$tok-panel-radius: 24px;',
    );
  });

  it('раскладка библиотечная: Tok.vue, SubComponents/, services/', () => {
    expect(fs.existsSync(path.join(TOK_DIR, 'Tok.vue'))).toBe(true);

    // Ни одного .vue вне корня и SubComponents/.
    const strays = files
      .filter((file) => file.endsWith('.vue'))
      .filter((file) => path.dirname(file) !== TOK_DIR)
      .filter((file) => path.dirname(file) !== path.join(TOK_DIR, 'SubComponents'));
    expect(strays).toEqual([]);

    // В services/ — ни одного компонента: там только логика и данные.
    const componentsInServices = files
      .filter((file) => file.startsWith(path.join(TOK_DIR, 'services')))
      .filter((file) => file.endsWith('.vue'));
    expect(componentsInServices).toEqual([]);
  });
});
