<template>
  <svg
    class="tok-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      v-for="(d, index) in paths"
      :key="index"
      :d="d"
      :fill="filled ? 'currentColor' : 'none'"
      :stroke="filled ? 'none' : 'currentColor'"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<script>
/**
 * Иконочный набор Тока.
 *
 * Собственные SVG, а не иконочный шрифт: в Трансфере эту роль играет `@tne-ui/sprites`,
 * и тянуть ради Тока ещё один шрифт незачем. При переносе набор заменяется на спрайты —
 * точка замены одна, этот компонент.
 *
 * Автор: Кирсанов Михаил
 * @displayName Tok Icon
 */

/** Иконки-обводки: рисуются `stroke`-ом в 1.8px без заливки. */
const OUTLINE = {
  close: ['M6 6 18 18', 'M18 6 6 18'],
  send: ['M12 19V5', 'M6 11l6-6 6 6'],
  mic: [
    'M12 4a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-5 0v-5A2.5 2.5 0 0 1 12 4Z',
    'M5.5 11a6.5 6.5 0 0 0 13 0',
    'M12 17.5V21',
  ],
  copy: [
    'M9.5 3.5h8a2 2 0 0 1 2 2v8',
    'M14.5 7.5h-8a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Z',
  ],
  source: ['M4 12h12', 'M11 7l5 5-5 5'],
  trash: [
    'M4.5 6.5h15',
    'M9.5 6.5V4.5h5v2',
    'M6.5 6.5 7.5 20h9l1-13.5',
    'M10.5 10v6',
    'M13.5 10v6',
  ],
  check: ['M4.5 12.5 9.5 17.5 19.5 6.5'],
  refresh: ['M20 5v5h-5', 'M19.4 13a7.5 7.5 0 1 1-1.9-6.2L20 9'],
  'chevron-left': ['M14.5 6 8.5 12l6 6'],
  'chevron-right': ['M9.5 6l6 6-6 6'],
};

/** Иконки-заливки: рисуются `fill="currentColor"`, обводки у них нет. */
const FILLED = {
  clear: [
    'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm3.2 11.2a.9.9 0 0 1-1.3 1.3L12 14.1l-1.9 1.9a.9.9 0 1 1-1.3-1.3l1.9-1.9-1.9-1.9a.9.9 0 1 1 1.3-1.3l1.9 1.9 1.9-1.9a.9.9 0 0 1 1.3 1.3L13.3 12l1.9 1.9Z',
  ],
  // Сплошной квадрат, а не рамка: обводка в 1.8px читалась как «рамка чего-то»,
  // а не как «стоп». 11×11 вместо прежних 9×9 — заметнее в круглой кнопке.
  stop: [
    'M8 6.5h8A1.5 1.5 0 0 1 17.5 8v8a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 16V8A1.5 1.5 0 0 1 8 6.5Z',
  ],
};

export default {
  name: 'TokIcon',

  props: {
    /* Имя иконки: ключ из набора обводок или заливок. */
    name: {
      type: String,
      required: true,
      validator: (value) => value in OUTLINE || value in FILLED,
    },
    /* Сторона квадрата иконки в пикселях. */
    size: {
      type: [Number, String],
      default: 20,
    },
  },

  computed: {
    /* Иконка из набора заливок — значит рисуется `fill`, а не `stroke`. */
    filled() {
      return this.name in FILLED;
    },

    /* Пути `d` выбранной иконки. */
    paths() {
      return this.filled ? FILLED[this.name] : OUTLINE[this.name];
    },
  },
};
</script>

<style lang="scss">
.tok-icon {
  display: block;
  flex: none;
}
</style>
