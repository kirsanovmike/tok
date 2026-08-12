<template>
  <div class="tok-empty">
    <div class="tok-empty__greeting">
      <p class="tok-empty__hello">Привет!<br />Я твой личный ассистент ТОК</p>
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
import { SUGGESTIONS } from '../constants/suggestions';

export default {
  name: 'TokEmptyState',

  props: {
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
  flex-direction: column;
  min-height: 100%;

  &__hello {
    margin: 0 0 $tok-space-xs;
    color: tok-color(text);
    font-size: 17px;
    font-weight: 700;
    line-height: 1.35;
  }

  &__lead {
    margin: 0;
    color: tok-color(text);
    font-size: 14px;
    line-height: 1.45;
  }

  &__chips {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $tok-space-sm;
    // `auto` сверху прижимает подсказки к строке ввода, как в макете.
    margin: auto 0 0;
    padding: $tok-space-xl 0 0;
    list-style: none;
  }
}

.tok-chip {
  max-width: 100%;
  padding: 10px $tok-space-md;
  color: tok-color(text);
  font-size: 14px;
  text-align: left;
  background-color: tok-color(surface-muted);
  border: 0;
  border-radius: $tok-radius-md;
  cursor: pointer;
  transition: background-color 140ms linear;

  &:hover {
    background-color: tok-color(accent-soft);
  }

  &:focus-visible {
    outline: 2px solid tok-color(accent);
    outline-offset: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tok-chip {
    transition: none;
  }
}
</style>
