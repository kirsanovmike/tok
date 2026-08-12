<template>
  <ul class="tok-content-list">
    <li v-for="(item, index) in items" :key="index" class="tok-content-list__item">
      {{ item }}
    </li>
  </ul>
</template>

<script>
import { normalizeListItems } from '../../api/contentShape';
import { formatValue } from '../../utils/format';

/**
 * Блок `list` — перечисление текстовых и числовых значений.
 *
 * Числа проходят через тот же форматтер, что и ячейки таблицы: список из
 * `412500` и «412 500» в одном ответе выглядел бы как две разные системы счисления.
 */
export default {
  name: 'TokContentList',

  props: {
    block: {
      type: Object,
      required: true,
    },
  },

  computed: {
    items() {
      return normalizeListItems(this.block).map(formatValue);
    },
  },
};
</script>

<style lang="scss">
.tok-content-list {
  margin: 0;
  padding: 0;
  list-style: none;

  &__item {
    position: relative;
    padding-left: $tok-space-md;
    color: tok-color(text);
    font-size: 15px;
    line-height: 1.5;
    overflow-wrap: anywhere;

    & + & {
      margin-top: $tok-space-xs;
    }

    // Маркер рисуем сами, а не `list-style`: у нативного маркера не настроить
    // ни цвет, ни расстояние до текста без тех же самых ухищрений.
    &::before {
      position: absolute;
      top: 0;
      left: 0;
      color: tok-color(accent);
      content: '•';
    }
  }
}
</style>
