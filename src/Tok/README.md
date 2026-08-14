# `src/Tok/` — переносимый компонент

Всё, что относится к компоненту **Ток**, лежит здесь. Папка копируется в **Трансферу** и в общую
библиотеку компонентов как есть, без правок: внутри неё нет ни одного абсолютного импорта.

## Граница

| | `src/Tok/` | `src/demo/` |
|---|---|---|
| Назначение | сам компонент | демо-хост, чтобы его проверять |
| Переносится в Трансферу | да | нет |
| Может импортировать из соседа | **нет** | да |
| Содержит тесты | **нет** (тесты — в корневом `tests/`) | нет |

Правило «`tok` не знает о `demo`» держится тремя способами:

1. ESLint-правило `no-restricted-imports` (шаблоны `@/demo/*`, `**/demo/*`) — включено для всей кодовой базы и отключено только для `src/demo/`, `src/main.js` и тестов;
2. тест `tests/unit/tok-boundary.spec.js` — grep по исходникам папки;
3. в `src/Tok/` нет ни одного `*.spec.js`.

Четвёртое правило — **только относительные импорты** внутри папки: алиаса `@` в чужом
проекте может не быть. Держится ESLint-правилом (`overrides` для `src/Tok/**`) и тестом
`«в папке нет абсолютных импортов»` в `tok-boundary.spec.js`.

## Состав папки

Раскладка библиотечная: родительский компонент в корне, дочерние — в `SubComponents/`,
вся логика без вёрстки — в `services/` ([ADR-0008](../../docs/adr/0008-bibliotechnaya-raskladka-komponenta.md)).

```
Tok/
  Tok.vue                  ← родительский компонент
  index.js                 ← публичный вход папки
  SubComponents/           ← дочерние компоненты, плоским списком
  services/                ← логика и данные, ни одного .vue
  theme/tokens.js          ← цвета Тока
  styles/_tokens.scss      ← tok-color(), миксины, отступы, слои
```

| Путь | Что внутри |
|---|---|
| `Tok.vue` | корень: портал в `<body>`, точка входа, панель, создание стора и транспорта |
| `index.js` | публичный вход: `installTok`, `Tok`, `tokThemeTokens`, константы контракта |
| `SubComponents/` | все дочерние компоненты: оболочка, диалог, блоки ответа, иконки |
| `services/index.js` | витрина сервисов: то, чем пользуется `Tok.vue` |
| `services/config.js` | вся конфигурация: адрес сервиса, провайдер токена, флаги, мок |
| `services/contentRegistry.js` | соответствие «тип блока `contents[]` → компонент» |
| `services/warn.js` | предупреждение о неизвестном типе блока |
| `services/tokStore.js` | миксин доступа к стору беседы |
| `services/api/contract.js` | `REPLY_KIND`, `WORKFLOW_STATUS`, `CONTENT_TYPE` и нормализация ответа |
| `services/api/contentShape.js` | форма блоков `contents[]`: колонки, строки, элементы списка, серии графика |
| `services/api/httpClient.js` | транспорт на axios с отменой запроса |
| `services/api/transcribe.js` | расшифровка голоса: `multipart/form-data` с полем `file` |
| `services/api/mock/` | фикстуры ответов, мок ассистента и мок расшифровки |
| `services/store/` | Vuex-модуль беседы (ADR-0006) и хранение в `localStorage` (ADR-0004) |
| `services/charts/` | сборка графиков amCharts 4 и их палитра из токенов темы |
| `services/voice/` | микрофон, кодирование в MP3, конвейер голосового ввода |
| `services/constants/` | чипы-подсказки и фразы загрузки |
| `services/utils/` | фокус-ловушка, блокировка скролла, буфер обмена, ротация фраз, форматирование чисел, текст ответа для копирования |
| `theme/tokens.js` | цвета Тока; **единственное** место с hex внутри папки |
| `styles/_tokens.scss` | `tok-color()`, `host-color()`, миксин градиента, отступы, слои |

## Как положить в библиотеку

