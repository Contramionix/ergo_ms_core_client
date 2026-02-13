<script setup>
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart, ScatterChart, RadarChart, HeatmapChart, FunnelChart, GaugeChart, TreemapChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, TitleComponent, DataZoomComponent } from 'echarts/components'
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
  FunnelChart,
  GaugeChart,
  TreemapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  TitleComponent,
  DataZoomComponent
])

const props = defineProps({
  type: { type: String, default: 'bar' },
  fields: { type: Object, default: () => ({}) },
  settings: { type: Array, default: () => [] },
  displayOptions: { type: Object, default: () => ({}) },
  dataset: { type: Array, default: () => [] },
  compact: { type: Boolean, default: false }
})

const option = computed(() =>
  buildEChartsOption({
    type: props.type,
    fields: props.fields,
    settings: props.settings,
    displayOptions: props.displayOptions,
    dataset: props.dataset,
    compact: props.compact
  })
)

const displayOptionsKey = computed(() => {
  const o = props.displayOptions || {}
  return [
    o.showTitle,
    o.titleText,
    o.showLegend,
    o.showTooltip,
    o.sumInTooltips,
    o.showNavigator,
    o.navigatorMode,
    (o.navigatorLineIds && o.navigatorLineIds.join(',')) || '',
    o.defaultPeriodValue,
    o.defaultPeriodUnit
  ].join('|')
})
</script>

<template>
  <div class="echarts-wrapper" :class="{ compact: compact }">
    <VChart :key="displayOptionsKey" class="echarts-chart" :option="option" :autoresize="true" />
  </div>
</template>

<style scoped>
.echarts-wrapper {
  height: 100%;
  width: 100%;
  min-height: 300px;
}
.echarts-wrapper.compact {
  min-height: 0;
}
.echarts-chart {
  height: 100%;
  width: 100%;
}
</style>