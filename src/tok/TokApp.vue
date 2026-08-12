<template>
  <!--
    MountingPortal сам создаёт цель для портала в <body> и переносит туда содержимое,
    поэтому панель Тока не зависит от `overflow`, `transform` и `z-index` того места
    вёрстки хоста, куда вставлен <TokApp />.
  -->
  <MountingPortal mount-to="body" append>
    <div class="tok-root" data-tok-root>
      <TokEntryButton ref="entry" :hidden="open" :expanded="open" @open="openPanel" />

      <TokPanel :open="open" :config="tokConfig" @close="closePanel" />
    </div>
  </MountingPortal>
</template>

<script>
import TokEntryButton from './components/TokEntryButton.vue';
import TokPanel from './components/TokPanel.vue';
import { createTokConfig } from './config';
import { createAssistantApi, createTranscriptionApi } from './api';
import { createTokStore, createConversationStorage, TOK_STORE_KEY } from './store';
import { encodeToMp3 } from './voice/encodeToMp3';

export default {
  name: 'TokApp',

  components: { TokEntryButton, TokPanel },

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
    return { open: false };
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
    openPanel() {
      this.open = true;
      this.$emit('open');
    },

    closePanel() {
      this.open = false;
      this.$emit('close');
    },

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
  z-index: $tok-z-panel;
  color: tok-color(text);
  font-family: inherit;
}
</style>
