<template>
  <form class="tok-composer" :class="{ 'tok-composer--blocked': blocked }" @submit.prevent="submit">
    <p v-if="blocked" class="tok-composer__notice">{{ blockedReason }}</p>
    <p v-else-if="voiceError" class="tok-composer__notice tok-composer__notice--error" role="alert">
      {{ voiceError }}
    </p>

    <!--
      Состояние записи по `В процессе набора аудио.png`: строка ввода уступает место
      полосе с отменой слева и остановкой справа. Именно уступает, а не дополняется:
      печатать во время записи всё равно некуда.
    -->
    <div v-if="isVoiceActive" class="tok-composer__field tok-composer__field--voice">
      <button
        type="button"
        class="tok-composer__voice-cancel"
        aria-label="Отменить запись"
        @click="cancelVoice"
      >
        <TokIcon name="clear" :size="26" />
      </button>

      <p class="tok-composer__voice-status" role="status" aria-live="polite">
        <span v-if="isRecording" class="tok-composer__pulse" aria-hidden="true" />
        {{ voiceStatus }}
      </p>

      <button
        type="button"
        class="tok-composer__voice-stop"
        :disabled="!isRecording"
        aria-label="Остановить запись и расшифровать"
        @click="stopVoice"
      >
        <TokIcon name="stop" :size="20" />
      </button>
    </div>

    <div v-else class="tok-composer__field">
      <button
        v-if="value && !blocked"
        type="button"
        class="tok-composer__clear"
        aria-label="Очистить поле ввода"
        @click="clear"
      >
        <TokIcon name="clear" :size="22" />
      </button>

      <!--
        Именно `<textarea rows="1">`, а не `<input>`: Shift+Enter должен переносить
        строку, а поле — расти до потолка и дальше прокручиваться внутри себя.
        `.exact` на Enter обязателен, иначе Shift+Enter улетал бы отправкой.
      -->
      <textarea
        ref="input"
        v-model="value"
        rows="1"
        class="tok-composer__input"
        :placeholder="placeholder"
        :disabled="blocked"
        :aria-label="placeholder"
        autocomplete="off"
        @keydown.enter.exact.prevent="submit"
      />

      <button
        type="button"
        class="tok-composer__mic"
        :disabled="!voiceAvailable || blocked"
        aria-label="Голосовой ввод"
        @click="startVoice"
      >
        <TokIcon name="mic" :size="20" />
      </button>

      <transition name="tok-fade">
        <button
          v-if="canSend"
          type="submit"
          class="tok-composer__send"
          aria-label="Отправить вопрос"
        >
          <TokIcon name="send" :size="20" />
        </button>
      </transition>
    </div>
  </form>
</template>

<script>
import TokIcon from './icons/TokIcon.vue';
import { createVoiceSession, VOICE_STATE } from '../voice/session';
import { describeVoiceError, isVoiceSupported } from '../voice/recorder';
import { isScrollable, nextTextareaHeight } from '../utils/autoGrow';

const TICK_MS = 1000;

