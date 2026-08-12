/**
 * Конфигурация Тока.
 *
 * Всё, что различается между демо-стендом и Трансферой, приходит сюда пропом
 * `<TokApp :config="..." />`. В коде компонента не должно быть ни адреса сервиса,
 * ни тем более токена.
 */

export const DEFAULT_CONFIG = {
  // Пустой `baseUrl` означает «реального бэка нет» — работает мок-слой.
  baseUrl: '',
  messagePath: '/assistant/message',
  timeoutMs: 30000,

  // Мок включается явно либо автоматически при отсутствии `baseUrl`.
  useMock: null,
  mockDelayMs: 700,
  // Принудительная фикстура: любой вопрос получает заранее заданный ответ.
  // Нужна, чтобы прогонять все комбинации контракта на стенде.
  fixtureId: null,

  // Провайдер токена: функция, а не строка, — токен живёт в хосте и может протухнуть.
  getAuthToken: null,

  // Кнопка «Источник» реализована, но по постановке скрыта. Включается одним флагом.
  showSource: false,
  // Голосовой ввод.
  voiceEnabled: true,
  // Эндпоинт расшифровки живёт на отдельном хосте от ассистента, поэтому здесь
  // полный URL, а не путь от `baseUrl`. Пусто — работает мок.
  transcribeUrl: '',
  transcribeTimeoutMs: 60000,
  // Где лежат файлы ffmpeg.wasm. Раскладываются в `public/` скриптом
  // `npm run prepare:ffmpeg`; в Трансфере путь может отличаться.
  ffmpegBaseUrl: '/ffmpeg',
  // Что «расслышит» мок расшифровки. Пустая строка воспроизводит ответ `{"text": ""}`.
  mockTranscript: null,

  // Хранение беседы в localStorage (ADR-0004). Хост вправе выключить его целиком —
  // тогда переписка живёт только до перезагрузки страницы.
  persistHistory: true,
  // Идентификатор пользователя из хоста. Входит в ключ хранилища: сменился
  // пользователь — прошлая переписка ему не покажется.
  storageNamespace: null,

  // У хоста есть коммерческая лицензия amCharts 4. Пока флаг не поднят, логотип
  // библиотеки на графиках остаётся: прятать его без лицензии нельзя.
  amchartsLicensed: false,
};

const FIXTURE_QUERY_PARAM = 'tokFixture';

// Стенд открывается как `?tokFixture=<id>`: это единственный способ показать
// заказчику каждую фикстуру контракта, не собирая отдельную страницу-каталог.
export function readFixtureIdFromLocation() {
  if (typeof window === 'undefined' || !window.location) return null;
  try {
    return new URLSearchParams(window.location.search).get(FIXTURE_QUERY_PARAM);
  } catch (e) {
    return null;
  }
}

export function createTokConfig(overrides) {
  const config = { ...DEFAULT_CONFIG, ...(overrides || {}) };

  if (config.useMock === null) config.useMock = !config.baseUrl;
  if (config.fixtureId === null) config.fixtureId = readFixtureIdFromLocation();
  // Расшифровка мокается по своему признаку: боевой ассистент вполне может
  // соседствовать с недоступным пока эндпоинтом расшифровки.
  config.useTranscriptionMock = !config.transcribeUrl;

  return config;
}

export default createTokConfig;
