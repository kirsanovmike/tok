/**
 * Ошибки транспорта в терминах Тока.
 *
 * Компоненты не знают ни про axios, ни про его `Cancel`: транспорт помечает ошибку
 * флагом, а лента показывает человеку готовый текст.
 */

export const CANCELLED = 'tokCancelled';

// Отмена axios приходит объектом `Cancel`, а не `Error`, — он помечен этим полем.
// Ключ вынесен в константу: имя с подчёркиваниями — деталь axios, и обращаться
// к нему через точку линтеру справедливо не нравится.
const AXIOS_CANCEL_FLAG = '__CANCEL__';

export function createCancelError(reason) {
  const error = new Error(reason || 'Запрос отменён');
  error[CANCELLED] = true;
  return error;
}

export function isCancelError(error) {
  if (!error) return false;
  return error[CANCELLED] === true || error[AXIOS_CANCEL_FLAG] === true;
}

const TIMEOUT_MESSAGE = 'Ассистент не ответил вовремя. Попробуйте повторить вопрос.';
const OFFLINE_MESSAGE = 'Не удалось связаться с ассистентом. Проверьте соединение и повторите.';
const SERVER_MESSAGE = 'Ассистент временно недоступен. Попробуйте позже.';

/** Человекочитаемое описание сбоя — то, что увидит пользователь в ленте. */
export function describeError(error) {
  if (!error) return SERVER_MESSAGE;
  if (error.code === 'ECONNABORTED') return TIMEOUT_MESSAGE;
  if (error.response) return SERVER_MESSAGE;
  if (error.request) return OFFLINE_MESSAGE;
  return SERVER_MESSAGE;
}
