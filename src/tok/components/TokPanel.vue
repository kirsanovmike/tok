<template>
  <div class="tok-shell">
    <transition name="tok-overlay">
      <!--
        Оверлей — брат панели, а не её родитель: клик внутри панели до него не всплывает,
        и не нужен ни один `@click.stop`.
      -->
      <div
        v-if="open"
        class="tok-overlay"
        data-tok-overlay
        aria-hidden="true"
        @click="$emit('close')"
      />
    </transition>

    <transition name="tok-panel">
      <aside
        v-if="open"
        ref="panel"
        class="tok-panel"
        data-tok-panel
        role="dialog"
        aria-modal="true"
        aria-label="Ток — ассистент Трансферы"
      >
        <header class="tok-panel__header">
          <TokLogo :width="60" :height="21" />

          <div class="tok-panel__header-actions">
            <button
              v-if="!isEmpty"
              type="button"
              class="tok-panel__icon-button"
              aria-label="Очистить беседу"
              :aria-expanded="String(confirmingReset)"
              @click="askReset"
            >
              <TokIcon name="trash" :size="20" />
            </button>

            <button
              type="button"
              class="tok-panel__icon-button"
              aria-label="Закрыть ассистента"
              @click="$emit('close')"
            >
              <TokIcon name="close" :size="22" />
            </button>
          </div>
        </header>

        <!--
          Подтверждение очистки — полосой в самой панели, а не системным `confirm()`:
          модальное окно браузера блокирует страницу хоста, выглядит чужеродно
          и в некоторых окружениях подавляется вовсе.
        -->
        <div
          v-if="confirmingReset"
          class="tok-panel__confirm"
          role="alertdialog"
          aria-label="Очистить беседу?"
        >
          <p class="tok-panel__confirm-text">
            Очистить беседу? Переписка удалится и из этого окна, и из памяти браузера.
          </p>

          <div class="tok-panel__confirm-actions">
            <button
              ref="confirmReset"
              type="button"
              class="tok-button tok-button--primary"
              @click="confirmReset"
            >
              Очистить
            </button>
            <button type="button" class="tok-button" @click="cancelReset">Отмена</button>
          </div>
        </div>

        <div class="tok-panel__body">
          <TokEmptyState v-if="isEmpty" @pick="pickSuggestion" />

          <TokMessageList
            v-else
            :messages="conversation.messages"
            :sending="conversation.sending"
            :show-source="config.showSource"
            @confirm="answerConfirmation(true)"
            @decline="answerConfirmation(false)"
          />
        </div>

        <footer class="tok-panel__footer">
          <TokComposer
            ref="composer"
            :blocked="isInputBlocked"
            :blocked-reason="blockedReason"
            :disabled="conversation.sending"
            :voice-enabled="config.voiceEnabled"
            @send="send"
          />
        </footer>
      </aside>
    </transition>
  </div>
</template>

<script>
import TokLogo from './icons/TokLogo.vue';
import TokIcon from './icons/TokIcon.vue';
import TokEmptyState from './TokEmptyState.vue';
import TokMessageList from './TokMessageList.vue';
import TokComposer from './TokComposer.vue';
import tokStoreMixin from '../mixins/tokStore';
import { createFocusTrap } from '../utils/focusTrap';
import { lockPageScroll, unlockPageScroll } from '../utils/scrollLock';

const BLOCKED_REASON =
  'По этому запросу нет доступа к данным. Начните новую беседу, чтобы задать другой вопрос.';

