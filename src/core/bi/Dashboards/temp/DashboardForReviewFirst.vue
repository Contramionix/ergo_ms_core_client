<template>
  <div class="learning-dashboard-page">
    <header class="learning-dashboard-header">
      <div class="learning-dashboard-title-block">
        <h2 class="learning-dashboard-title">Учебная нагрузка: обзорный дашборд</h2>
        <p class="learning-dashboard-subtitle">
          Сравнение учебной нагрузки преподавателей по учебным годам, факультетам и основным метрикам.
          Данные основаны на выгрузке из файла «Сравнение_нагрузки__09_06_2025.xlsx».
        </p>
      </div>
    </header>

    <main class="learning-dashboard-content container-fluid">
      <div class="row gy-4">
        <!-- Фильтры верхнего уровня -->
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

        <!-- KPI карточки -->
        <div class="col-12">
          <section class="dashboard-card">
            <div class="row g-3">
              <div class="col-6 col-xl-3">
                <div class="kpi-card">
                  <div class="kpi-label">Итого часов</div>
                  <div class="kpi-value">
                    {{ formatNumber(kpiCurrent.totalHours) }}
                  </div>
                  <div
                    class="kpi-delta"
                    :class="{
                      'kpi-delta--positive': kpiDelta.totalHours > 0,
                      'kpi-delta--negative': kpiDelta.totalHours < 0
                    }"
                  >
                    <span v-if="kpiDelta.totalHours !== 0">
                      {{ kpiDelta.totalHours > 0 ? '+' : '' }}{{ kpiDelta.totalHours.toFixed(1) }}%
                      к {{ previousYearLabel }}
                    </span>
                    <span v-else>без изменений</span>
                  </div>
                </div>
              </div>
              <div class="col-6 col-xl-3">
                <div class="kpi-card">
                  <div class="kpi-label">Количество преподавателей</div>
                  <div class="kpi-value">
                    {{ formatNumber(kpiCurrent.teachersCount) }}
                  </div>
                  <div
                    class="kpi-delta"
                    :class="{
                      'kpi-delta--positive': kpiDelta.teachersCount > 0,
                      'kpi-delta--negative': kpiDelta.teachersCount < 0
                    }"
                  >
                    <span v-if="kpiDelta.teachersCount !== 0">
                      {{ kpiDelta.teachersCount > 0 ? '+' : '' }}{{ kpiDelta.teachersCount.toFixed(1) }}%
                      к {{ previousYearLabel }}
                    </span>
                    <span v-else>без изменений</span>
                  </div>
                </div>
              </div>
              <div class="col-6 col-xl-3">
                <div class="kpi-card">
                  <div class="kpi-label">Средняя нагрузка на преподавателя</div>
                  <div class="kpi-value">
                    {{ kpiCurrent.avgHoursPerTeacher.toFixed(1) }} ч
                  </div>
                  <div
                    class="kpi-delta"
                    :class="{
                      'kpi-delta--positive': kpiDelta.avgHoursPerTeacher > 0,
                      'kpi-delta--negative': kpiDelta.avgHoursPerTeacher < 0
                    }"
                  >
                    <span v-if="kpiDelta.avgHoursPerTeacher !== 0">
                      {{ kpiDelta.avgHoursPerTeacher > 0 ? '+' : '' }}{{ kpiDelta.avgHoursPerTeacher.toFixed(1) }}%
                      к {{ previousYearLabel }}
                    </span>
                    <span v-else>без изменений</span>
                  </div>
                </div>
              </div>
              <div class="col-6 col-xl-3">
                <div class="kpi-card">
                  <div class="kpi-label">Количество студентов</div>
                  <div class="kpi-value">
                    {{ formatNumber(kpiCurrent.studentsCount) }}
                  </div>
                  <div
                    class="kpi-delta"
                    :class="{
                      'kpi-delta--positive': kpiDelta.studentsCount > 0,
                      'kpi-delta--negative': kpiDelta.studentsCount < 0
                    }"
                  >
                    <span v-if="kpiDelta.studentsCount !== 0">
                      {{ kpiDelta.studentsCount > 0 ? '+' : '' }}{{ kpiDelta.studentsCount.toFixed(1) }}%
                      к {{ previousYearLabel }}
                    </span>
                    <span v-else>без изменений</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Сравнение нагрузки по годам -->
        <div class="col-12 col-xl-7">
          <section class="dashboard-card">
            <h3 class="dashboard-card-title">Сравнение нагрузки по учебным годам</h3>
            <p class="dashboard-card-text">
              Суммарная учебная нагрузка (часы) по годам набора. Позволяет оценить общую
              динамику изменения нагрузки в университете.
            </p>
            <ChartJsComponent
              type="bar"
              :fields="yearComparisonFields"
              :dataset="yearComparisonDataset"
            />
          </section>
        </div>

        <!-- Распределение нагрузки по факультетам -->
        <div class="col-12 col-xl-5">
          <section class="dashboard-card">
            <h3 class="dashboard-card-title">
              Распределение нагрузки по факультетам ({{ selectedYear }})
            </h3>
            <p class="dashboard-card-text">
              Горизонтальное распределение суммарных часов по факультетам.
              Используйте фильтр «Факультет» для фокуса на конкретном подразделении.
            </p>
            <ChartJsComponent
              type="bar"
              :fields="facultyLoadFields"
              :dataset="facultyLoadDataset"
            />
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import ChartJsComponent from '@/core/bi/Charts/ChartJsComponent.vue'

