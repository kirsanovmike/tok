import Vue from 'vue';
import VueRouter from 'vue-router';

import DemoDashboard from '@/demo/views/DemoDashboard.vue';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: DemoDashboard,
  },
  {
    path: '*',
    redirect: '/',
  },
];

export default new VueRouter({ routes });
