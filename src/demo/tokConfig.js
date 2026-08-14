/**
 * Конфигурация Тока для демо-стенда.
 *
 * Всё, что здесь лежит, — настройки **хоста**, а не библиотеки: боевые значения
 * остаются в `DEFAULT_CONFIG` папки Тока. Стенду можно то, чего нельзя продукту:
 * отвечать нарочито медленно, чтобы успеть разглядеть лоадер.
 */

/**
 * Задержка ответа мока на стенде. За 6 секунд успевают смениться три фразы
 * лоадера (интервал 2700 мс) и разглядеться вращение звёздочки. Боевая задержка
 * мока — 700 мс (`DEFAULT_CONFIG.mockDelayMs`). Перебивается адресной строкой:
 * `?tokDelay=700`.
 */
export const DEMO_MOCK_DELAY_MS = 6000;

const DELAY_QUERY_PARAM = 'tokDelay';

/**
 * Задержка мока с учётом адресной строки.
 *
 * @returns {number} значение `?tokDelay=` в миллисекундах либо `DEMO_MOCK_DELAY_MS`.
 */
export function readDemoMockDelay() {
  try {
    const raw = new URLSearchParams(window.location.search).get(DELAY_QUERY_PARAM);
    const parsed = Number(raw);
    return raw !== null && Number.isFinite(parsed) && parsed >= 0 ? parsed : DEMO_MOCK_DELAY_MS;
  } catch (e) {
    return DEMO_MOCK_DELAY_MS;
  }
}

/**
 * Настройки Тока для стенда.
 *
 * Читается Током один раз в `beforeCreate`, поэтому объект обязан быть готов
 * до первого рендера — он собирается в `data()` хоста, а не в `computed`.
 *
 * @returns {object} переопределения поверх `DEFAULT_CONFIG`.
 */
export function createDemoTokConfig() {
  return {
    mockDelayMs: readDemoMockDelay(),
    // Только на стенде: показать заказчику, как график выглядит без логотипа
    // amCharts. В `DEFAULT_CONFIG` флаг остаётся опущенным — в Трансфере его
    // поднимают после подтверждения коммерческой лицензии amCharts 4.
    amchartsLicensed: true,
  };
}

export default createDemoTokConfig;
