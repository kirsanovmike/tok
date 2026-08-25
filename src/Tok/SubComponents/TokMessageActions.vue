<template>
  <div class="tok-actions">
    <button
      type="button"
      class="tok-actions__button"
      :aria-label="copied ? 'Скопировано' : 'Скопировать ответ'"
      @click="copy"
    >
      <TokIcon :name="copied ? 'check' : 'copy'" :size="18" />
    </button>

    <!--
      «Источник» по постановке скрыт, но реализован: бэк ещё не отдаёт ссылки
      (`source` помечен как неопределённый в `docs/api structure.txt`).
      Включается одним флагом конфигурации `showSource`.
    -->
    <button
      v-if="showSource"
      type="button"
      class="tok-actions__button tok-actions__button--source"
      aria-label="Показать источник"
      @click="$emit('source')"
    >
      Источник
      <TokIcon name="source" :size="16" />
    </button>

    <transition name="tok-fade">
      <span v-if="copied" class="tok-actions__hint" role="status">Скопировано</span>
    </transition>
  </div>
</template>

<script>
/**
 * Строка действий под ответом: копирование и (по флагу) источник.
 *
 * Автор: Кирсанов Михаил
 * @displayName Tok Message Actions
 * @event copied — текст ответа лёг в буфер обмена
 * @event source — запрошен источник ответа
 */

// services
import { copyText } from '../services/utils/clipboard';
// components
import TokIcon from './TokIcon.vue';

/** Сколько держится подпись «Скопировано» после удачного копирования. */
const HINT_MS = 2000;

export default {
  name: 'TokMessageActions',

  components: { TokIcon },

  props: {
    /* Текст, который уходит в буфер обмена. */
    text: {
      type: String,
      default: '',
    },
    /* Показывать ли кнопку «Источник» (по постановке скрыта). */
    showSource: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      /* Показывается ли сейчас подтверждение «Скопировано». */
      copied: false,
      /* Таймер снятия этой подписи. */
      timer: null,
    };
  },

  beforeDestroy() {
    clearTimeout(this.timer);
  },

  methods: {
    /** Скопировать текст ответа и на пару секунд показать подтверждение. */
    copy() {
      copyText(this.text).then((ok) => {
        if (!ok) return;
        this.copied = true;
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.copied = false;
        }, HINT_MS);
        this.$emit('copied');
      });
    },
  },
};
</script>

<style lang="scss">
.tok-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;

  &__button {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px;
    font-size: 13px;
    background: none;
    border: 0;
    border-radius: 12px;
    cursor: pointer;

    // `.tok-root` поднимает специфичность над сбросом `button { color: inherit }`
    // у Vuetify и normalize: без него кнопка красится в цвет родителя.
    .tok-root & {
      color: var(--v-tok-text-muted);
    }

    &:hover {
      color: var(--v-tok-accent);
      background-color: var(--v-tok-surface-muted);
    }

    &:focus-visible {
      outline: 2px solid var(--v-tok-accent);
      outline-offset: 2px;
    }

    &--source {
      padding: 6px 8px;
      background-color: var(--v-tok-surface-muted);
    }
  }

  &__hint {
    color: var(--v-tok-text-muted);
    font-size: 13px;
  }
}

.tok-fade-enter-active,
.tok-fade-leave-active {
  transition: opacity 160ms linear;
}

.tok-fade-enter,
.tok-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .tok-fade-enter-active,
  .tok-fade-leave-active {
    transition: none;
  }
}
</style>
