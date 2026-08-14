/**
 * Локальные идентификаторы сообщений в ленте.
 *
 * К серверному `conversationId` отношения не имеют: нужны только как `:key`
 * во `v-for` и как адрес сообщения в мутациях стора. Поэтому счётчик, а не uuid:
 * уникальности в пределах вкладки достаточно, а зависимость — лишняя.
 */
let counter = 0;

/**
 * @param {string} [prefix] префикс идентификатора, по умолчанию `tok`.
 * @returns {string} идентификатор вида `assistant-7`, уникальный в пределах вкладки.
 */
export function createLocalId(prefix) {
  counter += 1;
  return `${prefix || 'tok'}-${counter}`;
}

export default createLocalId;
