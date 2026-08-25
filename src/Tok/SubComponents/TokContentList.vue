<template>
  <ul class="tok-content-list">
    <li v-for="(item, index) in items" :key="index" class="tok-content-list__item">
      {{ item }}
    </li>
  </ul>
</template>

<script>
/**
 * Блок ответа `list` — перечисление текстовых и числовых значений.
 *
 * Числа проходят через тот же форматтер, что и ячейки таблицы: список из
 * `412500` и «412 500» в одном ответе выглядел бы как две разные системы счисления.
 *
 * Автор: Кирсанов Михаил
 * @displayName Tok Content List
 */

// services
import { normalizeListItems } from '../services/api/contentShape';
import { formatValue } from '../services/utils/format';

export default {
  name: 'TokContentList',

  props: {
    /* Блок `contents[]` вида `{ type: 'list', items }`. */
    block: {
      type: Object,
      required: true,
    },
  },

  computed: {
    /* Элементы списка, готовые к показу: числа отформатированы. */
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
    padding-left: 16px;
    color: var(--v-tok-text);
    font-size: 15px;
    line-height: 1.5;
    overflow-wrap: anywhere;

    & + & {
      margin-top: 4px;
    }

    // Маркер рисуем сами, а не `list-style`: у нативного маркера не настроить
    // ни цвет, ни расстояние до текста без тех же самых ухищрений.
    &::before {
      position: absolute;
      top: 0;
      left: 0;
      color: var(--v-tok-accent);
      content: '•';
    }
  }
}
</style>
