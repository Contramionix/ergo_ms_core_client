<script setup>
import GenericListPage from '@/core/bi/MainPage/Sidebar/GenericListPage.vue'
import { getListConfig } from '@/core/bi/MainPage/Sidebar/components/js/listConfigs.js'

const config = getListConfig('dashboards')

const now = new Date().toISOString()
const predefinedDashboards = [
  {
    id: 1,
    name: 'Отчетность: Дашборд 1',
    created_at: now
  },
  {
    id: 2,
    name: 'Отчетность: Дашборд 2',
    created_at: now
  }
]
</script>

<template>
  <GenericListPage :config="config" />
</template>