export default {
  name: 'TokPanel',

  components: { TokLogo, TokIcon, TokEmptyState, TokMessageList, TokComposer },

  mixins: [tokStoreMixin],

  props: {
    open: {
      type: Boolean,
      default: false,
    },
    config: {
      type: Object,
      required: true,
    },
  },

  data() {
    return { blockedReason: BLOCKED_REASON, confirmingReset: false };
  },

  computed: {
    isEmpty() {
      return this.tokGetter('isEmpty');
    },

    isInputBlocked() {
      return this.tokGetter('isInputBlocked');
    },
  },

  watch: {
    open(isOpen) {
      return isOpen ? this.onOpen() : this.onClose();
    },
  },

  created() {
    // Не в `data`: ловушка держит ссылку на DOM, реактивность ей не нужна и вредна.
    this.trap = createFocusTrap(() => this.$refs.panel);
  },

  mounted() {
    // Хост вправе смонтировать панель уже открытой — тогда watcher не сработает.
    if (this.open) this.onOpen();
  },

  beforeDestroy() {
    // Панель может быть уничтожена открытой (уход со страницы хоста) —
    // страница не должна остаться с заблокированным скроллом.
    if (this.open) {
      unlockPageScroll();
      document.removeEventListener('keydown', this.onKeydown);
    }
  },

  methods: {
    onOpen() {
      lockPageScroll();
      document.addEventListener('keydown', this.onKeydown);
      this.trap.activate();
      this.$nextTick(() => {
        if (this.$refs.composer) this.$refs.composer.focus();
      });
    },

    onClose() {
      unlockPageScroll();
      document.removeEventListener('keydown', this.onKeydown);
      // Возврат фокуса — после перерисовки: точка входа к этому моменту снова видима.
      this.$nextTick(() => this.trap.deactivate());
    },

    onKeydown(event) {
      if (event.key !== 'Escape' && event.key !== 'Esc') return;
      event.stopPropagation();

      // Esc при открытом подтверждении отменяет именно его: закрыть панель заодно
      // с вопросом «вы уверены?» — значит ответить за пользователя.
      if (this.confirmingReset) {
        this.cancelReset();
        return;
      }

      this.$emit('close');
    },

    pickSuggestion(text) {
      // Чип не отправляет вопрос, а подставляет его в композер: пользователь
      // может дополнить формулировку до отправки.
      if (this.$refs.composer) this.$refs.composer.setText(text);
    },

    send(text) {
      this.tokDispatch('send', text);
    },

    answerConfirmation(confirmed) {
      this.tokDispatch('answerConfirmation', confirmed);
    },

    askReset() {
      // Повторное нажатие по корзине закрывает вопрос — кнопка работает как тумблер.
      this.confirmingReset = !this.confirmingReset;
      if (!this.confirmingReset) return;

      this.$nextTick(() => {
        if (this.$refs.confirmReset) this.$refs.confirmReset.focus();
      });
    },

    cancelReset() {
      this.confirmingReset = false;
      this.$nextTick(() => {
        if (this.$refs.composer) this.$refs.composer.focus();
      });
    },

    confirmReset() {
      this.confirmingReset = false;
      this.tokDispatch('reset');
      this.$nextTick(() => {
        if (this.$refs.composer) this.$refs.composer.focus();
      });
    },
  },
};
</script>

<style lang="scss">
.tok-overlay {
  position: fixed;
  inset: 0;
  z-index: $tok-z-overlay;
  // Прозрачность задаётся `opacity`, а не rgba: alpha-канал в токены темы
  // не положить — парсер Vuetify 2 понимает только 6-значный hex.
  background-color: tok-color(overlay);
  opacity: 0.45;
}

.tok-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: $tok-z-panel;
  display: flex;
  flex-direction: column;
  width: 480px;
  max-width: 100vw;
  background-color: tok-color(surface);
  // «Шторка»: скруглены только левые углы, правый край строго прямой.
  border-radius: $tok-panel-radius 0 0 $tok-panel-radius;
  box-shadow: -12px 0 48px tok-color(shadow);

  &__header {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    padding: $tok-space-lg $tok-space-lg $tok-space-md;
  }

  &__header-actions {
    display: flex;
    align-items: center;
    gap: $tok-space-xs;
  }

  &__icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    background: none;
    border: 0;
    border-radius: 50%;
    cursor: pointer;

    @include tok-button-color(text-muted);

    &:hover {
      color: tok-color(text);
      background-color: tok-color(surface-muted);
    }

    &:focus-visible {
      outline: 2px solid tok-color(accent);
      outline-offset: 2px;
    }
  }

  &__confirm {
    display: flex;
    flex: none;
    flex-wrap: wrap;
    gap: $tok-space-sm;
    align-items: center;
    justify-content: space-between;
    margin: 0 $tok-space-lg $tok-space-md;
    padding: $tok-space-md;
    background-color: tok-color(surface-muted);
    border-radius: $tok-radius-md;
  }

  &__confirm-text {
    margin: 0;
    color: tok-color(text);
    font-size: 14px;
    line-height: 1.4;
  }

  &__confirm-actions {
    display: flex;
    gap: $tok-space-sm;
    margin-left: auto;
  }

  &__body {
    flex: 1 1 auto;
    min-height: 0;
    padding: 0 $tok-space-lg;
    overflow: hidden;
  }

  &__footer {
    flex: none;
    padding: $tok-space-md $tok-space-lg $tok-space-lg;
  }
}

// Ширины по постановке. Правый край прижат к viewport на всех.
@media (max-width: 959px) {
  .tok-panel {
    width: 60vw;
    min-width: 420px;
  }
}

@media (max-width: 599px) {
  .tok-panel {
    width: 100vw;
    min-width: 0;
    // На всю ширину скруглять нечего: слева тоже край экрана.
    border-radius: 0;
  }
}

.tok-panel-enter-active,
.tok-panel-leave-active {
  transition: transform $tok-duration-panel $tok-easing-panel;
}

.tok-panel-enter,
.tok-panel-leave-to {
  transform: translateX(100%);
}

.tok-overlay-enter-active,
.tok-overlay-leave-active {
  transition: opacity $tok-duration-panel linear;
}

.tok-overlay-enter,
.tok-overlay-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .tok-panel-enter-active,
  .tok-panel-leave-active,
  .tok-overlay-enter-active,
  .tok-overlay-leave-active {
    transition: none;
  }

  .tok-panel-enter,
  .tok-panel-leave-to {
    transform: none;
  }
}
</style>
