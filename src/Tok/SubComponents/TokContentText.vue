<template>
  <div class="tok-content-text">
    <p v-for="(paragraph, index) in paragraphs" :key="index" class="tok-content-text__paragraph">
      {{ paragraph }}
    </p>
  </div>
</template>

<script>
/**
 * Блок ответа `text` — plain text абзацами.
 *
 * Markdown не рендерим (решение зафиксировано в плане), HTML не интерпретируем:
 * интерполяция `{{ }}` экранирует его сама. Пустая строка в тексте — граница абзаца,
 * одиночный перенос остаётся переносом внутри абзаца (`white-space: pre-line`).
 *
 * Автор: Кирсанов Михаил
 * @displayName Tok Content Text
 */
export default {
  name: 'TokContentText',

  props: {
    /* Блок `contents[]` вида `{ type: 'text', text }`. */
    block: {
      type: Object,
      required: true,
    },
  },

  computed: {
    /* Абзацы текста: пустая строка в исходнике — граница абзаца. */
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
    color: var(--v-tok-text);
    font-size: 15px;
    line-height: 1.5;
    white-space: pre-line;
    overflow-wrap: anywhere;

    & + & {
      margin-top: 8px;
    }
  }
}
</style>
