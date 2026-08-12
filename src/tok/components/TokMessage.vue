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
import TokMessageActions from './TokMessageActions.vue';
import TokContents from './contents/TokContents.vue';
import { MESSAGE_AUTHOR, REPLY_KIND } from '../api/contract';
import { answerToText } from '../utils/answerText';

export default {
  name: 'TokMessage',

  components: { TokMessageActions, TokContents },

  props: {
    message: {
      type: Object,
      required: true,
    },
    // Шаг подтверждения относится только к последнему ответу: выше по ленте
    // кнопки были бы обманом — тот шаг уже пройден.
    isLast: {
      type: Boolean,
      default: false,
    },
    showSource: {
      type: Boolean,
      default: false,
    },
  },

  computed: {
    isUser() {
      return this.message.author === MESSAGE_AUTHOR.USER;
    },

    isError() {
      return !this.isUser && this.message.kind === REPLY_KIND.ERROR;
    },

    showConfirmation() {
      if (this.isUser || !this.isLast) return false;
      if (this.message.confirmationResolved) return false;
      return this.message.workflow.awaitingConfirmation === true;
    },

    // В буфер уходит ответ целиком — вводная фраза и все блоки `contents[]`,
    // а не только `reply.text`, как было до появления рендерера блоков.
    copyText() {
      return answerToText(this.message);
    },

    showActions() {
      // Копировать нечего у пустого ответа; у сообщения о сбое связи — незачем.
      return !this.isUser && Boolean(this.copyText) && !this.message.failed;
    },

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
