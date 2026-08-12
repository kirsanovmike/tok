/**
 * Форма блоков `contents[]`: приведение к структуре, на которую опираются компоненты.
 *
 * Лежит рядом с контрактом, а не в компонентах: это продолжение `normalizeResponse` —
 * `normalizeResponse` отвечает за конверт ответа, а этот файл за начинку блоков.
 *
 * Контракт описывает блоки в терминах бэка (`columns`, `rows`, `xField`, `yField`,
 * `series[]`), но допускает вольности: колонки строками вместо объектов, отсутствие
 * `columns` вовсе, `items` списка из чисел. Разбирать это в каждом компоненте —
 * значит размазать защиту от неполных данных по всей папке.
 */

/**
 * Колонки таблицы: `[{ key, title }]`.
 * Нет `columns` — выводим их из ключей строк: порядок ключей в JSON стабилен,
 * и это лучше, чем показать пустую таблицу.
 */
export function normalizeColumns(columns, rows) {
  const source = Array.isArray(columns) && columns.length ? columns : null;

  if (!source) {
    const first = (Array.isArray(rows) ? rows : []).filter(Boolean)[0] || {};
    return Object.keys(first).map((key) => ({ key, title: key }));
  }

  return source
    .map((column) => {
      if (typeof column === 'string') return { key: column, title: column };
      if (!column) return null;

      const key = column.key || column.field || column.name;
      if (!key) return null;

      return { key, title: column.title || column.label || key };
    })
    .filter(Boolean);
}

export function normalizeRows(rows) {
  return (Array.isArray(rows) ? rows : []).filter((row) => row && typeof row === 'object');
}

/** Элементы списка. Числа и объекты `{ label, value }` тоже допустимы. */
export function normalizeListItems(block) {
  const source = Array.isArray(block.items) ? block.items : block.values;

  return (Array.isArray(source) ? source : []).filter(
    (item) => item !== null && item !== undefined && item !== '',
  );
}

/**
 * Серии графика: `[{ name, points: [{ category, value }] }]`.
 *
 * `xField` / `yField` — имена полей внутри точек, а не сами данные, поэтому
 * разворачиваем их здесь: компонент графика должен думать про оси, а не про ключи.
 */
export function normalizeSeries(block) {
  const xField = block.xField || 'x';
  const yField = block.yField || 'y';
  const series = Array.isArray(block.series) ? block.series : [];

  return series
    .filter((item) => item && Array.isArray(item.data))
    .map((item, index) => ({
      name: item.name || `Ряд ${index + 1}`,
      points: item.data
        .filter(Boolean)
        .map((point) => ({
          category: String(point[xField]),
          value: Number(point[yField]),
        }))
        .filter((point) => Number.isFinite(point.value)),
    }))
    .filter((item) => item.points.length > 0);
}
