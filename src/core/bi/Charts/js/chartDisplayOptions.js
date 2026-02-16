function cloneParams(obj) {
  return JSON.parse(JSON.stringify(obj ?? {}))
}

export const DEFAULT_CHART_DISPLAY_OPTIONS = {
  showTitle: true,
  titleText: '',
  showLegend: true,
  showTooltip: true,
  sumInTooltips: true,
  showNavigator: false,
  navigatorMode: 'all',
  navigatorLineIds: [],
  defaultPeriodValue: 1,
  defaultPeriodUnit: 'day',
  sectionAxisX: {},
  sectionAxisY: {},
  sectionAxisY2: {},
  sectionColors: {},
  sectionLabels: {},
  sectionColumns: {},
  sectionSizeDots: {},
  sectionSort: { desc: false },
  tableSize: 'm',
  pagination: true,
  limit: 100,
  grouping: true,
  tableShowTotals: false,
  preserveSpaces: false,
  stacked: false,
  doughnutShowTotals: false,
  titleMode: 'fieldName',
  indicatorSize: 's',
}

export function getDefaultChartDisplayOptions() {
  return cloneParams(DEFAULT_CHART_DISPLAY_OPTIONS)
}

export function mergeDisplayOptionsFromApi(loadedDisplay) {
  if (!loadedDisplay || typeof loadedDisplay !== 'object') {
    return getDefaultChartDisplayOptions()
  }
  const options = getDefaultChartDisplayOptions()
  Object.assign(options, {
    showTitle: loadedDisplay.showTitle !== false,
    titleText: loadedDisplay.titleText ?? '',
    showLegend: loadedDisplay.showLegend !== false,
    showTooltip: loadedDisplay.showTooltip !== false,
    sumInTooltips: loadedDisplay.sumInTooltips !== false,
    showNavigator: loadedDisplay.showNavigator === true,
    navigatorMode: loadedDisplay.navigatorMode ?? 'all',
    navigatorLineIds: Array.isArray(loadedDisplay.navigatorLineIds) ? [...loadedDisplay.navigatorLineIds] : [],
    defaultPeriodValue: Math.max(1, Number(loadedDisplay.defaultPeriodValue) || 1),
    defaultPeriodUnit: loadedDisplay.defaultPeriodUnit ?? 'day',
    sectionAxisX: typeof loadedDisplay.sectionAxisX === 'object' && loadedDisplay.sectionAxisX ? { ...loadedDisplay.sectionAxisX } : {},
    sectionAxisY: typeof loadedDisplay.sectionAxisY === 'object' && loadedDisplay.sectionAxisY ? { ...loadedDisplay.sectionAxisY } : {},
    sectionAxisY2: typeof loadedDisplay.sectionAxisY2 === 'object' && loadedDisplay.sectionAxisY2 ? { ...loadedDisplay.sectionAxisY2 } : {},
    sectionColors: typeof loadedDisplay.sectionColors === 'object' && loadedDisplay.sectionColors ? { ...loadedDisplay.sectionColors } : {},
    sectionLabels: typeof loadedDisplay.sectionLabels === 'object' && loadedDisplay.sectionLabels ? { ...loadedDisplay.sectionLabels } : {},
    sectionColumns: typeof loadedDisplay.sectionColumns === 'object' && loadedDisplay.sectionColumns ? { ...loadedDisplay.sectionColumns } : {},
    sectionSizeDots: typeof loadedDisplay.sectionSizeDots === 'object' && loadedDisplay.sectionSizeDots ? { ...loadedDisplay.sectionSizeDots } : {},
    sectionSort: typeof loadedDisplay.sectionSort === 'object' && loadedDisplay.sectionSort ? { ...loadedDisplay.sectionSort } : { desc: false },
    tableSize: loadedDisplay.tableSize ?? 'm',
    pagination: loadedDisplay.pagination !== false,
    limit: Math.max(1, Number(loadedDisplay.limit) || 100),
    grouping: loadedDisplay.grouping !== false,
    tableShowTotals: loadedDisplay.tableShowTotals === true,
    preserveSpaces: loadedDisplay.preserveSpaces === true,
    stacked: loadedDisplay.stacked === true,
    doughnutShowTotals: loadedDisplay.doughnutShowTotals === true,
    titleMode: loadedDisplay.titleMode ?? 'fieldName',
    indicatorSize: loadedDisplay.indicatorSize ?? 's',
  })
  return options
}
