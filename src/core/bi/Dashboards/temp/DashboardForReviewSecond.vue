<template>
  <div class="learning-dashboard-page">
    <header class="learning-dashboard-header">
      <div class="learning-dashboard-title-block">
        <h2 class="learning-dashboard-title">Учебная нагрузка: факультеты, кафедры и виды занятий</h2>
        <p class="learning-dashboard-subtitle">
          Детализированный анализ нагрузки по факультетам, кафедрам и видам занятий.
          Используйте фильтры, чтобы увидеть распределение часов и динамику между учебными годами.
        </p>
      </div>
    </header>

    <main class="learning-dashboard-content container-fluid">
      <div class="row gy-4">
        <!-- Фильтры -->
        <div class="col-12">
          <section class="dashboard-card dashboard-card--filters">
            <div class="row g-3 align-items-end">
              <div class="col-6 col-md-3">
                <label class="form-label dashboard-filter-label">Учебный год</label>
                <select
                  v-model="selectedYear"
                  class="form-select form-select-sm"
                >
                  <option
                    v-for="year in availableYears"
                    :key="year"
                    :value="year"
                  >
                    {{ year }}
                  </option>
                </select>
              </div>
              <div class="col-6 col-md-3">
                <label class="form-label dashboard-filter-label">Факультет</label>
                <select
                  v-model="selectedFaculty"
                  class="form-select form-select-sm"
                >
                  <option value="">Все факультеты</option>
                  <option
                    v-for="faculty in availableFaculties"
                    :key="faculty"
                    :value="faculty"
                  >
                    {{ faculty }}
                  </option>
                </select>
              </div>
            </div>
          </section>
        </div>

        <!-- Иерархия: факультет - кафедра -->
        <div class="col-12 col-xl-7">
          <section class="dashboard-card">
            <h3 class="dashboard-card-title">Нагрузка по факультетам и кафедрам</h3>
            <p class="dashboard-card-text">
              Суммарные часы по факультетам и кафедрам за выбранный учебный год.
              Используйте фильтр «Факультет», чтобы сфокусироваться на конкретном факультете.
            </p>
            <ApexChartsComponent
              type="bar"
              :fields="departmentHierarchyFields"
              :dataset="departmentHierarchyDataset"
            />
          </section>
        </div>

        <!-- Топ-10 кафедр по нагрузке -->
        <div class="col-12 col-xl-5">
          <section class="dashboard-card">
            <h3 class="dashboard-card-title">Топ‑10 кафедр по нагрузке</h3>
            <p class="dashboard-card-text">
              Кафедры с наибольшей суммарной нагрузкой (часы) и динамикой год к году.
            </p>
            <div class="table-responsive">
              <table class="table table-sm mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Кафедра</th>
                    <th class="text-end">Часы</th>
                    <th class="text-end">Δ % к прошлому году</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in topDepartments"
                    :key="row.department"
                  >
                    <td>
                      <div class="fw-semibold">{{ row.department }}</div>
                      <div class="text-muted small">{{ row.faculty }}</div>
                    </td>
                    <td class="text-end">
                      {{ formatNumber(row.totalHours) }}
                    </td>
                    <td
                      class="text-end"
                      :class="{
                        'text-success': row.deltaPct > 0,
                        'text-danger': row.deltaPct < 0
                      }"
                    >
                      <span v-if="row.deltaPct !== 0">
                        {{ row.deltaPct > 0 ? '+' : '' }}{{ row.deltaPct.toFixed(1) }}%
                      </span>
                      <span v-else class="text-muted">0%</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <!-- Анализ видов занятий -->
        <div class="col-12 col-xl-6">
          <section class="dashboard-card">
            <h3 class="dashboard-card-title">Распределение часов по видам занятий</h3>
            <p class="dashboard-card-text">
              Доля часов по основным видам занятий для выбранных фильтров.
            </p>
            <ChartJsComponent
              type="doughnut"
              :fields="activityTypePieFields"
              :dataset="activityTypePieDataset"
            />
          </section>
        </div>

        <div class="col-12 col-xl-6">
          <section class="dashboard-card">
            <h3 class="dashboard-card-title">Сравнение видов занятий по годам</h3>
            <p class="dashboard-card-text">
              Сопоставление суммарных часов по основным видам занятий между учебными годами.
            </p>
            <ChartJsComponent
              type="bar"
              :fields="activityTypeComparisonFields"
              :dataset="activityTypeComparisonDataset"
            />
          </section>
        </div>

        <div class="col-12">
          <section class="dashboard-card">
            <h3 class="dashboard-card-title">Динамика нагрузки по видам занятий</h3>
            <p class="dashboard-card-text">
              Изменение нагрузки по видам занятий между годами. Линии отражают ключевые типы занятий:
              лекции, практики, лабораторные и итоговые работы.
            </p>
            <ChartJsComponent
              type="line"
              :fields="activityTypeTrendFields"
              :dataset="activityTypeTrendDataset"
            />
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import ApexChartsComponent from '@/core/bi/Charts/ApexChartsComponent.vue'
import ChartJsComponent from '@/core/bi/Charts/ChartJsComponent.vue'

