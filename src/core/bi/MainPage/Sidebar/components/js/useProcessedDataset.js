import { computed } from 'vue'
import { makeSortComparator } from '@/core/bi/js/sortComparator.js'

export default function useProcessedDataset(datasetRef, fieldsRef) {
  return computed(() => {
    const rows = (datasetRef.value || []).slice()
    const sortBy = fieldsRef.value.sort?.[0]
    const fieldName = sortBy ? (sortBy.field ?? sortBy.name) : null

    if (sortBy && fieldName != null) {
      rows.sort(makeSortComparator(fieldName, sortBy.desc === true))
    }
    return rows
  })
}