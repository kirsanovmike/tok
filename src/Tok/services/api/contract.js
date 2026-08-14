/**
 * Модель контракта ассистента — единственное место, где живут строковые значения
 * `reply.kind`, `workflow.status` и `contents[].type`.
 *
 * Правило: в компонентах и в сторе сравнения идут только с этими константами.
 * Литерал `'confirming'` в разметке — дефект.
 *
 * Источник: `docs/api structure.txt`.
 */

/** Один запрос — `AssistantMessageRequest`. */
export function createRequest({ conversationId = null, message }) {
  // `conversationId` намеренно уходит на сервер и в первом сообщении — как явный `null`,
  // а не как отсутствующее поле: так контракт остаётся однозначным.
  return { conversationId: conversationId || null, message };
}

/** `reply.kind` — как подать ответ пользователю. */
export const REPLY_KIND = {
  CLARIFICATION: 'clarification',
  CONFIRMATION: 'confirmation',
  SUCCESS: 'success',
  FALLBACK: 'fallback',
  ERROR: 'error',
};

export const REPLY_KINDS = Object.keys(REPLY_KIND).map((key) => REPLY_KIND[key]);

/** `workflow.status` — состояние многошагового автомата на стороне ассистента. */
export const WORKFLOW_STATUS = {
  COLLECTING: 'collecting',
  CONFIRMING: 'confirming',
  EXECUTING: 'executing',
  COMPLETED: 'completed',
  FALLBACK: 'fallback',
  INFORMATIONAL: 'informational',
  FORBIDDEN: 'forbidden',
};

export const WORKFLOW_STATUSES = Object.keys(WORKFLOW_STATUS).map((key) => WORKFLOW_STATUS[key]);

/**
 * `contents[].type` — дискриминатор блока ответа.
 * Виды графиков — самостоятельные типы, а не поле внутри `chart` (см. CONTEXT.md).
 */
export const CONTENT_TYPE = {
  TEXT: 'text',
  LIST: 'list',
  STAT: 'stat',
  TABLE: 'table',
  LINE: 'line',
  BAR: 'bar',
  CIRCLE: 'circle',
};

export const CONTENT_TYPES = Object.keys(CONTENT_TYPE).map((key) => CONTENT_TYPE[key]);

/** Автор реплики в ленте. */
export const MESSAGE_AUTHOR = {
  USER: 'user',
  ASSISTANT: 'assistant',
};

export function isKnownReplyKind(kind) {
  return REPLY_KINDS.indexOf(kind) !== -1;
}

export function isKnownWorkflowStatus(status) {
  return WORKFLOW_STATUSES.indexOf(status) !== -1;
}

export function isKnownContentType(type) {
  return CONTENT_TYPES.indexOf(type) !== -1;
}

const EMPTY_WORKFLOW = {
  status: WORKFLOW_STATUS.COMPLETED,
  intent: null,
  domain: null,
  awaitingConfirmation: false,
};

/**
 * Приведение ответа сервера к форме, на которую опирается UI.
 *
 * Сервер вправе прислать неизвестный `kind`, неизвестный `status` или вовсе не прислать
 * `contents` — лента от этого падать не должна. Неизвестные значения не подменяются
 * тихо: они сохраняются как есть, а UI по `isKnown*` решает, что с ними делать.
 */
export function normalizeResponse(raw) {
  const data = raw || {};
  const reply = data.reply || {};
  const workflow = data.workflow || {};

  return {
    // Поля `conversationId` в описании ответа нет, но идентификатор беседы обязан
    // откуда-то приходить. Читаем оба вероятных места и не роняем беседу, если его нет.
    conversationId: data.conversationId || workflow.conversationId || null,
    reply: {
      kind: reply.kind || REPLY_KIND.SUCCESS,
      text: typeof reply.text === 'string' ? reply.text : '',
    },
    workflow: {
      status: workflow.status || EMPTY_WORKFLOW.status,
      intent: workflow.intent || null,
      domain: workflow.domain || null,
      awaitingConfirmation: workflow.awaitingConfirmation === true,
    },
    contents: Array.isArray(data.contents) ? data.contents : [],
  };
}