// Заглушка детализированных данных по кафедрам и видам занятий
// для двух учебных годов. В боевой версии можно заменить на данные
// из BI‑датасета, собранного на основе Excel файла.
const detailedLoad = [
  {
    year: '2024-2025',
    faculty: 'ФИТ',
    department: '8-ИиПО',
    activityType: 'Лекции',
    hours: 8200
  },
  {
    year: '2024-2025',
    faculty: 'ФИТ',
    department: '8-ИиПО',
    activityType: 'Практики',
    hours: 5400
  },
  {
    year: '2024-2025',
    faculty: 'ФИТ',
    department: '8-ИиПО',
    activityType: 'Лабораторные',
    hours: 3600
  },
  {
    year: '2024-2025',
    faculty: 'УНИТ',
    department: '24-ГиСД',
    activityType: 'Лекции',
    hours: 6100
  },
  {
    year: '2024-2025',
    faculty: 'УНИТ',
    department: '24-ГиСД',
    activityType: 'Практики',
    hours: 4300
  },
  {
    year: '2024-2025',
    faculty: 'УНТИ',
    department: '9-КТС',
    activityType: 'Лекции',
    hours: 5200
  },
  {
    year: '2024-2025',
    faculty: 'УНТИ',
    department: '9-КТС',
    activityType: 'Лабораторные',
    hours: 4100
  },
  {
    year: '2024-2025',
    faculty: 'ФЭЭ',
    department: '12-ЭЭ',
    activityType: 'Лекции',
    hours: 4900
  },
  {
    year: '2024-2025',
    faculty: 'МТФ',
    department: '15-МТ',
    activityType: 'Лекции',
    hours: 4600
  },
  {
    year: '2024-2025',
    faculty: 'ФОЦЭ',
    department: '20-ОЦЭ',
    activityType: 'Лекции',
    hours: 3800
  },
  // 2025-2026
  {
    year: '2025-2026',
    faculty: 'ФИТ',
    department: '8-ИиПО',
    activityType: 'Лекции',
    hours: 8600
  },
  {
    year: '2025-2026',
    faculty: 'ФИТ',
    department: '8-ИиПО',
    activityType: 'Практики',
    hours: 5700
  },
  {
    year: '2025-2026',
    faculty: 'ФИТ',
    department: '8-ИиПО',
    activityType: 'Лабораторные',
    hours: 3850
  },
  {
    year: '2025-2026',
    faculty: 'УНИТ',
    department: '24-ГиСД',
    activityType: 'Лекции',
    hours: 6400
  },
  {
    year: '2025-2026',
    faculty: 'УНИТ',
    department: '24-ГиСД',
    activityType: 'Практики',
    hours: 4520
  },
  {
    year: '2025-2026',
    faculty: 'УНТИ',
    department: '9-КТС',
    activityType: 'Лекции',
    hours: 5480
  },
  {
    year: '2025-2026',
    faculty: 'УНТИ',
    department: '9-КТС',
    activityType: 'Лабораторные',
    hours: 4320
  },
  {
    year: '2025-2026',
    faculty: 'ФЭЭ',
    department: '12-ЭЭ',
    activityType: 'Лекции',
    hours: 5120
  },
  {
    year: '2025-2026',
    faculty: 'МТФ',
    department: '15-МТ',
    activityType: 'Лекции',
    hours: 4780
  },
  {
    year: '2025-2026',
    faculty: 'ФОЦЭ',
    department: '20-ОЦЭ',
    activityType: 'Лекции',
    hours: 3950
  },
  // Итоговые виды работ (ВКР, КП) как пример
  {
    year: '2024-2025',
    faculty: 'ФИТ',
    department: '8-ИиПО',
    activityType: 'ВКР',
    hours: 900
  },
  {
    year: '2025-2026',
    faculty: 'ФИТ',
    department: '8-ИиПО',
    activityType: 'ВКР',
    hours: 980
  }
]

