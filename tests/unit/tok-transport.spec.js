/**
 * Фаза 4 — транспорт.
 *
 * axios подменён целиком: проверяем не сеть, а то, какое тело уходит на сервер
 * и что отмена доходит до `CancelToken`.
 */
jest.mock('axios', () => {
  const mockPost = jest.fn();
  const mockCancel = jest.fn();
  const mockSource = { token: 'cancel-token', cancel: mockCancel };

  return {
    create: jest.fn(() => ({ post: mockPost })),
    CancelToken: { source: jest.fn(() => mockSource) },
    post: mockPost,
    cancel: mockCancel,
  };
});

/* eslint-disable import/first */
import axios from 'axios';

import { createHttpAssistantClient } from '@/Tok/services/api/httpClient';
import { createTokConfig } from '@/Tok/services/config';
/* eslint-enable import/first */

function createClient(overrides) {
  return createHttpAssistantClient(
    createTokConfig({ baseUrl: 'https://assistant.example', ...(overrides || {}) }),
  );
}

describe('транспорт ассистента', () => {
  beforeEach(() => {
    axios.post.mockReset();
    axios.cancel.mockReset();
    axios.post.mockResolvedValue({
      data: {
        conversationId: 'c-1',
        reply: { kind: 'success', text: 'Готово' },
        workflow: { status: 'completed', awaitingConfirmation: false },
        contents: [],
      },
    });
  });

  it('в первом сообщении отправляет conversationId: null', async () => {
    await createClient().sendMessage({ conversationId: null, message: 'Какой у меня тариф?' });

    const [url, body] = axios.post.mock.calls[0];

    expect(url).toBe('/assistant/message');
    expect(body).toEqual({ conversationId: null, message: 'Какой у меня тариф?' });
  });

  it('в последующих сообщениях подставляет выданный сервером conversationId', async () => {
    const client = createClient();
    const first = await client.sendMessage({ conversationId: null, message: 'первый' });

    expect(first.conversationId).toBe('c-1');

    await client.sendMessage({ conversationId: first.conversationId, message: 'второй' });

    expect(axios.post.mock.calls[1][1]).toEqual({ conversationId: 'c-1', message: 'второй' });
  });

  it('подставляет Bearer-токен из провайдера, а не из кода', async () => {
    await createClient({ getAuthToken: () => 'secret-token' }).sendMessage({
      conversationId: null,
      message: 'вопрос',
    });

    expect(axios.post.mock.calls[0][2].headers.Authorization).toBe('Bearer secret-token');
  });

  it('без провайдера токена заголовок авторизации не добавляется', async () => {
    await createClient().sendMessage({ conversationId: null, message: 'вопрос' });

    expect(axios.post.mock.calls[0][2].headers.Authorization).toBeUndefined();
  });

  it('отменяет активный запрос', async () => {
    const client = createClient();
    // Запрос, который никогда не завершится сам.
    axios.post.mockReturnValue(new Promise(() => {}));
    client.sendMessage({ conversationId: null, message: 'долгий вопрос' });

    client.cancel('Пользователь ушёл');

    expect(axios.cancel).toHaveBeenCalledWith('Пользователь ушёл');
  });

  it('без активного запроса отмена ничего не делает', () => {
    createClient().cancel();

    expect(axios.cancel).not.toHaveBeenCalled();
  });
});
