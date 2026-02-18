import { BarChart2 } from 'lucide-vue-next'
import { getTypeDisplayMeta } from '@/core/bi/Datasets/Fields/js/fieldTypeDisplay.js'
import { isVirtualMeasureField } from './measureVirtualFields.js'

export function getFieldIcon(f, virtualIcon = BarChart2) {
  if (isVirtualMeasureField(f)) return virtualIcon
  return getTypeDisplayMeta(f?.type).icon
}

export function getFieldDisplayName(f) {
  if (isVirtualMeasureField(f)) return f.displayName ?? f.label ?? f.name
  return f.displayName ?? f.name
}