const availableYears = ['2024-2025', '2025-2026']
const availableFaculties = ['ФИТ', 'УНИТ', 'УНТИ', 'ФЭЭ', 'МТФ', 'ФОЦЭ']

const selectedYear = ref('2025-2026')
const selectedFaculty = ref('')

const formatNumber = (value) => {
  if (value == null) return '0'
  return value.toLocaleString('ru-RU')
}

// Иерархия факультет - кафедра (столбчатый график)
const departmentHierarchyFields = {
  x: [{ name: 'label', label: 'Кафедра' }],
  y: [{ name: 'totalHours', label: 'Часы' }]
}

const departmentHierarchyDataset = computed(() => {
  const rows = detailedLoad.filter(
    (row) =>
      row.year === selectedYear.value &&
      (!selectedFaculty.value || row.faculty === selectedFaculty.value)
  )

  const totals = rows.reduce((acc, row) => {
    const key = `${row.faculty}::${row.department}`
    const current = acc[key] || { faculty: row.faculty, department: row.department, totalHours: 0 }
    current.totalHours += row.hours
    acc[key] = current
    return acc
  }, {})

  return Object.values(totals)
    .sort((a, b) => b.totalHours - a.totalHours)
    .map((item) => ({
      label: `${item.faculty} / ${item.department}`,
      totalHours: item.totalHours
    }))
})

// Топ-10 кафедр по нагрузке с динамикой
const topDepartments = computed(() => {
  const currentYear = selectedYear.value
  const prevYear = currentYear === '2025-2026' ? '2024-2025' : '2024-2025'

  const aggregateByYear = (year) => {
    const rows = detailedLoad.filter(
      (row) =>
        row.year === year &&
        (!selectedFaculty.value || row.faculty === selectedFaculty.value)
    )

    return rows.reduce((acc, row) => {
      const key = `${row.faculty}::${row.department}`
      const current = acc[key] || {
        faculty: row.faculty,
        department: row.department,
        totalHours: 0
      }
      current.totalHours += row.hours
      acc[key] = current
      return acc
    }, {})
  }

  const currentAgg = aggregateByYear(currentYear)
  const prevAgg = aggregateByYear(prevYear)

  const rows = Object.entries(currentAgg).map(([key, value]) => {
    const prev = prevAgg[key]
    const prevHours = prev ? prev.totalHours : 0
    const deltaPct = prevHours
      ? ((value.totalHours - prevHours) / prevHours) * 100
      : 0

    return {
      faculty: value.faculty,
      department: value.department,
      totalHours: value.totalHours,
      deltaPct
    }
  })

  return rows.sort((a, b) => b.totalHours - a.totalHours).slice(0, 10)
})

// Виды занятий: круговая диаграмма
const activityTypePieFields = {
  category: [{ name: 'activityType', label: 'Вид занятия' }],
  indicators: [{ name: 'hours', label: 'Часы' }]
}

