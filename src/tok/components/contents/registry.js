/**
 * Реестр блоков `contents[]`: `type` → компонент.
 *
 * Реестр, а не `v-if`-лестница в диспетчере: новый тип блока добавляется одной
 * строкой здесь, и ни один существующий компонент об этом не узнаёт (ADR-0003).
 * Виды графиков — самостоятельные типы наравне с `text` и `table`, а не поле
 * внутри одного «универсального» графика.
 */
import { CONTENT_TYPE } from '../../api/contract';
import TokContentText from './TokContentText.vue';
import TokContentList from './TokContentList.vue';
import TokContentStat from './TokContentStat.vue';
import TokContentTable from './TokContentTable.vue';

/**
 * График — асинхронный компонент: `@amcharts/amcharts4` весит около 700 КБ,
 * и грузить его тем, кто ни разу не спросил про динамику, незачем. Vue 2 понимает
 * фабрику прямо в `<component :is>`, поэтому диспетчеру про это знать не нужно.
 */
const TokContentChart = () => import(/* webpackChunkName: 'tok-charts' */ './TokContentChart.vue');

export const CONTENT_COMPONENTS = {
  [CONTENT_TYPE.TEXT]: TokContentText,
  [CONTENT_TYPE.LIST]: TokContentList,
  [CONTENT_TYPE.STAT]: TokContentStat,
  [CONTENT_TYPE.TABLE]: TokContentTable,
  [CONTENT_TYPE.LINE]: TokContentChart,
  [CONTENT_TYPE.BAR]: TokContentChart,
  [CONTENT_TYPE.CIRCLE]: TokContentChart,
};

export function resolveContentComponent(type) {
  return CONTENT_COMPONENTS[type] || null;
}
