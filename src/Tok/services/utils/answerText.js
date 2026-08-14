/**
 * Текстовое представление ответа — то, что уходит в буфер обмена.
 *
 * До фазы 7 копировался только `reply.text`, и ответ с таблицей превращался
 * в одну вводную фразу. Копировать нужно ответ целиком, поэтому у каждого типа
 * блока есть текстовая форма.
 *
 * Формат подобран под то, куда это чаще всего вставляют: таблица — колонки через
 * табуляцию, чтобы Excel и Google Sheets разложили её по ячейкам сами. Это и есть
 * дешёвая замена выгрузке в Excel, которая вынесена за пределы v1.
 */
import { CONTENT_TYPE } from '../api/contract';
import { formatValue } from './format';
import {
  normalizeColumns,
  normalizeListItems,
  normalizeRows,
  normalizeSeries,
} from '../api/contentShape';

const COLUMN_SEPARATOR = '\t';

function tableToText(block) {
  const rows = normalizeRows(block.rows);
  const columns = normalizeColumns(block.columns, rows);
  if (!columns.length) return '';

  const header = columns.map((column) => column.title).join(COLUMN_SEPARATOR);
  const body = rows.map((row) =>
    columns.map((column) => formatValue(row[column.key])).join(COLUMN_SEPARATOR),
  );

  // Копируются все строки, а не текущая страница: страницы — способ показа,
  // а не способ урезать ответ.
  return [header].concat(body).join('\n');
}

function statToText(block) {
  const value = [formatValue(block.value), block.unit].filter(Boolean).join(' ');
  return block.label ? `${block.label}: ${value}` : value;
}

function listToText(block) {
  return normalizeListItems(block)
    .map((item) => `• ${formatValue(item)}`)
    .join('\n');
}

function chartToText(block) {
  // График в буфере обмена — это его данные: серия и пары «категория — значение».
  return normalizeSeries(block)
    .map((series) => {
      const points = series.points.map(
        (point) => `${point.category}${COLUMN_SEPARATOR}${formatValue(point.value)}`,
      );
      return [series.name].concat(points).join('\n');
    })
    .join('\n\n');
}

const TO_TEXT = {
  [CONTENT_TYPE.TEXT]: (block) => (typeof block.text === 'string' ? block.text : ''),
  [CONTENT_TYPE.LIST]: listToText,
  [CONTENT_TYPE.STAT]: statToText,
  [CONTENT_TYPE.TABLE]: tableToText,
  [CONTENT_TYPE.LINE]: chartToText,
  [CONTENT_TYPE.BAR]: chartToText,
  [CONTENT_TYPE.CIRCLE]: chartToText,
};

/**
 * Текст блоков `contents[]` в том же порядке, в каком они показаны.
 *
 * @param {Array} contents блоки ответа.
 * @returns {string} блоки через пустую строку; непоказанные пропущены.
 */
export function contentsToText(contents) {
  return (Array.isArray(contents) ? contents : [])
    .filter((block) => block && typeof block === 'object')
    .map((block) => {
      const toText = TO_TEXT[block.type];
      // Блок, который не показан, не копируется: буфер обмена обязан совпадать
      // с тем, что человек видит на экране.
      return toText ? toText(block) : '';
    })
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Весь ответ: вводная фраза плюс блоки.
 *
 * @param {object} message сообщение ассистента из стора.
 * @returns {string} то, что уходит в буфер обмена.
 */
export function answerToText(message) {
  const parts = [message && message.text, contentsToText(message && message.contents)];
  return parts.filter(Boolean).join('\n\n');
}

export default answerToText;
