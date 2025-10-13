<template>
    <div class="table-responsive">
        <table class="table align-middle mb-0 bi-grid-table" :class="tableClasses">
            <thead>
                <tr>
                    <th v-for="col in resolvedColumns" :key="col.key" :style="{ width: col.width || undefined }"
                        :class="headerAlignClass(col)">
                        {{ col.label }}
                    </th>
                    <th class="text-end action-col" style="width:1%"></th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(row, idx) in normalizedRows" :key="row.name || idx" :class="{ 'row-active': openMenuForIndex === idx }" @click="emitAction('edit', row, idx)">
                    <td v-for="col in resolvedColumns" :key="col.key" :class="cellAlignClass(col)">
                        <slot v-if="col.slot" :name="col.slot" :row="row" :column="col" :value="cellValue(row, col)">
                        </slot>
                        <template v-else>
                            <span v-if="isIconCell(cellValue(row, col))" class="d-inline-flex align-items-center gap-2">
                                <component :is="cellValue(row, col).icon" class="lucide"
                                    :size="iconSize(cellValue(row, col))" :class="cellValue(row, col).iconClass" />
                                <span :class="cellValue(row, col).textClass">{{ cellValue(row, col).text }}</span>
                            </span>
                            <span v-else>{{ cellValue(row, col) }}</span>
                        </template>
                    </td>
                    <td class="text-end action-col">
                        <button type="button" class="btn btn-light btn-sm row-action-btn" @click.stop="openMenu($event, row, idx)">
                            <MoreHorizontal class="lucide" :size="16" />
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
    <teleport to="body">
        <div v-if="openMenuForIndex !== null" ref="menuEl" class="action-menu" :style="{ top: menuPosition.top + 'px', left: menuPosition.left + 'px' }">
            <button class="action-item" type="button" @click.stop="emitAction('duplicate', currentRow, openMenuForIndex)">Дублировать</button>
            <button class="action-item" type="button" @click.stop="emitAction('edit', currentRow, openMenuForIndex)">Редактировать</button>
            <button class="action-item" type="button" @click.stop="emitAction('copyId', currentRow, openMenuForIndex)">Скопировать ID</button>
            <button class="action-item text-danger" type="button" @click.stop="emitAction('delete', currentRow, openMenuForIndex)">Удалить</button>
        </div>
    </teleport>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Type as TypeIcon, Hash, Binary, CheckSquare, Calendar, CalendarClock, XCircle, CheckCircle2, MoreHorizontal } from 'lucide-vue-next'

const props = defineProps({
    rows: {
        type: Array,
        default: () => ([
            { name: 'scaleru', type: 'string', defaultValue: 'месяц', sourceUsage: false },
            { name: 'mavg-value', type: 'integer', defaultValue: 7, sourceUsage: false },
            { name: 'dimension', type: 'string', defaultValue: 'Магазин', sourceUsage: false },
            { name: 'RUB-EUR', type: 'float', defaultValue: 90.5, sourceUsage: false },
            { name: 'RUB-USD', type: 'float', defaultValue: 80.5, sourceUsage: false },
            { name: 'currency', type: 'string', defaultValue: 'RUB', sourceUsage: false },
            { name: 'ago-period', type: 'integer', defaultValue: 1, sourceUsage: false },
            { name: 'scale', type: 'string', defaultValue: 'month', sourceUsage: false },
        ]),
    },
    columns: {
        type: Array,
        default: () => ([
            { key: 'name', label: 'Имя параметра', width: '32%' },
            { key: 'type', label: 'Тип', width: '18%' },
            { key: 'defaultValue', label: 'Значение по умолчанию', width: '25%' },
            { key: 'sourceUsage', label: 'Использование в настройке источника', width: '25%' },
        ]),
    },
    bordered: { type: Boolean, default: false },
    striped: { type: Boolean, default: true },
    hover: { type: Boolean, default: true },
    small: { type: Boolean, default: false },
})

const typeMap = {
    string: { label: 'Строка', icon: TypeIcon },
    integer: { label: 'Целое число', icon: Hash },
    float: { label: 'Дробное число', icon: Binary },
    boolean: { label: 'Логический', icon: CheckSquare },
    date: { label: 'Дата', icon: Calendar },
    datetime: { label: 'Дата и время', icon: CalendarClock },
}

const resolvedColumns = computed(() => props.columns)

const normalizedRows = computed(() => {
    return props.rows.map(r => {
        const t = typeMap[r.type] || typeMap.string
        const usageIcon = r.sourceUsage ? { icon: CheckCircle2, text: 'Разрешено', iconClass: 'text-success', textClass: 'text-success' } : { icon: XCircle, text: 'Запрещено', iconClass: 'text-secondary', textClass: 'text-secondary' }
        return {
            ...r,
            typeLabel: t.label,
            typeIcon: t.icon,
            sourceUsageIcon: usageIcon,
        }
    })
})

function tableAlignClass(align) {
    if (align === 'end') return 'text-end'
    if (align === 'center') return 'text-center'
    return 'text-start'
}

function headerAlignClass(col) {
    return tableAlignClass(col.align)
}

function cellAlignClass(col) {
    return tableAlignClass(col.align)
}

function isIconCell(value) {
    return value && typeof value === 'object' && (value.icon || value.text)
}

function cellValue(row, col) {
    if (col.render && typeof col.render === 'function') return col.render(row)
    if (col.key === 'type') {
        return { icon: (typeMap[row.type] || typeMap.string).icon, text: (typeMap[row.type] || typeMap.string).label }
    }
    if (col.key === 'sourceUsage') {
        return row.sourceUsageIcon
    }
    return row[col.key]
}

