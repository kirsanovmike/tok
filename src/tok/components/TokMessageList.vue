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
import TokMessage from './TokMessage.vue';
import TokLoader from './TokLoader.vue';

export default {
  name: 'TokMessageList',

  components: { TokMessage, TokLoader },

  props: {
    messages: {
      type: Array,
      required: true,
    },
    sending: {
      type: Boolean,
      default: false,
    },
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
