<template>
  <div class="tok-empty">
    <div class="tok-empty__greeting">
      <p class="tok-empty__hello">Привет!<br />Я Ток - ИИ-ассистент в Трансфере</p>
      <p class="tok-empty__lead">
        Помогу разобраться с тарифом, объёмом потребления и стоимостью по вашим договорам
      </p>
    </div>

    <!--
      Чипы прижаты к низу — так в макете: взгляд идёт от приветствия сверху
      к строке ввода снизу, и подсказки оказываются прямо над ней.
    -->
    <ul class="tok-empty__chips">
      <li v-for="suggestion in suggestions" :key="suggestion">
        <button type="button" class="tok-chip" @click="$emit('pick', suggestion)">
          {{ suggestion }}
        </button>
      </li>
    </ul>
  </div>
</template>

<script>
/**
 * Пустой экран панели: логотип, приветствие и чипы-подсказки.
 *
 * Клик по чипу не отправляет вопрос, а подставляет его в композер: человек должен
 * успеть поправить формулировку до отправки.
 *
 * Автор: Кирсанов Михаил
 * @displayName Tok Empty State
 * @event pick — выбран чип-подсказка; в полезной нагрузке текст вопроса
 */

// services
import { SUGGESTIONS } from '../services/constants/suggestions';

export default {
  name: 'TokEmptyState',

  props: {
    /* Чипы-подсказки. По умолчанию — набор из `services/constants/suggestions`. */
    suggestions: {
      type: Array,
      default: () => SUGGESTIONS,
    },
  },
};
</script>

<style lang="scss">
.tok-empty {
  display: flex;
  // Отступы свои: у тела панели их нет — см. комментарий в TokPanel.vue.
  box-sizing: border-box;
  flex-direction: column;
  min-height: 100%;
  padding: 0 24px;

  &__hello {
    margin: 0 0 4px;
    color: var(--v-tok-text);
    font-size: 17px;
    font-weight: 700;
    line-height: 1.35;
  }

  &__lead {
    margin: 0;
    color: var(--v-tok-text);
    font-size: 14px;
    line-height: 1.45;
  }

  &__chips {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    // `auto` сверху прижимает подсказки к строке ввода, как в макете.
    margin: auto 0 0;
    padding: 32px 0 0;
    list-style: none;
  }
}

.tok-chip {
  max-width: 100%;
  padding: 10px 16px;
  color: var(--v-tok-text);
  font-size: 14px;
  text-align: left;
  background-color: var(--v-tok-surface-muted);
  border: 0;
  border-radius: 16px;
  cursor: pointer;
  transition: background-color 140ms linear;

  &:hover {
    background-color: var(--v-tok-accent-soft);
  }

  &:focus-visible {
    outline: 2px solid var(--v-tok-accent);
    outline-offset: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tok-chip {
    transition: none;
  }
}
</style>