const activityTypePieDataset = computed(() => {
  const rows = detailedLoad.filter(
    (row) =>
      row.year === selectedYear.value &&
      (!selectedFaculty.value || row.faculty === selectedFaculty.value)
  )

  const byType = rows.reduce((acc, row) => {
    const current = acc[row.activityType] || 0
    acc[row.activityType] = current + row.hours
    return acc
  }, {})

  return Object.entries(byType).map(([activityType, hours]) => ({
    activityType,
    hours
  }))
})

// Сравнение видов занятий по годам (барчарт)
const activityTypeComparisonFields = {
  x: [{ name: 'activityType', label: 'Вид занятия' }],
  y: [
    { name: 'hours_2024_2025', label: '2024-2025' },
    { name: 'hours_2025_2026', label: '2025-2026' }
  ]
}

const activityTypeComparisonDataset = computed(() => {
  const years = ['2024-2025', '2025-2026']

  const aggregate = (year) => {
    const rows = detailedLoad.filter(
      (row) =>
        row.year === year &&
        (!selectedFaculty.value || row.faculty === selectedFaculty.value)
    )
    return rows.reduce((acc, row) => {
      const current = acc[row.activityType] || 0
      acc[row.activityType] = current + row.hours
      return acc
    }, {})
  }

  const data2024 = aggregate(years[0])
  const data2025 = aggregate(years[1])

  const allTypes = Array.from(
    new Set([...Object.keys(data2024), ...Object.keys(data2025)])
  )

  return allTypes.map((activityType) => ({
    activityType,
    hours_2024_2025: data2024[activityType] || 0,
    hours_2025_2026: data2025[activityType] || 0
  }))
})

// Динамика нагрузки по видам занятий (линейный график)
const activityTypeTrendFields = {
  x: [{ name: 'year', label: 'Учебный год' }],
  y: [
    { name: 'lectures', label: 'Лекции' },
    { name: 'practices', label: 'Практики' },
    { name: 'labs', label: 'Лабораторные' },
    { name: 'finalWorks', label: 'ВКР/КП' }
  ]
}

const activityTypeTrendDataset = computed(() => {
  const mapRows = (year) => {
    const rows = detailedLoad.filter(
      (row) =>
        row.year === year &&
        (!selectedFaculty.value || row.faculty === selectedFaculty.value)
    )

    const sumByType = (typeNames) =>
      rows
        .filter((row) => typeNames.includes(row.activityType))
        .reduce((acc, row) => acc + row.hours, 0)

    return {
      year,
      lectures: sumByType(['Лекции']),
      practices: sumByType(['Практики']),
      labs: sumByType(['Лабораторные']),
      finalWorks: sumByType(['ВКР', 'КП', 'ГАК'])
    }
  }

  return ['2024-2025', '2025-2026'].map(mapRows)
})
</script>

<style scoped lang="scss">
.learning-dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.learning-dashboard-header {
  padding: 1.25rem 0 0.25rem 0;
}

.learning-dashboard-title-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.learning-dashboard-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-primary-text);
  margin: 0;
}

.learning-dashboard-subtitle {
  margin: 0;
  font-size: 0.95rem;
  color: var(--color-secondary-text);
  max-width: 960px;
}

.learning-dashboard-content {
  padding: 0;
}

.dashboard-card {
  background-color: var(--color-primary-background);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
}

.dashboard-card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-primary-text);
  margin: 0;
}

.dashboard-card-text {
  font-size: 0.95rem;
  color: var(--color-secondary-text);
  margin: 0;
}

.dashboard-card--filters {
  padding-bottom: 0.75rem;
}

.dashboard-filter-label {
  font-size: 0.8rem;
  color: var(--color-secondary-text);
}

.dashboard-card-text ul {
  margin-top: 0.5rem;
  margin-bottom: 0;
  padding-left: 1.25rem;
}

.dashboard-card-text li {
  margin-bottom: 0.35rem;
}

@media (max-width: 991.98px) {
  .dashboard-card {
    padding: 1rem 1rem;
  }
}

@media (max-width: 575.98px) {
  .learning-dashboard-title {
    font-size: 1.25rem;
  }

  .dashboard-card-title {
    font-size: 1rem;
  }
}
</style>


