/**
 * Фаза 5 — диалог: пустой экран, лента, композер, отражение workflow, копирование.
 */
import { REPLY_KIND, WORKFLOW_STATUS } from '@/Tok/services/api/contract';
import { SUGGESTIONS } from '@/Tok/services/constants/suggestions';
import { CONFIRM_TEXT } from '@/Tok/services/store/conversation';
import { createTokStore } from '@/Tok/services/store';
import { createControlledApi, createFakeVoice, flush, mountPanel } from './support/tok';

function setup(config) {
  const api = createControlledApi();
  const store = createTokStore({ api });
  const wrapper = mountPanel({ api, store, config });

  return { api, store, wrapper };
}

const CONFIRMATION = {
  reply: { kind: REPLY_KIND.CONFIRMATION, text: 'Посчитать стоимость за первое полугодие?' },
  workflow: { status: WORKFLOW_STATUS.CONFIRMING, awaitingConfirmation: true },
  contents: [],
};

describe('диалог', () => {
  describe('пустой экран', () => {
    it('показывает приветствие и чипы-подсказки', () => {
      const { wrapper } = setup();
      const text = wrapper.text();

      expect(wrapper.find('.tok-empty').exists()).toBe(true);
      expect(text).toContain('Привет!');
      expect(text).toContain('Я Ток - ИИ-ассистент в Трансфере');

      const chips = wrapper.findAll('.tok-chip');
      expect(chips).toHaveLength(SUGGESTIONS.length);
      expect(chips.at(0).text()).toBe(SUGGESTIONS[0]);

      wrapper.destroy();
    });

    it('клик по чипу подставляет вопрос в композер, но не отправляет его', async () => {
      const { api, wrapper } = setup();

      wrapper.findAll('.tok-chip').at(2).trigger('click');
      await flush();

      expect(wrapper.find('.tok-composer__input').element.value).toBe(SUGGESTIONS[2]);
      expect(api.calls).toHaveLength(0);

      wrapper.destroy();
    });

    it('уступает место ленте, как только появилось первое сообщение', async () => {
      const { wrapper, store } = setup();

      store.dispatch('conversation/send', 'вопрос');
      await flush();

      expect(wrapper.find('.tok-empty').exists()).toBe(false);
      expect(wrapper.find('.tok-feed').exists()).toBe(true);

      wrapper.destroy();
    });
  });

  describe('композер', () => {
    it('кнопка отправки появляется только при непустом тексте', async () => {
      const { wrapper } = setup();
      const input = wrapper.find('.tok-composer__input');

      expect(wrapper.find('.tok-composer__send').exists()).toBe(false);

      input.setValue('   ');
      await flush();
      expect(wrapper.find('.tok-composer__send').exists()).toBe(false);

      input.setValue('Какой у меня тариф?');
      await flush();
      expect(wrapper.find('.tok-composer__send').exists()).toBe(true);

      wrapper.destroy();
    });

    it('отправляет по Enter и очищает поле', async () => {
      const { api, wrapper } = setup();
      const input = wrapper.find('.tok-composer__input');

      input.setValue('Какой у меня тариф?');
      await flush();
      input.trigger('keydown.enter');
      await flush();

      expect(api.calls[0].message).toBe('Какой у меня тариф?');
      expect(input.element.value).toBe('');

      wrapper.destroy();
    });

    it('микрофон активен, когда голос доступен, и неактивен, когда нет', () => {
      const withVoice = mountPanel({ api: createControlledApi(), voice: createFakeVoice() });
      expect(withVoice.find('.tok-composer__mic').attributes('disabled')).toBeFalsy();
      withVoice.destroy();

      // Хост вправе выключить голос целиком — кнопка остаётся, но не работает:
      // исчезающий микрофон читался бы как поломка вёрстки.
      const off = mountPanel({
        api: createControlledApi(),
        voice: createFakeVoice(),
        config: { voiceEnabled: false },
      });
      expect(off.find('.tok-composer__mic').attributes('disabled')).toBeTruthy();
      off.destroy();
    });
  });

  describe('лента', () => {
    it('реплику пользователя показывает пузырём, ответ ассистента — без пузыря', async () => {
      const { api, store, wrapper } = setup();

      store.dispatch('conversation/send', 'Какой у меня тариф?');
      await api.respond({
        reply: { kind: REPLY_KIND.SUCCESS, text: 'Тариф — 6,71 ₽/кВт·ч' },
        workflow: { status: WORKFLOW_STATUS.COMPLETED },
        contents: [],
      });

      const messages = wrapper.findAll('.tok-message');
      expect(messages).toHaveLength(2);
      expect(messages.at(0).find('.tok-message__bubble').text()).toBe('Какой у меня тариф?');
      expect(messages.at(1).find('.tok-message__bubble').exists()).toBe(false);
      expect(messages.at(1).find('.tok-message__text').text()).toBe('Тариф — 6,71 ₽/кВт·ч');

      wrapper.destroy();
    });

    it('доскроллит к последнему сообщению', async () => {
      const { api, store, wrapper } = setup();

      store.dispatch('conversation/send', 'вопрос');
      await flush();

      // jsdom не считает layout, поэтому высоту ленты задаём сами —
      // иначе «доскроллил» и «обе величины нулевые» неотличимы.
      const feed = wrapper.find('.tok-feed').element;
      Object.defineProperty(feed, 'scrollHeight', { value: 4200, configurable: true });
      feed.scrollTop = 0;

      await api.respond({
        reply: { kind: REPLY_KIND.SUCCESS, text: 'ответ' },
        workflow: { status: WORKFLOW_STATUS.COMPLETED },
        contents: [],
      });

      expect(feed.scrollTop).toBe(4200);

      wrapper.destroy();
    });

    it('HTML из текста ответа не интерпретируется', async () => {
      const { api, store, wrapper } = setup();

      store.dispatch('conversation/send', 'вопрос');
      await api.respond({
        reply: { kind: REPLY_KIND.SUCCESS, text: 'Значение <b>выросло</b>' },
        workflow: { status: WORKFLOW_STATUS.COMPLETED },
        contents: [],
      });

      const answer = wrapper.find('.tok-message__text');
      expect(answer.text()).toBe('Значение <b>выросло</b>');
      expect(answer.find('b').exists()).toBe(false);

      wrapper.destroy();
    });
  });

  describe('отражение workflow', () => {
    it('awaitingConfirmation даёт акцентную границу и две кнопки', async () => {
      const { api, store, wrapper } = setup();

      store.dispatch('conversation/send', 'Выгрузи отчёт');
      await api.respond(CONFIRMATION);

      const message = wrapper.findAll('.tok-message').at(1);
      expect(message.classes()).toContain('tok-message--awaiting');

      const buttons = message.findAll('.tok-message__confirm .tok-button');
      expect(buttons).toHaveLength(2);
      expect(buttons.at(0).text()).toBe('Подтвердить');
      expect(buttons.at(1).text()).toBe('Отменить');

      wrapper.destroy();
    });

    it('нажатие «Подтвердить» отправляет ответ и убирает кнопки', async () => {
      const { api, store, wrapper } = setup();

      store.dispatch('conversation/send', 'Выгрузи отчёт');
      await api.respond(CONFIRMATION);

      wrapper.find('.tok-message__confirm .tok-button').trigger('click');
      await flush();

      expect(api.calls[1].message).toBe(CONFIRM_TEXT);
      // Лента не осталась в промежуточном состоянии: кнопок больше нет.
      expect(wrapper.find('.tok-message__confirm').exists()).toBe(false);

      wrapper.destroy();
    });

    it('forbidden блокирует ввод с пояснением', async () => {
      const { api, store, wrapper } = setup();

      store.dispatch('conversation/send', 'чужой договор');
      await api.respond({
        reply: { kind: REPLY_KIND.ERROR, text: 'Нет доступа к договору.' },
        workflow: { status: WORKFLOW_STATUS.FORBIDDEN },
        contents: [],
      });

      expect(wrapper.find('.tok-composer__input').attributes('disabled')).toBeTruthy();
      expect(wrapper.find('.tok-composer__notice').text()).toContain('нет доступа к данным');

      wrapper.destroy();
    });
  });

  describe('действия под ответом', () => {
    async function withAnswer(config) {
      const context = setup(config);
      context.store.dispatch('conversation/send', 'вопрос');
      await context.api.respond({
        reply: { kind: REPLY_KIND.SUCCESS, text: 'Тариф — 6,71 ₽/кВт·ч' },
        workflow: { status: WORKFLOW_STATUS.COMPLETED },
        contents: [],
      });
      return context;
    }

    it('копирует текст ответа и показывает «Скопировано»', async () => {
      const writeText = jest.fn(() => Promise.resolve());
      Object.defineProperty(window.navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      });

      const { wrapper } = await withAnswer();

      wrapper.find('.tok-actions__button').trigger('click');
      await flush();

      expect(writeText).toHaveBeenCalledWith('Тариф — 6,71 ₽/кВт·ч');
      expect(wrapper.find('.tok-actions__hint').text()).toBe('Скопировано');

      wrapper.destroy();
    });

    it('«Источник» реализован, но по умолчанию отсутствует в разметке', async () => {
      const hidden = await withAnswer();
      expect(hidden.wrapper.find('.tok-actions__button--source').exists()).toBe(false);
      hidden.wrapper.destroy();

      const shown = await withAnswer({ showSource: true });
      expect(shown.wrapper.find('.tok-actions__button--source').text()).toContain('Источник');
      shown.wrapper.destroy();
    });

    it('под сообщением о сбое связи копировать нечего', async () => {
      const { api, store, wrapper } = setup();

      store.dispatch('conversation/send', 'вопрос');
      await flush();
      await api.fail({ request: {} });

      expect(wrapper.find('.tok-actions').exists()).toBe(false);

      wrapper.destroy();
    });
  });
});
