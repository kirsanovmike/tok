/**
 * Фаза 4 — модель контракта.
 *
 * Отдельно проверяется, что в компонентах не осталось строковых литералов статусов:
 * это то самое место, где расхождение с бэком обнаруживается позже всего.
 */
import fs from 'fs';
import path from 'path';

import {
  CONTENT_TYPE,
  CONTENT_TYPES,
  REPLY_KIND,
  REPLY_KINDS,
  WORKFLOW_STATUS,
  WORKFLOW_STATUSES,
  createRequest,
  isKnownContentType,
  isKnownReplyKind,
  isKnownWorkflowStatus,
  normalizeResponse,
} from '@/Tok/services/api/contract';

const COMPONENTS_DIR = path.resolve(__dirname, '../../src/Tok/SubComponents');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((acc, entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? acc.concat(walk(full)) : acc.concat(full);
  }, []);
}

describe('контракт ассистента', () => {
  it('перечисляет ровно те значения, что описаны в docs/api structure.txt', () => {
    expect(REPLY_KINDS).toEqual(['clarification', 'confirmation', 'success', 'fallback', 'error']);

    expect(WORKFLOW_STATUSES).toEqual([
      'collecting',
      'confirming',
      'executing',
      'completed',
      'fallback',
      'informational',
      'forbidden',
    ]);

    // Виды графиков — самостоятельные типы блоков, а не поле внутри `chart`.
    expect(CONTENT_TYPES).toEqual(['text', 'list', 'stat', 'table', 'line', 'bar', 'circle']);
  });

  it('узнаёт известные значения и не выдаёт неизвестные за свои', () => {
    expect(isKnownReplyKind(REPLY_KIND.SUCCESS)).toBe(true);
    expect(isKnownReplyKind('whatever')).toBe(false);
    expect(isKnownWorkflowStatus(WORKFLOW_STATUS.FORBIDDEN)).toBe(true);
    expect(isKnownWorkflowStatus('paused')).toBe(false);
    expect(isKnownContentType(CONTENT_TYPE.TABLE)).toBe(true);
    expect(isKnownContentType('unknown_future_type')).toBe(false);
  });

  it('в первом сообщении conversationId уходит явным null', () => {
    expect(createRequest({ message: 'привет' })).toEqual({
      conversationId: null,
      message: 'привет',
    });
    expect(createRequest({ conversationId: 'abc', message: 'ещё' })).toEqual({
      conversationId: 'abc',
      message: 'ещё',
    });
  });

  it('переживает неполный и повреждённый ответ сервера', () => {
    const empty = normalizeResponse(null);

    expect(empty.reply.text).toBe('');
    expect(empty.contents).toEqual([]);
    expect(empty.workflow.awaitingConfirmation).toBe(false);
    expect(empty.conversationId).toBeNull();

    const partial = normalizeResponse({ reply: { kind: 'unknown-kind' }, contents: 'не массив' });

    // Неизвестный kind не подменяется тихо: решение принимает UI по `isKnown*`.
    expect(partial.reply.kind).toBe('unknown-kind');
    expect(partial.contents).toEqual([]);
  });

  it('в компонентах нет строковых литералов статусов и видов ответа', () => {
    const sources = walk(COMPONENTS_DIR).filter((file) => /\.(vue|js)$/.test(file));
    const literals = REPLY_KINDS.concat(WORKFLOW_STATUSES);

    const offenders = sources.filter((file) => {
      const code = fs.readFileSync(file, 'utf8');
      return literals.some((value) => code.indexOf(`'${value}'`) !== -1);
    });

    expect(offenders).toEqual([]);
  });
});
