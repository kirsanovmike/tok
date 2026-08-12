<template>
  <div class="tok-loader" role="status" aria-live="polite">
    <span class="tok-loader__badge">
      <TokSparkleIcon class="tok-loader__mark" :size="16" />
    </span>

    <transition name="tok-loader-phrase" mode="out-in">
      <span :key="phrase" class="tok-loader__phrase">{{ phrase }}</span>
    </transition>
  </div>
</template>

<script>
import TokSparkleIcon from './icons/TokSparkleIcon.vue';
import { LOADING_PHRASES, PHRASE_INTERVAL_MS } from '../constants/loadingPhrases';
import { nextPhraseIndex } from '../utils/phraseRotator';

export default {
  name: 'TokLoader',

  components: { TokSparkleIcon },

  props: {
    phrases: {
      type: Array,
      default: () => LOADING_PHRASES,
    },
    intervalMs: {
      type: Number,
      default: PHRASE_INTERVAL_MS,
    },
  },

  data() {
    return {
      index: 0,
      timer: null,
    };
  },

  computed: {
    phrase() {
      return this.phrases[this.index];
    },
  },

  mounted() {
    // Первая фраза — всегда «Думаю…»: ожидание должно начинаться предсказуемо.
    // Смена фразы идёт и при `prefers-reduced-motion`: это не движение, а текст.
    this.timer = setInterval(() => {
      this.index = nextPhraseIndex(this.index, this.phrases.length);
    }, this.intervalMs);
  },

  beforeDestroy() {
    clearInterval(this.timer);
    this.timer = null;
  },
};
</script>

<style lang="scss">
.tok-loader {
  display: flex;
  align-items: center;
  gap: $tok-space-sm;
  padding: $tok-space-sm 0;

  &__badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    color: tok-color(text-inverse);
    border-radius: 50%;

    @include tok-gradient(140deg);
  }

  // Вращение строго вокруг оси Z — то есть в плоскости экрана.
  // `rotateX` / `rotateY` здесь недопустимы: звёздочка не должна «переворачиваться».
  &__mark {
    animation: tok-spin-z 4s linear infinite;
  }

  &__phrase {
    color: tok-color(text-muted);
    font-size: 15px;
  }
}

@keyframes tok-spin-z {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.tok-loader-phrase-enter-active,
.tok-loader-phrase-leave-active {
  transition: opacity 220ms ease;
}

.tok-loader-phrase-enter,
.tok-loader-phrase-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .tok-loader__mark {
    animation: none;
  }

  .tok-loader-phrase-enter-active,
  .tok-loader-phrase-leave-active {
    transition: none;
  }
}
</style>
