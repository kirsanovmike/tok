/**
 * Форматирование значений предметной области для показа в ленте.
 *
 * Числа приходят от бэка «сырыми» (`412500`, `6.42`), а читать их в панели должен
 * человек: разряды разделяются, дробная часть — запятой. Локаль зафиксирована `ru-RU`,
 * а не взята из браузера: интерфейс Трансферы русскоязычный, и таблица не должна
 * менять вид от настроек ОС.
 */

const LOCALE = 'ru-RU';
const MAX_FRACTION_DIGITS = 2;

// Пустая ячейка — это «данных нет», а не «ноль». Показываем прочерк, а не пустоту:
// пустая ячейка в таблице читается как недогрузившаяся.
export const EMPTY_VALUE = '—';

let formatter;

function getFormatter() {
  if (formatter !== undefined) return formatter;

  // Intl есть везде, где работает Трансфера, но падать из-за форматирования числа
  // компонент не имеет права — при отсутствии Intl остаётся `String(value)`.
  try {
    formatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: MAX_FRACTION_DIGITS });
  } catch (e) {
    formatter = null;
  }

  return formatter;
}

/**
 * @param {number} value число от бэка.
 * @returns {string} число с разделителями разрядов в локали `ru-RU`.
 */
export function formatNumber(value) {
  const intl = getFormatter();
  return intl ? intl.format(value) : String(value);
}

/**
 * Значение ячейки, `stat` или элемента списка в том виде, в каком его увидит человек.
 *
 * @param {*} value значение из ответа.
 * @returns {string} готовая к показу строка; для пустых значений — прочерк.
 */
export function formatValue(value) {
  if (value === null || value === undefined || value === '') return EMPTY_VALUE;
  if (typeof value === 'number') return Number.isFinite(value) ? formatNumber(value) : EMPTY_VALUE;
  if (typeof value === 'boolean') return value ? 'да' : 'нет';
  return String(value);
}
