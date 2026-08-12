// Локальные идентификаторы сообщений в ленте. К серверному `conversationId`
// отношения не имеют: нужны только как `:key` и как адрес сообщения в мутациях.
let counter = 0;

export function createLocalId(prefix) {
  counter += 1;
  return `${prefix || 'tok'}-${counter}`;
}

export default createLocalId;
