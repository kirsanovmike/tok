<template>
  <div v-if="blocks.length" class="tok-contents">
    <div v-for="entry in blocks" :key="entry.key" class="tok-contents__block">
      <component :is="entry.component" :block="entry.block" />
    </div>
  </div>
</template>

<script>
import { resolveContentComponent } from './registry';
import { warnMissingRenderer } from './warn';

/**
 * Диспетчер блоков ответа.
 *
 * Порядок блоков значим и сохраняется: `contents[]` — это свёрстанный ответ,
 * а не набор карточек, который можно переставить.
 *
 * Неизвестный `type` не роняет ленту: блок пропускается, факт логируется один раз
 * на тип. Так фронтенд переживает опережающее развитие бэка — новый тип блока
 * деградирует до «его просто нет», а остальной ответ остаётся читаемым.
 */
export default {
  name: 'TokContents',

  props: {
    contents: {
      type: Array,
      default: () => [],
    },
  },

  computed: {
    blocks() {
      return (this.contents || [])
        .map((block, index) => {
          if (!block || typeof block !== 'object') return null;

          const component = resolveContentComponent(block.type);
          if (!component) {
            warnMissingRenderer(block.type);
            return null;
          }

          // Ключ по индексу, а не по типу: в одном ответе бывает несколько блоков
          // одного типа, и они не должны схлопнуться в один.
          return { key: `${index}-${block.type}`, component, block };
        })
        .filter(Boolean);
    },
  },
};
</script>

<style lang="scss">
.tok-contents {
  display: flex;
  flex-direction: column;
  gap: $tok-space-md;
  margin-top: $tok-space-md;

  // Блок не имеет права расширить панель: ширину задаёт лента, а не содержимое.
  &__block {
    min-width: 0;
  }
}
</style>
