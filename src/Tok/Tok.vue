<template>
  <!--
    MountingPortal сам создаёт цель для портала в <body> и переносит туда содержимое,
    поэтому панель Тока не зависит от `overflow`, `transform` и `z-index` того места
    вёрстки хоста, куда вставлен <Tok />.
  -->
  <MountingPortal mount-to="body" append>
    <div class="tok-root" data-tok-root>
      <TokEntryButton ref="entry" :hidden="open" :expanded="open" @open="openPanel" />

      <TokPanel :open="open" :config="tokConfig" @close="closePanel" />
    </div>
  </MountingPortal>
</template>

<script>
/**
 * Ток — ИИ-ассистент Трансферы. Родительский компонент: точка входа и шторка.
 *
 * Единственное, что хост вставляет в свою разметку. Собирает конфигурацию,
 * транспорт, стор беседы и голосовой конвейер и раздаёт их вниз через `provide`;
 * сам хранит только одно — открыта ли панель.
 * Ставить хосту нечего: `portal-vue` подключён локальной регистрацией, тема
 * приходит переменными `--v-tok-*` из `@tne-ui/core` (ADR-0009).
 *
 * Автор: Кирсанов Михаил
 * @displayName Tok
 * @event open — панель открыли
 * @event close — панель закрыли
 */

// Именованный экспорт, а не плагин: `MountingPortal` ссылается на `Portal`
// и `PortalTarget` напрямую, поэтому глобальная регистрация ему не нужна.
// Хост подключает Ток одним импортом компонента — устанавливать нечего.
import { MountingPortal } from 'portal-vue';

// services
import {
  createTokConfig,
  createAssistantApi,
  createTranscriptionApi,
  createTokStore,
  createConversationStorage,
  encodeToMp3,
  TOK_STORE_KEY,
} from './services';
// components
import TokEntryButton from './SubComponents/TokEntryButton.vue';
import TokPanel from './SubComponents/TokPanel.vue';

export default {
  name: 'Tok',

  components: { MountingPortal, TokEntryButton, TokPanel },

  provide() {
    // Конфигурация раздаётся тем же способом, что и стор: глубоко внутри ленты
    // (блок графика) она нужна, а тащить её пропом через четыре уровня — нет.
    return {
      [TOK_STORE_KEY]: this.tokStore,
      tokConfig: this.tokConfig,
      tokVoice: this.tokVoice,
    };
  },

  props: {
    /**
     * Конфигурация Тока: адрес сервиса, провайдер токена, флаги.
     * Читается один раз при создании компонента — менять её на лету незачем,
     * а пересоздавать транспорт и стор на каждое изменение пропа вредно.
     */
    config: {
      type: Object,
      default: null,
    },
  },

  data() {
    return {
      /* Открыта ли шторка. Единственное состояние, которым владеет корень. */
      open: false,
    };
  },

  // Стор и транспорт создаются здесь, а не в `created`: `provide()` вызывается
  // между `beforeCreate` и `created`, и к этому моменту стор уже должен существовать.
  // Пропсы ещё не инициализированы, поэтому конфигурация берётся из `propsData`.
  beforeCreate() {
    const propsData = this.$options.propsData || {};
    this.tokConfig = createTokConfig(propsData.config);
    this.api = createAssistantApi(this.tokConfig);

    // Хранилище создаётся до стора: модуль беседы поднимает из него историю
    // прямо в начальное состояние.
    this.tokStorage = this.tokConfig.persistHistory
      ? createConversationStorage({ namespace: this.tokConfig.storageNamespace })
      : null;
    this.tokStore = createTokStore({ api: this.api, storage: this.tokStorage });

    // Голосовой конвейер собирается здесь целиком, чтобы композер получил его
    // готовым: сам он не должен знать ни про ffmpeg, ни про адрес расшифровки.
    this.tokVoice = {
      transcription: createTranscriptionApi(this.tokConfig),
      encode: (blob) => encodeToMp3(blob, { baseUrl: this.tokConfig.ffmpegBaseUrl }),
    };
  },

  methods: {
    /** Открыть панель. */
    openPanel() {
      this.open = true;
      this.$emit('open');
    },

    /** Закрыть панель. */
    closePanel() {
      this.open = false;
      this.$emit('close');
    },

    /** Переключить панель — для хоста, если он вешает Ток на свою кнопку. */
    toggle() {
      if (this.open) this.closePanel();
      else this.openPanel();
    },
  },
};
</script>

<style lang="scss">
.tok-root {
  position: relative;
  z-index: 201;
  color: var(--v-tok-text);
  font-family: inherit;
}
</style>
