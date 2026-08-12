<template>
  <button
    ref="button"
    type="button"
    class="tok-entry"
    :class="{ 'tok-entry--hidden': hidden }"
    :aria-label="label"
    aria-haspopup="dialog"
    :aria-expanded="String(expanded)"
    :tabindex="hidden ? -1 : 0"
    @click="$emit('open')"
  >
    <TokSparkleIcon class="tok-entry__mark" :size="28" />
  </button>
</template>

<script>
import TokSparkleIcon from './icons/TokSparkleIcon.vue';

export default {
  name: 'TokEntryButton',

  components: { TokSparkleIcon },

  props: {
    // Пока панель открыта, точка входа скрыта: она осталась бы под оверлеем
    // и ловила бы на себя фокус в обход фокус-ловушки.
    hidden: {
      type: Boolean,
      default: false,
    },
    expanded: {
      type: Boolean,
      default: false,
    },
    label: {
      type: String,
      default: 'Открыть ассистента Ток',
    },
  },

  methods: {
    focus() {
      if (this.$refs.button) this.$refs.button.focus();
    },
  },
};
</script>

<style lang="scss">
.tok-entry {
  position: fixed;
  right: $tok-space-lg;
  bottom: $tok-space-lg;
  z-index: $tok-z-entry;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  padding: 0;
  border: 0;
  border-radius: $tok-radius-lg;
  box-shadow: 0 10px 24px tok-color(shadow);
  cursor: pointer;
  transition: transform $tok-duration-panel $tok-easing-panel, opacity 160ms linear;

  @include tok-gradient(160deg);
  @include tok-button-color(text-inverse);

  &:hover {
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid tok-color(accent);
    outline-offset: 3px;
  }

  &--hidden {
    // Не `display: none`: так кнопка доживает до возврата фокуса после закрытия.
    opacity: 0;
    pointer-events: none;
    transform: scale(0.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tok-entry {
    transition: none;

    &:hover {
      transform: none;
    }
  }
}
</style>