1. Скопировать `src/Tok` целиком в `components/Tok` библиотеки. Правки путей не нужны:
   внутри папки только относительные импорты.
2. Подключить `theme/tokens.js` в обе палитры Vuetify — плоскими цветами верхнего уровня
   (пример ниже, раздел «Подключение»). Наборы ключей `light` и `dark` обязаны совпадать.
3. Прокинуть `styles/_tokens.scss` в сборку библиотеки — иначе ни один SFC не соберётся:
   в Vue CLI это `css.loaderOptions.scss.additionalData`, в vite — `css.preprocessorOptions.scss.additionalData`.

   ```js
   // vue.config.js библиотеки
   css: {
     loaderOptions: {
       scss: { additionalData: '@import "@/components/Tok/styles/_tokens.scss";' },
     },
   }
   ```
4. Убедиться, что peer-зависимости из таблицы ниже стоят нужных версий.
5. Для голосового ввода — разложить файлы ffmpeg.wasm (раздел ниже) либо выключить голос
   флагом `voiceEnabled: false`.

## Что нужно от хоста

| Зависимость | Версия | Зачем |
|---|---|---|
| `vue` | 2.6.14 | Options API |
| `vuetify` | 2.6.3 | **только тема**; нужен `theme.options.customProperties: true` |
| `vuex` | 3.x | стор беседы (ADR-0006) |
| `portal-vue` | 2.1.7 | вынос панели в `<body>` |
| `axios` | 0.21.4 | транспорт |
| `date-fns`, `date-fns-tz` | 2.28.0 / 1.3.0 | периоды и TTL истории |
| `@amcharts/amcharts4` | 4.10.20 | графики; подключён **асинхронным чанком** — грузится только когда в ответе есть график |
| `@ffmpeg/ffmpeg`, `@ffmpeg/core` | 0.12.15 / 0.12.10 | кодирование голоса в MP3. **Не импортируются**: файлы раскладываются в `public/` (ADR-0007) |

Сборка в этом репозитории: алиас `@` → `src`, `sass` с подключением
`@/Tok/styles/_tokens.scss` через `css.loaderOptions.scss.additionalData`
(см. `vue.config.js` в корне репозитория).

### Отдельный шаг установки: ffmpeg.wasm

Голосовой ввод требует, чтобы четыре файла лежали статикой и отдавались по HTTP:

```
public/ffmpeg/ffmpeg.js
public/ffmpeg/814.ffmpeg.js     ← воркер, имя зависит от версии библиотеки
public/ffmpeg/ffmpeg-core.js
public/ffmpeg/ffmpeg-core.wasm  ← 31 МБ
```

Раскладываются из `node_modules` скриптом `scripts/copy-ffmpeg.js`:

```
npm run prepare:ffmpeg
```

В этом репозитории он же висит на `postinstall`, а `public/ffmpeg/` — в `.gitignore`.
Если приложение живёт не в корне домена, путь задаётся через `config.ffmpegBaseUrl`.
Почему именно так, а не импортом в бандл, — [ADR-0007](../../docs/adr/0007-ffmpeg-podklyuchaetsya-skriptom-iz-public.md).
Голос можно выключить целиком: `config.voiceEnabled: false` — тогда файлы не нужны.

## Подключение

```js
import Vue from 'vue';
import { installTok, tokThemeTokens } from '@/Tok';

installTok(Vue);
```

Токены темы вливаются в обе палитры Vuetify плоскими цветами верхнего уровня:

```js
new Vuetify({
  theme: {
    options: { customProperties: true },
    themes: {
      light: { ...hostLightPalette, ...tokThemeTokens.light },
      dark: { ...hostDarkPalette, ...tokThemeTokens.dark },
    },
  },
});
```

И далее в разметке хоста:

```vue
<Tok />
```

## Конфигурация

Без пропа `config` Ток работает на мок-слое: `baseUrl` пуст, значит настоящего бэка нет.
Боевое подключение:

