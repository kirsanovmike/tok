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
        <TokIcon name="stop" :size="22" />
      </button>
    </div>

    <div
      v-else
      class="tok-composer__field"
      :class="{ 'tok-composer__field--multiline': multiline }"
    >
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
/**
 * Строка ввода вопроса: текст, голос, отправка.
 *
 * Поле растёт под содержимое до потолка и дальше прокручивается внутри себя;
 * Enter отправляет, Shift+Enter переносит строку. Голосовой ввод — отдельное
 * состояние строки: вместо поля показывается полоса записи с таймером.
 *
 * Автор: Кирсанов Михаил
 * @displayName Tok Composer
 * @event send — вопрос отправлен; в полезной нагрузке текст без крайних пробелов
 */

// services
import { createVoiceSession, VOICE_STATE } from '../services/voice/session';
import { describeVoiceError, isVoiceSupported } from '../services/voice/recorder';
import { isMultiline, isScrollable, nextTextareaHeight } from '../services/utils/autoGrow';
// components
import TokIcon from './TokIcon.vue';

/** Шаг таймера записи. */
const TICK_MS = 1000;

/** Длительность записи в виде «м:сс». */
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
    /* Подсказка в пустом поле. */
    placeholder: {
      type: String,
      default: 'Задайте свой вопрос',
    },
    /* Ввод заблокирован — беседа упёрлась в `workflow.status: forbidden`. */
    blocked: {
      type: Boolean,
      default: false,
    },
    /* Пояснение, почему ввод заблокирован. */
    blockedReason: {
      type: String,
      default: '',
    },
    /* Ввод временно недоступен: предыдущий вопрос ещё в полёте. */
    disabled: {
      type: Boolean,
      default: false,
    },
    /* Разрешил ли хост голосовой ввод. */
    voiceEnabled: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      /* Текст вопроса. */
      value: '',
      /* Состояние голосовой сессии: покой, запись, расшифровка. */
      voiceState: VOICE_STATE.IDLE,
      /* Пояснение к сбою голосового ввода — под строкой. */
      voiceError: '',
      /* Длительность записи в секундах. */
      elapsed: 0,
      /* Текст перерос одну строку — кнопки уходят в нижний ряд. */
      multiline: false,
    };
  },

  computed: {
    /* Есть ли что отправлять: строка из одних пробелов вопросом не является. */
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

    /* Идёт запись с микрофона. */
    isRecording() {
      return this.voiceState === VOICE_STATE.RECORDING;
    },

    /* Голосовая сессия в работе: запись или расшифровка. */
    isVoiceActive() {
      return this.voiceState !== VOICE_STATE.IDLE;
    },

    /* Надпись на полосе записи. */
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
    /** Поставить курсор в поле ввода. */
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
      // Измеряем один раз и по этому же числу решаем всё остальное: повторное
      // чтение `scrollHeight` после присвоения высоты вернуло бы уже
      // ограниченное значение.
      const measured = field.scrollHeight;

      field.style.height = `${nextTextareaHeight(measured)}px`;
      field.style.overflowY = isScrollable(measured) ? 'auto' : 'hidden';
      this.multiline = isMultiline(measured);
    },

    /** Подставить текст в поле — из чипа-подсказки или из расшифровки. */
    setText(text) {
      this.value = text;
      this.focus();
    },

    /** Очистить поле ввода. */
    clear() {
      this.value = '';
      this.focus();
    },

    /** Отправить вопрос и освободить поле. */
    submit() {
      if (!this.canSend) return;
      this.$emit('send', this.value.trim());
      this.value = '';
      this.$nextTick(this.resize);
    },

    /** Запустить таймер длительности записи. */
    startTimer() {
      this.elapsed = 0;
      this.stopTimer();
      this.timer = setInterval(() => {
        this.elapsed += 1;
      }, TICK_MS);
    },

    /** Остановить таймер длительности записи. */
    stopTimer() {
      clearInterval(this.timer);
      this.timer = null;
    },

    /** Начать запись с микрофона. */
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

    /** Остановить запись и подставить расшифровку в поле. */
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

    /** Бросить запись: расшифровки не будет, поле остаётся как было. */
    cancelVoice() {
      if (this.session) this.session.cancel();
      this.resetVoice();
      this.focus();
    },

    /** Вернуть строку в обычное состояние. */
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
    // Грид, а не флекс: две раскладки из референсов отличаются только строкой
    // `grid-template-areas`, при этом порядок детей в DOM один и тот же —
    // `textarea` не перемонтируется и не теряет каретку.
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    grid-template-areas: 'clear input mic send';
    align-items: center;
    gap: $tok-space-sm;
    padding: 6px 6px 6px $tok-space-sm;
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

    // Много текста — раскладка по референсу `Референ на скролл и поле ввода
    // коргда много текста.png`: поле во всю ширину сверху, все кнопки в нижнем
    // ряду. Очистка слева, микрофон и отправка справа — пункт 3 постановки.
    &--multiline {
      grid-template-areas:
        'input input input input'
        'clear . mic send';
      align-items: end;
      row-gap: $tok-space-sm;
      padding: $tok-space-sm;
      // Таблетка уместна на одной строке; у выросшего на несколько строк поля
      // она съедает углы текста — прямоугольник со скруглением, как в референсе.
      border-radius: $tok-radius-lg;
    }

    // В состоянии записи поле не растёт: выравнивать нечего, и раскладка в
    // четыре колонки ему не нужна — отмена слева, надпись, остановка справа.
    &--voice {
      display: flex;
      align-items: center;
      padding-left: 6px;
    }
  }

  &--blocked &__field {
    background-color: tok-color(surface-muted);
  }

  &__input {
    grid-area: input;
    min-width: 0;
    // База — одна строка (см. COMPOSER_MIN_HEIGHT в utils/autoGrow.js).
    // Высота ниже переопределяется инлайном из `resize()`; здесь она нужна, чтобы
    // поле не мигало полной высотой до первого измерения.
    height: 32px;
    max-height: 160px;
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

    // Тонкая полоса внутри поля — по референсу: она прижата к правому краю
    // поля и не спорит с текстом. 4px вместо общих 6px: полоса живёт внутри
    // рамки поля, а не по краю панели.
    @include tok-thin-scrollbar(4px);

    &::placeholder {
      color: tok-color(text-muted);
    }
  }

  // В многострочной раскладке поле занимает всю ширину: текст отодвигается от
  // рамки, а справа освобождается место под собственную полосу прокрутки.
  &__field--multiline &__input {
    padding-right: $tok-space-sm;
    padding-left: $tok-space-sm;
  }

  &__clear,
  &__mic {
    display: flex;
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
    grid-area: clear;
  }

  &__mic {
    grid-area: mic;
  }

  &__send {
    display: flex;
    grid-area: send;
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
    // Высота кнопок отмены и остановки: надпись центрируется ровно между ними,
    // а не по своей строке.
    min-height: 36px;
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
