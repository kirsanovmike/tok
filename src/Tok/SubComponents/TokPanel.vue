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
            <TokConfirmMenu
              v-if="!isEmpty"
              ref="resetMenu"
              :open="confirmingReset"
              text="Очистить беседу?"
              @confirm="confirmReset"
              @cancel="cancelReset"
            >
              <button
                slot="trigger"
                type="button"
                class="tok-panel__icon-button"
                aria-label="Очистить беседу"
                :aria-expanded="String(confirmingReset)"
                @click="askReset"
              >
                <TokIcon name="trash" :size="20" />
              </button>
            </TokConfirmMenu>

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
/**
 * Шторка Тока: оверлей, шапка, лента переписки и композер.
 *
 * Панель — модальное окно: пока она открыта, скролл страницы хоста заблокирован,
 * фокус заперт внутри, а Esc закрывает. Собственного состояния у неё почти нет —
 * беседа живёт в сторе Тока (`services/store`), панель только отражает её.
 *
 * Автор: Кирсанов Михаил
 * @displayName Tok Panel
 * @event close — панель просят закрыть (крестик, Esc, клик по оверлею)
 */

// services
import tokStoreMixin from '../services/tokStore';
import { createFocusTrap } from '../services/utils/focusTrap';
import { lockPageScroll, unlockPageScroll } from '../services/utils/scrollLock';
// components
import TokLogo from './TokLogo.vue';
import TokIcon from './TokIcon.vue';
import TokConfirmMenu from './TokConfirmMenu.vue';
import TokEmptyState from './TokEmptyState.vue';
import TokMessageList from './TokMessageList.vue';
import TokComposer from './TokComposer.vue';

/** Пояснение под заблокированным вводом: ответ `forbidden` закрывает беседу. */
const BLOCKED_REASON =
  'По этому запросу нет доступа к данным. Начните новую беседу, чтобы задать другой вопрос.';

export default {
  name: 'TokPanel',

  components: { TokLogo, TokIcon, TokConfirmMenu, TokEmptyState, TokMessageList, TokComposer },

  mixins: [tokStoreMixin],

  props: {
    /* Открыта ли шторка. Состоянием владеет родительский компонент. */
    open: {
      type: Boolean,
      default: false,
    },
    /* Конфигурация Тока: нужна композеру (голос) и блокам ответа. */
    config: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      /* Пояснение под заблокированным вводом. */
      blockedReason: BLOCKED_REASON,
      /* Открыт ли вопрос «Очистить беседу?» под корзиной. */
      confirmingReset: false,
    };
  },

  computed: {
    /* В беседе нет ни одного сообщения — показывается пустой экран. */
    isEmpty() {
      return this.tokGetter('isEmpty');
    },

    /* Ввод закрыт: беседа упёрлась в ответ `forbidden`. */
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
    /** Открытие: замок скролла, ловушка фокуса, курсор в поле ввода. */
    onOpen() {
      lockPageScroll();
      document.addEventListener('keydown', this.onKeydown);
      this.trap.activate();
      this.$nextTick(() => {
        if (this.$refs.composer) this.$refs.composer.focus();
      });
    },

    /** Закрытие: снять замок и вернуть фокус на точку входа. */
    onClose() {
      unlockPageScroll();
      document.removeEventListener('keydown', this.onKeydown);
      // Возврат фокуса — после перерисовки: точка входа к этому моменту снова видима.
      this.$nextTick(() => this.trap.deactivate());
    },

    /** Esc: сначала снимает вопрос подтверждения, и только потом закрывает панель. */
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

    /** Чип-подсказка: подставить вопрос в композер, не отправляя. */
    pickSuggestion(text) {
      // Чип не отправляет вопрос, а подставляет его в композер: пользователь
      // может дополнить формулировку до отправки.
      if (this.$refs.composer) this.$refs.composer.setText(text);
    },

    /** Отправить вопрос в стор беседы. */
    send(text) {
      this.tokDispatch('send', text);
    },

    /** Ответить на шаг подтверждения: подтвердить или отказаться. */
    answerConfirmation(confirmed) {
      this.tokDispatch('answerConfirmation', confirmed);
    },

    /** Корзина: открыть или закрыть вопрос об очистке беседы. */
    askReset() {
      // Повторное нажатие по корзине закрывает вопрос — кнопка работает как тумблер.
      this.confirmingReset = !this.confirmingReset;
      if (!this.confirmingReset) return;

      this.$nextTick(() => {
        if (this.$refs.resetMenu) this.$refs.resetMenu.focus();
      });
    },

    /** Отказ от очистки. */
    cancelReset() {
      this.confirmingReset = false;
      this.$nextTick(() => {
        if (this.$refs.composer) this.$refs.composer.focus();
      });
    },

    /** Очистить беседу — и в окне, и в памяти браузера. */
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
  // 0.16 вместо 0.28: затемнение обязано отделить панель от страницы, но не
  // гасить дашборд, ради которого вопрос и задают.
  background-color: tok-color(overlay);
  opacity: 0.16;
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
  box-shadow: -4px 0 28px tok-color(shadow);

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

  &__body {
    flex: 1 1 auto;
    min-height: 0;
    // Отступов нет намеренно: прокручивается не тело панели, а лента внутри него,
    // и полоса прокрутки рисуется по правому краю **прокручиваемого** элемента.
    // При отступе здесь полоса висела бы в 24px от края панели (пункт 2
    // постановки «Доработки 3»). Горизонтальные отступы держат сами дети.
    padding: 0;
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
