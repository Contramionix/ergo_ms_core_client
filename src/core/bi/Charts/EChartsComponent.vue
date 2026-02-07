<script setup>
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart, ScatterChart, RadarChart, HeatmapChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, VisualMapComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { buildEChartsOption } from './components/js/echartsOptionBuilder.js'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  ScatterChart,
  RadarChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent
])

const props = defineProps({
  type: { type: String, default: 'bar' },
  fields: { type: Object, default: () => ({}) },
  settings: { type: Array, default: () => [] },
  dataset: { type: Array, default: () => [] }
})

const option = computed(() =>
  buildEChartsOption({
    type: props.type,
    fields: props.fields,
    settings: props.settings,
    dataset: props.dataset
  })
)
</script>

<template>
  <div class="echarts-wrapper">
    <VChart class="echarts-chart" :option="option" :autoresize="true" />
  </div>
</template>

<style scoped>
.echarts-wrapper {
  height: 100%;
  width: 100%;
  min-height: 300px;
}
.echarts-chart {
  height: 100%;
  width: 100%;
}
</style>
