/* eslint-disable no-console */
/**
 * Раскладка ffmpeg.wasm в `public/ffmpeg/`.
 *
 * Почему копированием, а не импортом из бандла:
 *
 *   1. `@ffmpeg/ffmpeg@0.12` собран с приватными полями классов (`#field`). Парсер
 *      webpack 4 (acorn 6) такого синтаксиса не знает и падает на сборке. Загрузка
 *      готового UMD-файла тегом `<script>` обходит парсер вовсе.
 *   2. Библиотека сама поднимает Worker по пути, вычисленному от `currentScript.src`.
 *      Лежит она рядом со своим воркером в `public/ffmpeg/` — путь сходится сам,
 *      без единой настройки webpack.
 *   3. Ленивость получается настоящей: до первой записи браузер не скачивает ничего,
 *      а 31 МБ wasm не попадает ни в один чанк приложения (ADR-0002).
 *
 * Файлы не коммитятся (`public/ffmpeg/` в `.gitignore`) — скрипт запускается
 * автоматически на `npm install` и вручную через `npm run prepare:ffmpeg`.
 */
const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.resolve(__dirname, '..', 'public', 'ffmpeg');

const SOURCES = [
  // Обёртка и её воркер-чанк. Имя чанка (`814.ffmpeg.js`) зависит от версии,
  // поэтому берётся всё, что библиотека положила в свою UMD-сборку.
  { dir: path.resolve(__dirname, '..', 'node_modules', '@ffmpeg', 'ffmpeg', 'dist', 'umd') },
  // Однопоточное ядро. `core-mt` не используем ни при каком сценарии: оно требует
  // COOP/COEP на всей странице-хосте и сломало бы Трансферу (ADR-0002).
  { dir: path.resolve(__dirname, '..', 'node_modules', '@ffmpeg', 'core', 'dist', 'umd') },
];

function copyFrom({ dir }) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Не найден каталог ffmpeg: ${dir}. Выполните npm install.`);
  }

  return fs
    .readdirSync(dir)
    .filter((name) => /\.(js|wasm)$/.test(name) && !name.endsWith('.map'))
    .map((name) => {
      fs.copyFileSync(path.join(dir, name), path.join(TARGET_DIR, name));
      return name;
    });
}

function main() {
  fs.mkdirSync(TARGET_DIR, { recursive: true });

  const copied = SOURCES.reduce((acc, source) => acc.concat(copyFrom(source)), []);

  console.log(`ffmpeg: скопировано в public/ffmpeg/ — ${copied.join(', ')}`);
}

main();
