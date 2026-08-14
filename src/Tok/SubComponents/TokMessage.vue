<template>
  <li class="tok-message" :class="rootClass">
    <!-- Реплика пользователя — пузырь; ответ ассистента идёт без пузыря, как в макете. -->
    <div v-if="isUser" class="tok-message__bubble">{{ message.text }}</div>

    <div v-else class="tok-message__answer">
      <p v-if="message.text" class="tok-message__text">{{ message.text }}</p>

      <TokContents :contents="message.contents" />

      <div v-if="showConfirmation" class="tok-message__confirm">
        <button type="button" class="tok-button tok-button--primary" @click="$emit('confirm')">
          Подтвердить
        </button>
        <button type="button" class="tok-button" @click="$emit('decline')">Отменить</button>
      </div>

      <TokMessageActions
        v-if="showActions"
        :text="copyText"
        :show-source="showSource"
        @source="$emit('source', message)"
      />
    </div>
  </li>
</template>

<script>
/**
 * Одно сообщение ленты: реплика человека пузырём, ответ ассистента — без пузыря,
 * с блоками `contents[]` и действиями под ними.
 *
 * Автор: Кирсанов Михаил
 * @displayName Tok Message
 * @event confirm — нажато «Подтвердить» на шаге подтверждения
 * @event decline — нажато «Отменить»
 * @event source — запрошен источник ответа; в полезной нагрузке само сообщение
 */

// services
import { MESSAGE_AUTHOR, REPLY_KIND } from '../services/api/contract';
import { answerToText } from '../services/utils/answerText';
// components
import TokMessageActions from './TokMessageActions.vue';
import TokContents from './TokContents.vue';

export default {
  name: 'TokMessage',

  components: { TokMessageActions, TokContents },

  props: {
    /* Сообщение беседы из стора. */
    message: {
      type: Object,
      required: true,
    },
    /*
     * Последнее ли это сообщение ленты. Шаг подтверждения относится только к нему:
     * выше по ленте кнопки были бы обманом — тот шаг уже пройден.
     */
    isLast: {
      type: Boolean,
      default: false,
    },
    /* Показывать ли кнопку «Источник» (по постановке скрыта). */
    showSource: {
      type: Boolean,
      default: false,
    },
  },

  computed: {
    /* Реплика человека, а не ответ ассистента. */
    isUser() {
      return this.message.author === MESSAGE_AUTHOR.USER;
    },

    /* Ответ о сбое: красится в цвет ошибки. */
    isError() {
      return !this.isUser && this.message.kind === REPLY_KIND.ERROR;
    },

    /* Показывать ли кнопки подтверждения и отказа. */
    showConfirmation() {
      if (this.isUser || !this.isLast) return false;
      if (this.message.confirmationResolved) return false;
      return this.message.workflow.awaitingConfirmation === true;
    },

    /*
     * Текст для буфера обмена: ответ целиком — вводная фраза и все блоки
     * `contents[]`, а не только `reply.text`, как было до рендерера блоков.
     */
    copyText() {
      return answerToText(this.message);
    },

    /* Показывать ли строку действий: копировать нечего у пустого ответа, а у сообщения о сбое связи — незачем. */
    showActions() {
      return !this.isUser && Boolean(this.copyText) && !this.message.failed;
    },

    /* Модификаторы корня: автор, ошибка, ожидание подтверждения. */
    rootClass() {
      return {
        'tok-message--user': this.isUser,
        'tok-message--assistant': !this.isUser,
        'tok-message--error': this.isError,
        'tok-message--awaiting': this.showConfirmation,
      };
    },
  },
};
</script>

<style lang="scss">
.tok-message {
  display: flex;
  list-style: none;

  &--user {
    justify-content: flex-start;
  }

  &__bubble {
    max-width: 85%;
    padding: 10px $tok-space-md;
    color: tok-color(text);
    font-size: 15px;
    line-height: 1.4;
    // Переносы строк из ввода пользователя сохраняем, HTML не интерпретируем.
    white-space: pre-line;
    overflow-wrap: anywhere;
    background-color: tok-color(surface-muted);
    border-radius: $tok-radius-md;
  }

  &__answer {
    width: 100%;
    padding-left: $tok-space-sm;
  }

  &__text {
    margin: 0;
    color: tok-color(text);
    font-size: 15px;
    line-height: 1.5;
    white-space: pre-line;
    overflow-wrap: anywhere;
  }

  // Шаг подтверждения: та же лента, но с акцентной левой границей.
  &--awaiting &__answer {
    padding-left: $tok-space-md;
    border-left: 2px solid tok-color(accent);
  }

  &--error &__text {
    color: tok-color(danger);
  }

  &__confirm {
    display: flex;
    flex-wrap: wrap;
    gap: $tok-space-sm;
    margin-top: $tok-space-md;
  }
}

.tok-button {
  padding: 9px $tok-space-md;
  font-family: inherit;
  font-size: 14px;
  background-color: tok-color(surface-muted);
  border: 0;
  border-radius: $tok-radius-sm;
  cursor: pointer;

  @include tok-button-color(text);

  &--primary {
    background-color: tok-color(accent);

    @include tok-button-color(text-inverse);
  }

  &:focus-visible {
    outline: 2px solid tok-color(accent);
    outline-offset: 2px;
  }
}
</style>