function iconSize(value) {
    return value && value.icon === XCircle ? 14 : 12
}

const tableClasses = computed(() => ({
    'table-bordered': props.bordered,
    'table-striped': props.striped,
    'table-hover': props.hover,
    'table-sm': props.small,
}))

const openMenuForIndex = ref(null)
const currentRow = ref(null)
const menuPosition = ref({ top: 0, left: 0 })
const menuEl = ref(null)

function openMenu(event, row, index){
    currentRow.value = row
    openMenuForIndex.value = index
    const rect = (event.currentTarget || event.target).getBoundingClientRect()
    menuPosition.value = { top: Math.round(rect.bottom + window.scrollY + 6), left: Math.round(rect.right + window.scrollX - 200) }
    nextTick(() => adjustMenuToViewport())
}

const emit = defineEmits(['duplicate', 'edit', 'copyId', 'delete'])
function emitAction(type, row, index){
    if(type === 'duplicate') emit('duplicate', { row, index })
    if(type === 'edit') emit('edit', { row, index })
    if(type === 'copyId') emit('copyId', { row, index })
    if(type === 'delete') emit('delete', { row, index })
    openMenuForIndex.value = null
}

function adjustMenuToViewport(){
    const el = menuEl.value
    if(!el) return
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const rect = el.getBoundingClientRect()
    let top = menuPosition.value.top
    let left = menuPosition.value.left
    if(rect.bottom > viewportHeight){
        top = Math.max(8 + window.scrollY, viewportHeight + window.scrollY - rect.height - 8)
    }
    if(rect.right > viewportWidth){
        left = Math.max(8 + window.scrollX, viewportWidth + window.scrollX - rect.width - 8)
    }
    menuPosition.value = { top, left }
}

function handleGlobalClick(e){
    const el = menuEl.value
    if(el && !el.contains(e.target)){
        openMenuForIndex.value = null
    }
}

onMounted(()=> {
    document.addEventListener('click', handleGlobalClick)
    window.addEventListener('resize', adjustMenuToViewport)
    window.addEventListener('scroll', adjustMenuToViewport, true)
})
onBeforeUnmount(()=> {
    document.removeEventListener('click', handleGlobalClick)
    window.removeEventListener('resize', adjustMenuToViewport)
    window.removeEventListener('scroll', adjustMenuToViewport, true)
})
</script>

<style scoped>
.lucide {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    color: #b388ff;
}

.bi-grid-table {
    color: var(--color-primary-text);
    background-color: transparent;
    border: none !important;
    /* Прозрачные фоны Bootstrap-таблицы */
    --bs-table-bg: transparent;
    --bs-table-accent-bg: transparent;
    --bs-table-striped-bg: transparent;
    --bs-table-striped-color: inherit;
}

.bi-grid-table thead {
    background-color: transparent !important;
}

.bi-grid-table :is(th, td) {
    border-color: var(--color-border) !important;
}

.bi-grid-table thead tr th {
    border-top-width: 0 !important;
    font-size: 14px;
}

.bi-grid-table tbody tr:last-child td {
    border-bottom-width: 1px !important;
}

.bi-grid-table :is(th, td):first-child {
    border-left-width: 0 !important;
}

.bi-grid-table :is(th, td):last-child {
    border-right-width: 0 !important;
}

.bi-grid-table tbody tr {
    background-color: transparent;
}

.table-hover > tbody > tr:hover {
    color: var(--bs-table-hover-color);
    background-color: var(--bs-table-hover-bg);
    cursor: pointer;
}

.table-hover > tbody > tr.row-active {
    background-color: var(--bs-table-hover-bg);
}

/* Снятие фоновых полос у .table-striped, если включено */
.table-striped > tbody > tr:nth-of-type(odd) > * {
    color: inherit;
    background-color: transparent !important;
}
.bi-grid-table tbody tr.row-active .row-action-btn {
    opacity: 1;
}

.bi-grid-table .action-col {
    width: 1%;
    white-space: nowrap;
}

.bi-grid-table .row-action-btn {
    opacity: 0;
    transition: opacity .15s ease-in-out;
}

.bi-grid-table tbody tr:hover .row-action-btn {
    opacity: 1;
}

.bi-grid-table .row-action-btn.btn {
    background-color: var(--color-secondary-background) !important;
    color: var(--color-primary-text) !important;
    border-color: var(--color-border) !important;
    box-shadow: none !important;
}

.bi-grid-table .row-action-btn.btn:hover,
.bi-grid-table .row-action-btn.btn:focus {
    background-color: var(--color-hover-background) !important;
    color: var(--color-primary-text) !important;
    border-color: var(--color-border) !important;
}

.bi-grid-table .row-action-btn .lucide {
    color: var(--color-accent);
}

.action-menu{
    position: fixed;
    min-width: 200px;
    background-color: var(--color-primary-background);
    color: var(--color-primary-text);
    border: 1px solid var(--color-border);
    border-radius: .5rem;
    box-shadow: 0 .5rem 1rem rgba(0,0,0,.15);
    z-index: 1000;
    padding: .25rem 0;
}
.action-menu .action-item{
    display: block;
    width: 100%;
    text-align: left;
    padding: .5rem .75rem;
    background: transparent;
    border: 0;
    color: var(--color-primary-text);
    font-size: 14px;
}
.action-menu .action-item:hover{
    background-color: var(--color-hover-background);
}
.action-menu .action-item.text-danger{
    color: #dc3545 !important;
}
</style>