```vue
<Tok
  :config="{
    baseUrl: 'https://llm.example',
    messagePath: '/assistant/message',
    getAuthToken: () => this.$store.getters['auth/token'],
  }"
/>
```

Токен приходит функцией, а не строкой: он живёт в хосте и протухает. В исходниках Тока
захардкоженного токена нет и быть не должно.

Остальные ключи — см. `services/config.js`. Конфигурация читается один раз при создании компонента.

| Ключ | По умолчанию | Зачем |
|---|---|---|
| `timeoutMs` | `30000` | таймаут запроса к ассистенту |
| `useMock`, `mockDelayMs`, `fixtureId` | авто / `700` / из URL | мок-слой ассистента |
| `showSource` | `false` | кнопка «Источник» под ответом: реализована, но скрыта |
| `voiceEnabled` | `true` | голосовой ввод |
| `transcribeUrl` | `''` | **полный** URL эндпоинта расшифровки — он на отдельном хосте. Пусто — работает мок |
| `transcribeTimeoutMs` | `60000` | таймаут расшифровки |
| `ffmpegBaseUrl` | `'/ffmpeg'` | где лежат файлы ffmpeg.wasm |
| `mockTranscript` | `null` | что «расслышит» мок; `''` воспроизводит ответ `{"text": ""}` |
| `persistHistory` | `true` | хранить беседу в `localStorage` (ADR-0004) |
| `storageNamespace` | `null` | идентификатор пользователя; входит в ключ хранилища |
| `amchartsLicensed` | `false` | у хоста есть коммерческая лицензия amCharts — снимает её логотип с графиков |

## Хранение беседы

Переписка и `conversationId` лежат в `localStorage` под ключом
`tok:conversation:v1[:<storageNamespace>]`. Хранятся **только** сообщения и идентификатор
беседы — ни токенов, ни конфигурации. Сообщения старше **одного календарного месяца**
удаляются при инициализации. Повреждённые, устаревшие по версии и просто не читаемые
данные не роняют панель: беседа стартует пустой. Подробности и принятый заказчиком
риск — [ADR-0004](../../docs/adr/0004-hranenie-besedy-v-localstorage-s-ttl.md).

## Фикстуры на стенде

Мок подбирает ответ по ключевым словам вопроса. Чтобы посмотреть конкретную комбинацию
контракта, страница открывается с параметром: `?tokFixture=<id>` — тогда любой вопрос
получает именно этот ответ. Идентификаторы перечислены в `services/api/mock/fixtures.js`
(например `confirming`, `forbidden`, `multi`, `matrix-error-completed`).

## Цвета

Hex внутри папки допустим **только** в `theme/tokens.js`. Компоненты берут цвета через
`tok-color()` / `host-color()` из `styles/_tokens.scss`, то есть через CSS-переменные Vuetify,
которые переключаются вместе с темой. `linear-gradient(` встречается только в `styles/_tokens.scss`
(миксин `tok-gradient`).

Исключение по механике, но не по правилу — графики: amCharts рисует SVG из JavaScript
и строку `var(--v-…)` не понимает. `services/charts/palette.js` достаёт **вычисленное** значение
CSS-переменной из стилей контейнера, а если Vuetify не объявил свой `:root` — берёт то же
значение прямо из `theme/tokens.js`. Дефолтная палитра amCharts не используется нигде.

## Точки замены при переносе

От Vuetify Ток берёт **только тему**: ни одного `v-*`-компонента внутри папки нет —
панель, композер и кнопки собраны на нативных элементах и токенах. Поэтому «слой-обёртка»
над примитивами (ADR-0001) свёлся к двум местам:

| Что | Файл | Чем заменяется в Трансфере |
|---|---|---|
| Иконки | `SubComponents/TokIcon.vue` | `@tne-ui/sprites` |
| Логотип | `SubComponents/TokLogo.vue` | остаётся как есть |

Всё остальное переносится без правок. Единственное, что нужно **добавить** на стороне
хоста, — раскладка файлов ffmpeg.wasm (см. выше) и, если графики нужны без логотипа
amCharts, флаг `amchartsLicensed`.
