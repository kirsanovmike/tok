<template>
  <div class="tok-content-stat">
    <p v-if="label" class="tok-content-stat__label">{{ label }}</p>

    <p class="tok-content-stat__value">
      {{ value }}<span v-if="unit" class="tok-content-stat__unit">{{ unit }}</span>
    </p>
  </div>
</template>

<script>
/**
 * Блок ответа `stat` — `label` / `value` / `unit` в скруглённой карточке
 * (`stat пример.png`).
 *
 * `unit` необязателен: без него вёрстка не разъезжается, потому что единица —
 * инлайновый хвост значения, а не отдельная колонка.
 *
 * Автор: Кирсанов Михаил
 * @displayName Tok Content Stat
 */

// services
import { formatValue } from '../services/utils/format';

export default {
  name: 'TokContentStat',

  props: {
    /* Блок `contents[]` вида `{ type: 'stat', label, value, unit }`. */
    block: {
      type: Object,
      required: true,
    },
  },

  computed: {
    /* Подпись показателя; пустая строка, если её не прислали. */
    label() {
      return this.block.label ? String(this.block.label) : '';
    },

    /* Значение показателя, отформатированное как в таблице и списке. */
    value() {
      return formatValue(this.block.value);
    },

    /* Единица измерения — инлайновый хвост значения. */
    unit() {
      return this.block.unit ? String(this.block.unit) : '';
    },
  },
};
</script>

<style lang="scss">
.tok-content-stat {
  padding: 16px;
  background-color: var(--v-tok-surface-elevated);
  border-radius: 16px;

  &__label {
    margin: 0 0 4px;
    color: var(--v-tok-text-muted);
    font-size: 14px;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }

  &__value {
    margin: 0;
    color: var(--v-tok-text);
    font-size: 24px;
    font-weight: 700;
    line-height: 1.2;
    // Очень большое число не имеет права расширить панель.
    overflow-wrap: anywhere;
  }

  &__unit {
    margin-left: 6px;
    font-size: 15px;
    font-weight: 700;
  }
}
</style>