function formatElapsed(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export default {
  name: 'TokComposer',

  components: { TokIcon },

  inject: {
    // Микрофон, кодировщик и клиент расшифровки приходят сверху: так их можно
    // подменить в тестах, не трогая ни глобальный `navigator`, ни wasm.
    tokVoice: { default: () => null },
  },

  props: {
    placeholder: {
      type: String,
      default: 'Задайте свой вопрос',
    },
    // Ввод заблокирован при `workflow.status: forbidden`.
    blocked: {
      type: Boolean,
      default: false,
    },
    blockedReason: {
      type: String,
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    voiceEnabled: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      value: '',
      voiceState: VOICE_STATE.IDLE,
      voiceError: '',
      elapsed: 0,
    };
  },

  computed: {
    canSend() {
      // Строка из одних пробелов вопросом не является.
      return this.value.trim().length > 0 && !this.blocked && !this.disabled;
    },

    /**
     * Голос доступен, когда его не выключил хост, конвейер собран и браузер умеет
     * записывать звук. Кнопка при этом остаётся на месте — исчезающий микрофон
     * читался бы как поломка вёрстки.
     *
     * Подменённый рекордер (тесты) снимает требование к браузеру: настоящий
     * `MediaRecorder` в этом случае не нужен.
     */
    voiceAvailable() {
      if (!this.voiceEnabled || !this.tokVoice) return false;
      return Boolean(this.tokVoice.recorder) || isVoiceSupported();
    },

    isRecording() {
      return this.voiceState === VOICE_STATE.RECORDING;
    },

    isVoiceActive() {
      return this.voiceState !== VOICE_STATE.IDLE;
    },

    voiceStatus() {
      return this.isRecording ? `Идёт запись · ${formatElapsed(this.elapsed)}` : 'Расшифровываю…';
    },
  },

  watch: {
    // Высота пересчитывается на любое изменение текста, а не только на `@input`:
    // вопрос приходит и из чипа-подсказки, и из расшифровки голоса.
    value() {
      this.$nextTick(this.resize);
    },
  },

  mounted() {
    this.resize();
  },

  beforeDestroy() {
    // Панель могли закрыть прямо во время записи — микрофон обязан погаснуть.
    this.stopTimer();
    if (this.session) this.session.cancel();
  },

  methods: {
    focus() {
      if (this.$refs.input) this.$refs.input.focus();
    },

    /**
     * Поле растёт под содержимое до потолка, дальше прокручивается внутри себя.
     *
     * `height: auto` перед измерением обязателен: `scrollHeight` у элемента с уже
     * заданной высотой никогда не станет меньше неё, и поле, однажды выросшее,
     * не ужалось бы обратно после отправки.
     */
    resize() {
      const field = this.$refs.input;
      if (!field) return;

      field.style.height = 'auto';
      field.style.height = `${nextTextareaHeight(field.scrollHeight)}px`;
      field.style.overflowY = isScrollable(field.scrollHeight) ? 'auto' : 'hidden';
    },

    setText(text) {
      this.value = text;
      this.focus();
    },

    clear() {
      this.value = '';
      this.focus();
    },

    submit() {
      if (!this.canSend) return;
      this.$emit('send', this.value.trim());
      this.value = '';
      this.$nextTick(this.resize);
    },

    startTimer() {
      this.elapsed = 0;
      this.stopTimer();
      this.timer = setInterval(() => {
        this.elapsed += 1;
      }, TICK_MS);
    },

    stopTimer() {
      clearInterval(this.timer);
      this.timer = null;
    },

    startVoice() {
      if (!this.voiceAvailable || this.blocked || this.isVoiceActive) return;

      this.voiceError = '';

      // Сессия одноразовая: у каждой записи свой микрофон и свой запрос.
      this.session = createVoiceSession(this.tokVoice);

      this.session
        .start()
        .then(() => {
          this.voiceState = VOICE_STATE.RECORDING;
          this.startTimer();
        })
        .catch((error) => {
          // Отказ в доступе не должен оставить интерфейс в состоянии записи.
          this.resetVoice();
          this.voiceError = describeVoiceError(error);
        });
    },

    stopVoice() {
      if (!this.isRecording || !this.session) return;

      this.stopTimer();

      this.session
        .stop((state) => {
          this.voiceState = state;
        })
        .then((text) => {
          const wasCancelled = this.session && this.session.isCancelled();
          this.resetVoice();
          // Отменённую запись в поле не подставляем — там мог остаться свой текст.
          if (!wasCancelled && text) this.setText(text);
        })
        .catch((error) => {
          const wasCancelled = this.session && this.session.isCancelled();
          this.resetVoice();
          if (!wasCancelled) this.voiceError = describeVoiceError(error);
        });
    },

    cancelVoice() {
      if (this.session) this.session.cancel();
      this.resetVoice();
      this.focus();
    },

    resetVoice() {
      this.stopTimer();
      this.voiceState = VOICE_STATE.IDLE;
      this.elapsed = 0;
      this.session = null;
    },
  },
};
</script>

<style lang="scss">
.tok-composer {
  &__notice {
    margin: 0 0 $tok-space-sm;
    color: tok-color(text-muted);
    font-size: 13px;
    line-height: 1.4;

    &--error {
      color: tok-color(danger);
    }
  }

  &__field {
    display: flex;
    // По нижнему краю: поле растёт вверх, кнопки не уезжают к его середине.
    align-items: flex-end;
    gap: $tok-space-sm;
    padding: 6px 6px 6px $tok-space-md;
    background-color: tok-color(surface);
    border: 1px solid tok-color(border);
    border-radius: 28px;

    // Фокус приходит на текстовое поле, а видимая «таблетка» — это контейнер вокруг
    // него. Поэтому индикатор рисуется на родителе: обводка вокруг голого текстового
    // бокса шла бы прямоугольником внутри скруглённого поля.
    // `:focus-within`, а не `:focus-visible`: у поля ввода фокус с клавиатуры и мышью
    // равнозначен, и в обоих случаях человек должен видеть, куда печатает.
    //
    // Индикатор намеренно тихий: акцентная рамка в 1px (4,73:1 на белом — выше
    // требуемых WCAG 1.4.11 3:1 для нетекстовых элементов) плюс мягкое кольцо
    // `accent-soft`. Прежний `outline: 2px solid accent` поверх той же рамки был
    // единственной кричащей деталью на всей панели.
    &:focus-within {
      border-color: tok-color(accent);
      box-shadow: 0 0 0 3px tok-color(accent-soft);
    }

    &--voice {
      padding-left: 6px;
    }
  }

  &--blocked &__field {
    background-color: tok-color(surface-muted);
  }

  &__input {
    flex: 1 1 auto;
    min-width: 0;
    // База — одна строка (см. COMPOSER_MIN_HEIGHT в utils/autoGrow.js).
    // Высота ниже переопределяется инлайном из `resize()`; здесь она нужна, чтобы
    // поле не мигало полной высотой до первого измерения.
    height: 32px;
    max-height: 128px;
    padding: 6px 0;
    overflow-y: hidden;
    color: tok-color(text);
    font-family: inherit;
    font-size: 15px;
    line-height: 20px;
    background: none;
    border: 0;
    outline: none;
    // Ручку изменения размера убираем: высотой управляет `resize()`.
    resize: none;

    &::placeholder {
      color: tok-color(text-muted);
    }
  }

  &__clear,
  &__mic {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: none;
    border: 0;
    border-radius: 50%;
    cursor: pointer;

    @include tok-button-color(text-muted);

    &:disabled {
      opacity: 0.5;
      cursor: default;
    }

    &:focus-visible {
      outline: 2px solid tok-color(accent);
      outline-offset: 2px;
    }
  }

  &__clear {
    order: -1;
    margin-left: -8px;
  }

  &__send {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background-color: tok-color(accent);
    border: 0;
    border-radius: 50%;
    cursor: pointer;

    @include tok-button-color(text-inverse);

    &:focus-visible {
      outline: 2px solid tok-color(accent);
      outline-offset: 2px;
    }
  }

  // Полоса записи: отмена слева, остановка справа — как в макете.
  &__voice-cancel {
    display: flex;
    flex: none;
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

    &:focus-visible {
      outline: 2px solid tok-color(accent);
      outline-offset: 2px;
    }
  }

  &__voice-status {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    gap: $tok-space-sm;
    min-width: 0;
    margin: 0;
    color: tok-color(text-muted);
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }

  &__pulse {
    flex: none;
    width: 8px;
    height: 8px;
    background-color: tok-color(danger);
    border-radius: 50%;
    animation: tok-pulse 1.4s ease-in-out infinite;
  }

  &__voice-stop {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    background-color: tok-color(text);
    border: 0;
    border-radius: 50%;
    cursor: pointer;

    @include tok-button-color(text-inverse);

    &:disabled {
      opacity: 0.5;
      cursor: default;
    }

    &:focus-visible {
      outline: 2px solid tok-color(accent);
      outline-offset: 2px;
    }
  }
}

@keyframes tok-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.25;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tok-composer__pulse {
    animation: none;
  }
}
</style>
