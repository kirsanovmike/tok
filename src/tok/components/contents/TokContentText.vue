<template>
  <div class="tok-content-text">
    <p v-for="(paragraph, index) in paragraphs" :key="index" class="tok-content-text__paragraph">
      {{ paragraph }}
    </p>
  </div>
</template>

<script>
/**
 * Блок `text` — plain text абзацами.
 *
 * Markdown не рендерим (решение зафиксировано в плане), HTML не интерпретируем:
 * интерполяция `{{ }}` экранирует его сама. Пустая строка в тексте — граница абзаца,
 * одиночный перенос остаётся переносом внутри абзаца (`white-space: pre-line`).
 */
export default {
  name: 'TokContentText',

  props: {
    block: {
      type: Object,
      required: true,
    },
  },

  computed: {
    paragraphs() {
      const text = typeof this.block.text === 'string' ? this.block.text : '';

      return text
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
    },
  },
};
</script>

<style lang="scss">
.tok-content-text {
  &__paragraph {
    margin: 0;
    color: tok-color(text);
    font-size: 15px;
    line-height: 1.5;
    white-space: pre-line;
    overflow-wrap: anywhere;

    & + & {
      margin-top: $tok-space-sm;
    }
  }
}
</style>