// Заглушка агрегированных данных по годам и факультетам.
// В боевой реализации сюда можно подставить данные из BI‑датасета
// на основе Excel «Сравнение_нагрузки__09_06_2025.xlsx».
const aggregatedLoad = [
  {
    year: '2024-2025',
    faculty: 'ФИТ',
    totalHours: 42000,
    teachersCount: 120,
    studentsCount: 2600
  },
  {
    year: '2024-2025',
    faculty: 'УНИТ',
    totalHours: 38000,
    teachersCount: 95,
    studentsCount: 2100
  },
  {
    year: '2024-2025',
    faculty: 'УНТИ',
    totalHours: 35000,
    teachersCount: 90,
    studentsCount: 1900
  },
  {
    year: '2024-2025',
    faculty: 'ФЭЭ',
    totalHours: 31000,
    teachersCount: 80,
    studentsCount: 1700
  },
  {
    year: '2024-2025',
    faculty: 'МТФ',
    totalHours: 29000,
    teachersCount: 75,
    studentsCount: 1500
  },
  {
    year: '2024-2025',
    faculty: 'ФОЦЭ',
    totalHours: 26000,
    teachersCount: 60,
    studentsCount: 1300
  },
  {
    year: '2025-2026',
    faculty: 'ФИТ',
    totalHours: 44500,
    teachersCount: 125,
    studentsCount: 2750
  },
  {
    year: '2025-2026',
    faculty: 'УНИТ',
    totalHours: 39200,
    teachersCount: 98,
    studentsCount: 2200
  },
  {
    year: '2025-2026',
    faculty: 'УНТИ',
    totalHours: 36600,
    teachersCount: 92,
    studentsCount: 2000
  },
  {
    year: '2025-2026',
    faculty: 'ФЭЭ',
    totalHours: 32750,
    teachersCount: 82,
    studentsCount: 1780
  },
  {
    year: '2025-2026',
    faculty: 'МТФ',
    totalHours: 30100,
    teachersCount: 77,
    studentsCount: 1560
  },
  {
    year: '2025-2026',
    faculty: 'ФОЦЭ',
    totalHours: 27500,
    teachersCount: 62,
    studentsCount: 1360
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

const previousYearLabel = computed(() => {
  return selectedYear.value === '2025-2026' ? '2024-2025' : 'предыдущему году'
})

const kpiCurrent = computed(() => {
  const rows = aggregatedLoad.filter(
    (row) =>
      row.year === selectedYear.value &&
      (!selectedFaculty.value || row.faculty === selectedFaculty.value)
  )
  const totalHours = rows.reduce((acc, row) => acc + row.totalHours, 0)
  const teachersCount = rows.reduce((acc, row) => acc + row.teachersCount, 0)
  const studentsCount = rows.reduce((acc, row) => acc + row.studentsCount, 0)
  const avgHoursPerTeacher = teachersCount ? totalHours / teachersCount : 0

  return {
    totalHours,
    teachersCount,
    studentsCount,
    avgHoursPerTeacher
  }
})

const kpiPrevious = computed(() => {
  const prevYear = selectedYear.value === '2025-2026' ? '2024-2025' : '2024-2025'
  const rows = aggregatedLoad.filter(
    (row) =>
      row.year === prevYear &&
      (!selectedFaculty.value || row.faculty === selectedFaculty.value)
  )
  const totalHours = rows.reduce((acc, row) => acc + row.totalHours, 0)
  const teachersCount = rows.reduce((acc, row) => acc + row.teachersCount, 0)
  const studentsCount = rows.reduce((acc, row) => acc + row.studentsCount, 0)
  const avgHoursPerTeacher = teachersCount ? totalHours / teachersCount : 0

  return {
    totalHours,
    teachersCount,
    studentsCount,
    avgHoursPerTeacher
  }
})

const kpiDelta = computed(() => {
  const curr = kpiCurrent.value
  const prev = kpiPrevious.value

  const calcDelta = (currentValue, previousValue) => {
    if (!previousValue) return 0
    return ((currentValue - previousValue) / previousValue) * 100
  }

  return {
    totalHours: calcDelta(curr.totalHours, prev.totalHours),
    teachersCount: calcDelta(curr.teachersCount, prev.teachersCount),
    studentsCount: calcDelta(curr.studentsCount, prev.studentsCount),
    avgHoursPerTeacher: calcDelta(
      curr.avgHoursPerTeacher,
      prev.avgHoursPerTeacher
    )
  }
})

// Сравнение нагрузки по годам (столбчатый график)
const yearComparisonFields = {
  x: [{ name: 'year', label: 'Учебный год' }],
  y: [{ name: 'totalHours', label: 'Итого часов' }]
}

const yearComparisonDataset = computed(() => {
  return availableYears.map((year) => {
    const rows = aggregatedLoad.filter((row) => row.year === year)
    const totalHours = rows.reduce((acc, row) => acc + row.totalHours, 0)
    return {
      year,
      totalHours
    }
  })
})

// Распределение нагрузки по факультетам (горизонтальный барчарт)
const facultyLoadFields = {
  x: [{ name: 'faculty', label: 'Факультет' }],
  y: [{ name: 'totalHours', label: 'Часы' }]
}

const facultyLoadDataset = computed(() => {
  const rows = aggregatedLoad.filter(
    (row) => row.year === selectedYear.value
  )

  const byFaculty = rows.reduce((acc, row) => {
    const current = acc[row.faculty] || 0
    acc[row.faculty] = current + row.totalHours
    return acc
  }, {})

  return Object.entries(byFaculty)
    .map(([faculty, totalHours]) => ({
      faculty,
      totalHours
    }))
    .sort((a, b) => b.totalHours - a.totalHours)
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

.kpi-card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.kpi-label {
  font-size: 0.8rem;
  color: var(--color-secondary-text);
}

.kpi-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-primary-text);
}

.kpi-delta {
  font-size: 0.8rem;
  color: var(--color-secondary-text);
}

.kpi-delta--positive {
  color: #1ea97c;
}

.kpi-delta--negative {
  color: #e55353;
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


