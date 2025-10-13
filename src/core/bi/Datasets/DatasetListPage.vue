<script setup>
import GenericListPage from '@/core/bi/MainPage/Sidebar/GenericListPage.vue'
import { getListConfig } from '@/core/bi/MainPage/Sidebar/components/js/listConfigs.js'

const config = getListConfig('datasets')
</script>

<template>
  <GenericListPage :config="config" />
</template>