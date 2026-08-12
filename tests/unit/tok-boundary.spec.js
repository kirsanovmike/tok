const fs = require('fs');
const path = require('path');

const TOK_DIR = path.resolve(__dirname, '../../src/tok');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((acc, entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? acc.concat(walk(full)) : acc.concat(full);
  }, []);
}

const files = walk(TOK_DIR);
const sources = files.filter((file) => /\.(js|vue|scss)$/.test(file));

describe('граница переносимой папки src/tok', () => {
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
      .filter((file) => !file.endsWith(path.join('voice', 'encodeToMp3.js')))
      .filter((file) => /core-mt|SharedArrayBuffer/.test(fs.readFileSync(file, 'utf8')));

    expect(offenders).toEqual([]);
  });

  it('linear-gradient встречается только в styles/_tokens.scss', () => {
    const offenders = sources
      .filter((file) => !file.endsWith(path.join('styles', '_tokens.scss')))
      .filter((file) => fs.readFileSync(file, 'utf8').includes('linear-gradient('));

    expect(offenders).toEqual([]);
  });
});
