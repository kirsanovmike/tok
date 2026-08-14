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
