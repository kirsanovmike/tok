/**
 * Индикатор загрузки: вращение вокруг вертикальной оси, сценарий фраз, reduced motion.
 */
import fs from 'fs';
import path from 'path';

import { mount } from '@vue/test-utils';

import TokLoader from '@/Tok/SubComponents/TokLoader.vue';
import {
  LOADING_PHRASES,
  PHRASE_INTERVAL_MS,
  TAIL_SIZE,
} from '@/Tok/services/constants/loadingPhrases';
import { nextPhraseIndex } from '@/Tok/services/utils/phraseRotator';
import { REPLY_KIND, WORKFLOW_STATUS } from '@/Tok/services/api/contract';
import { createTokStore } from '@/Tok/services/store';
import { createControlledApi, flush, mountPanel } from './support/tok';

const TOK_DIR = path.resolve(__dirname, '../../src/Tok');
const LOADER_SOURCE = fs.readFileSync(path.join(TOK_DIR, 'SubComponents/TokLoader.vue'), 'utf8');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((acc, entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? acc.concat(walk(full)) : acc.concat(full);
  }, []);
}

describe('индикатор загрузки', () => {
  describe('фразы', () => {
    it('пауза между фразами — 2700 мс: прежние 1800 мельтешили', () => {
      // Постановка «Доработки 3», пункт 5: увеличить интервал в полтора раза.
      expect(PHRASE_INTERVAL_MS).toBe(2700);
    });

    it('это сценарий: восемь фраз, первая — «Думаю…», предметных сущностей нет', () => {
      expect(LOADING_PHRASES).toHaveLength(8);
      expect(LOADING_PHRASES[0]).toBe('Думаю…');
      expect(LOADING_PHRASES).toContain('Ищу по Трансфере…');
      expect(LOADING_PHRASES).toContain('Анализирую данные…');

      // Ни одна фраза не обещает конкретной операции с данными —
      // иначе она начнёт врать на половине вопросов.
      const targeted = /договор|тариф|объ[её]м|стоимост|счёт|киловатт/i;
      LOADING_PHRASES.forEach((phrase) => expect(phrase).not.toMatch(targeted));
    });

    it('идёт по порядку и не откатывается к началу', () => {
      const total = LOADING_PHRASES.length;
      let index = 0;

      for (let step = 1; step < total; step += 1) {
        index = nextPhraseIndex(index, total, TAIL_SIZE);
        expect(index).toBe(step);
      }

      // Сценарий доигран — дальше крутится только хвост.
      index = nextPhraseIndex(index, total, TAIL_SIZE);
      expect(index).toBe(total - TAIL_SIZE);
      expect(nextPhraseIndex(index, total, TAIL_SIZE)).toBe(total - 1);
    });

    it('за 20 переключений ни одна фраза не выпадает дважды подряд', () => {
      let index = 0;

      for (let step = 0; step < 20; step += 1) {
        const next = nextPhraseIndex(index, LOADING_PHRASES.length, TAIL_SIZE);
        expect(next).not.toBe(index);
        expect(LOADING_PHRASES[next]).toBeDefined();
        index = next;
      }
    });

    it('устойчив к списку из одной фразы и к слишком большому хвосту', () => {
      expect(nextPhraseIndex(3, 1)).toBe(0);
      expect(nextPhraseIndex(7, 8, 99)).toBe(0);
    });

    it('меняет подпись по таймеру', () => {
      jest.useFakeTimers();
      const wrapper = mount(TokLoader);

      expect(wrapper.text()).toBe(LOADING_PHRASES[0]);

      jest.advanceTimersByTime(PHRASE_INTERVAL_MS);
      expect(wrapper.vm.phrase).not.toBe(LOADING_PHRASES[0]);

      wrapper.destroy();
      jest.useRealTimers();
    });

    it('снимает таймер при уничтожении — «залипшего» интервала не остаётся', () => {
      jest.useFakeTimers();
      const wrapper = mount(TokLoader);
      wrapper.destroy();

      expect(jest.getTimerCount()).toBe(0);
      jest.useRealTimers();
    });
  });

  describe('вращение', () => {
    it('идёт вокруг вертикальной оси', () => {
      expect(LOADER_SOURCE).toMatch(/transform: rotateY\(0deg\)/);
      expect(LOADER_SOURCE).toMatch(/transform: rotateY\(360deg\)/);
      // Без перспективы поворот выродился бы в сжатие по ширине.
      expect(LOADER_SOURCE).toMatch(/perspective:/);
    });

    it('другой оси вращения в папке Тока нет', () => {
      const sources = walk(TOK_DIR).filter((file) => /\.(vue|scss)$/.test(file));
      const offenders = sources.filter((file) =>
        /rotateX\(|rotateZ\(|animation: tok-spin-z/.test(fs.readFileSync(file, 'utf8')),
      );

      expect(offenders).toEqual([]);
    });

    it('останавливается при prefers-reduced-motion, а смена текста остаётся', () => {
      const reduced = LOADER_SOURCE.slice(LOADER_SOURCE.indexOf('prefers-reduced-motion'));

      expect(reduced).toContain('.tok-loader__mark');
      expect(reduced).toContain('animation: none;');
      // Таймер смены фразы живёт в JS и настройкой ОС не выключается.
      expect(LOADER_SOURCE).toContain('setInterval');
    });
  });

  describe('в ленте', () => {
    it('появляется на время запроса и исчезает при ответе', async () => {
      const api = createControlledApi();
      const store = createTokStore({ api });
      const wrapper = mountPanel({ api, store });

      store.dispatch('conversation/send', 'вопрос');
      await flush();
      expect(wrapper.find('.tok-loader').exists()).toBe(true);

      await api.respond({
        reply: { kind: REPLY_KIND.SUCCESS, text: 'ответ' },
        workflow: { status: WORKFLOW_STATUS.COMPLETED },
        contents: [],
      });

      expect(wrapper.find('.tok-loader').exists()).toBe(false);

      wrapper.destroy();
    });

    it('исчезает и при ошибке — без «залипания»', async () => {
      const api = createControlledApi();
      const store = createTokStore({ api });
      const wrapper = mountPanel({ api, store });

      store.dispatch('conversation/send', 'вопрос');
      await flush();
      expect(wrapper.find('.tok-loader').exists()).toBe(true);

      await api.fail({ request: {} });

      expect(wrapper.find('.tok-loader').exists()).toBe(false);

      wrapper.destroy();
    });
  });
});
