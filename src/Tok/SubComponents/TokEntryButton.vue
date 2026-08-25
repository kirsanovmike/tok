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
    <TokSparkleIcon class="tok-entry__mark" :size="24" />
  </button>
</template>

<script>
/**
 * Точка входа: плавающая кнопка со звёздочками в правом нижнем углу страницы хоста.
 *
 * Автор: Кирсанов Михаил
 * @displayName Tok Entry Button
 * @event open — кнопку нажали, панель нужно открыть
 */

// components
import TokSparkleIcon from './TokSparkleIcon.vue';

export default {
  name: 'TokEntryButton',

  components: { TokSparkleIcon },

  props: {
    /*
     * Пока панель открыта, точка входа скрыта: она осталась бы под оверлеем
     * и ловила бы на себя фокус в обход фокус-ловушки.
     */
    hidden: {
      type: Boolean,
      default: false,
    },
    /* Значение `aria-expanded`: открыта ли панель, которой управляет кнопка. */
    expanded: {
      type: Boolean,
      default: false,
    },
    /* Подпись для скринридера: сама кнопка — только иконка. */
    label: {
      type: String,
      default: 'Открыть ассистента Ток',
    },
  },

  methods: {
    /** Вернуть фокус на кнопку — вызывается панелью при закрытии. */
    focus() {
      if (this.$refs.button) this.$refs.button.focus();
    },
  },
};
</script>

<style lang="scss">
.tok-entry {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 199;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  padding: 0;
  border: 0;
  border-radius: 16px;
  // Совсем небольшая тень: кнопка лежит на странице, а не висит над ней.
  box-shadow: 0 2px 6px var(--v-tok-shadow);
  cursor: pointer;
  transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 160ms linear;
  background-image: linear-gradient(160deg, var(--v-tok-gradient-from), var(--v-tok-gradient-to));

  // `.tok-root` поднимает специфичность над сбросом `button { color: inherit }`
  // у Vuetify и normalize: без него кнопка красится в цвет родителя.
  .tok-root & {
    color: var(--v-tok-text-inverse);
  }

  &:hover {
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid var(--v-tok-accent);
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
