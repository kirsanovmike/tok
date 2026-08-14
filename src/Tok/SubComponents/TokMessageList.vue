<template>
  <div ref="scroller" class="tok-feed">
    <ul class="tok-feed__list">
      <TokMessage
        v-for="(message, index) in messages"
        :key="message.id"
        :message="message"
        :is-last="index === messages.length - 1"
        :show-source="showSource"
        @confirm="$emit('confirm')"
        @decline="$emit('decline')"
        @source="$emit('source', $event)"
      />
    </ul>

    <TokLoader v-if="sending" class="tok-feed__loader" />
  </div>
</template>

<script>
/**
 * Лента переписки: сообщения по порядку и индикатор загрузки в хвосте.
 *
 * Лента — единственный элемент панели с собственной прокруткой, и она сама
 * доскролливает вниз: и на новое сообщение, и на появление индикатора.
 *
 * Автор: Кирсанов Михаил
 * @displayName Tok Message List
 * @event confirm — подтверждение действия из сообщения
 * @event decline — отказ от действия
 * @event source — запрошен источник ответа; в полезной нагрузке сообщение
 */

// components
import TokMessage from './TokMessage.vue';
import TokLoader from './TokLoader.vue';

export default {
  name: 'TokMessageList',

  components: { TokMessage, TokLoader },

  props: {
    /* Сообщения беседы по порядку. */
    messages: {
      type: Array,
      required: true,
    },
    /* Запрос в полёте — под лентой показывается индикатор загрузки. */
    sending: {
      type: Boolean,
      default: false,
    },
    /* Показывать ли кнопку «Источник» под ответами (по постановке скрыта). */
    showSource: {
      type: Boolean,
      default: false,
    },
  },

  watch: {
    // Индикатор загрузки — такой же повод доскроллить, как и новое сообщение.
    'messages.length': 'scrollToBottom',
    sending: 'scrollToBottom',
  },

  mounted() {
    this.scrollToBottom();
  },

  methods: {
    /** Доскроллить ленту к последнему сообщению — после отрисовки. */
    scrollToBottom() {
      this.$nextTick(() => {
        const { scroller } = this.$refs;
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
      });
    },
  },
};
</script>

<style lang="scss">
.tok-feed {
  height: 100%;
  overflow-y: auto;

  &__list {
    display: flex;
    flex-direction: column;
    gap: $tok-space-lg;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__loader {
    margin-top: $tok-space-lg;
  }
}
</style>
