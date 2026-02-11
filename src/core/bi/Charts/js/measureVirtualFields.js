export const MEASURE_NAMES_ID = '__measure_names__'
export const MEASURE_VALUES_ID = '__measure_values__'

export const MEASURE_NAMES_FIELD = {
  id: MEASURE_NAMES_ID,
  name: MEASURE_NAMES_ID,
  label: 'Measure Names',
  displayName: 'Имена показателей',
  type: 'string',
  source: 'virtual'
}

export const MEASURE_VALUES_FIELD = {
  id: MEASURE_VALUES_ID,
  name: MEASURE_VALUES_ID,
  label: 'Measure Values',
  displayName: 'Значения показателей',
  type: 'float',
  source: 'virtual'
}

export function isMeasureNamesField(f) {
  if (!f) return false
  const name = f.name ?? f.id
  return name === MEASURE_NAMES_ID
}

export function isMeasureValuesField(f) {
  if (!f) return false
  const name = f.name ?? f.id
  return name === MEASURE_VALUES_ID
}

export function isVirtualMeasureField(f) {
  return isMeasureNamesField(f) || isMeasureValuesField(f)
}
