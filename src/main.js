import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css'
import ArcoVue from '@arco-design/web-vue';
import '@arco-design/web-vue/dist/arco.css';
import ArcoVueIcon from '@arco-design/web-vue/es/icon';

// import {i18n} from './locales/i18n.js'
// createApp(App).use(i18n).mount('#app') // 注入国际化函数$t

createApp(App).use(ArcoVue).use(ArcoVueIcon).mount('#app')
