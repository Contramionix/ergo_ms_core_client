<template>
    <div class="select-box" ref="rootEl" :style="rootCssVars">
        <label v-if="label" class="form-label mb-1">{{ label }}</label>
        <div
            class="dropdown"
            :class="{ 'is-open': isOpen }"
            @mouseenter="onHoverZoneEnter"
            @mouseleave="onHoverZoneLeave"
        >
            <button class="btn btn-light w-100 d-flex align-items-center justify-content-between select-trigger" :class="{ 'select-trigger--open': isOpen }" type="button" :disabled="disabled" @click="toggle" @blur="$emit('blur')">
                <span class="select-trigger-slot d-flex align-items-center flex-grow-1 me-2">
                    <slot name="selected" :option="selectedOption" :label="currentLabel">
                        <span ref="valueTextEl" class="value-text" :style="valueTextInlineStyle">{{ currentLabel }}</span>
                    </slot>
                </span>
                <span v-if="!hideChevron" class="d-inline-flex align-items-center select-trigger-chevron" :class="{ 'select-trigger-chevron--open': isOpen }"><ChevronDown class="icon-center" /></span>
            </button>
            <teleport to="body">
                <div
                    v-if="isOpen"
                    ref="menuEl"
                    :class="dropdownTeleportMenuClass"
                    :style="fixedMenuStyle"
                    @mouseenter="onHoverZoneEnter"
                    @mouseleave="onHoverZoneLeave"
                >
                    <input
                        v-if="searchable"
                        ref="searchInputEl"
                        v-model="searchQuery"
                        type="text"
                        class="select-box-search"
                        :placeholder="searchPlaceholder"
                        autocomplete="off"
                    />
                    <template v-if="!virtualized">
                        <ul class="dropdown-menu-list">
                            <li v-if="includeAllOption && !hasActiveSearch">
                                <a class="dropdown-item" :class="{ active: multiple ? (modelValue?.length === 0) : isSelected(null) }" href="#" @click.prevent="choose(null)">{{ allLabel }}</a>
                            </li>
                            <li v-for="opt in filteredOptions" :key="opt.key">
                                <a class="dropdown-item multi-line" :class="{ active: isSelected(opt.value) }" href="#" :style="getDropdownItemStyle(opt)" @click.prevent="choose(opt.value)">
                                    <slot name="option" :option="opt.raw" :label="opt.label" :value="opt.value" :active="isSelected(opt.value)" :depth="getOptionDepth(opt.raw)">
                                        <div v-if="multiple && showCheckboxesWhenMultiple" class="select-box-option-row">
                                            <input type="checkbox" :checked="isSelected(opt.value)" class="form-check-input select-box-option-checkbox" @change="() => {}" />
                                            <span class="select-box-option-label">
                                                <template v-if="hasNestedLayout(opt)">
                                                    <span class="select-box-nested-option" :title="getOptionTitle(opt)">
                                                        <span v-if="getSecondaryLabel(opt.raw)" class="select-box-nested-option__secondary">{{ getSecondaryLabel(opt.raw) }}</span>
                                                        <span class="select-box-nested-option__primary">{{ opt.label }}</span>
                                                    </span>
                                                </template>
                                                <template v-else>{{ opt.label }}</template>
                                            </span>
                                        </div>
                                        <template v-else-if="hasNestedLayout(opt)">
                                            <span class="select-box-nested-option" :title="getOptionTitle(opt)">
                                                <span v-if="getSecondaryLabel(opt.raw)" class="select-box-nested-option__secondary">{{ getSecondaryLabel(opt.raw) }}</span>
                                                <span class="select-box-nested-option__primary">{{ opt.label }}</span>
                                            </span>
                                        </template>
                                        <span v-else>{{ opt.label }}</span>
                                    </slot>
                                </a>
                            </li>
                        </ul>
                    </template>
                    <template v-else>
                        <div class="dropdown-menu-list-virtual-wrap">
                            <div ref="listContainerRef" class="dropdown-menu-list virtual-list-container" @scroll="onListScroll">
                                <div class="virtual-list-spacer" :style="{ height: totalHeight + 'px', position: 'relative' }">
                                    <div class="virtual-list-inner" :style="{ position: 'absolute', top: 0, left: 0, right: 0, transform: 'translateY(' + virtualOffsetY + 'px)' }">
                                        <template v-for="opt in visibleOptions" :key="opt.key">
                                            <a v-if="opt.key === '__all__'" class="dropdown-item" :class="{ active: multiple ? (modelValue?.length === 0) : isSelected(null) }" href="#" :style="{ minHeight: itemHeight + 'px' }" @click.prevent="choose(null)">{{ opt.label }}</a>
                                            <a v-else class="dropdown-item multi-line" :class="{ active: isSelected(opt.value) }" href="#" :style="{ minHeight: itemHeight + 'px', ...getDropdownItemStyle(opt) }" @click.prevent="choose(opt.value)">
                                                <slot name="option" :option="opt.raw" :label="opt.label" :value="opt.value" :active="isSelected(opt.value)" :depth="getOptionDepth(opt.raw)">
                                                    <div v-if="multiple && showCheckboxesWhenMultiple" class="select-box-option-row">
                                                        <input type="checkbox" :checked="isSelected(opt.value)" class="form-check-input select-box-option-checkbox" @change="() => {}" />
                                                        <span class="select-box-option-label">
                                                            <template v-if="hasNestedLayout(opt)">
                                                                <span class="select-box-nested-option" :title="getOptionTitle(opt)">
                                                                    <span v-if="getSecondaryLabel(opt.raw)" class="select-box-nested-option__secondary">{{ getSecondaryLabel(opt.raw) }}</span>
                                                                    <span class="select-box-nested-option__primary">{{ opt.label }}</span>
                                                                </span>
                                                            </template>
                                                            <template v-else>{{ opt.label }}</template>
                                                        </span>
                                                    </div>
                                                    <template v-else-if="hasNestedLayout(opt)">
                                                        <span class="select-box-nested-option" :title="getOptionTitle(opt)">
                                                            <span v-if="getSecondaryLabel(opt.raw)" class="select-box-nested-option__secondary">{{ getSecondaryLabel(opt.raw) }}</span>
                                                            <span class="select-box-nested-option__primary">{{ opt.label }}</span>
                                                        </span>
                                                    </template>
                                                    <span v-else>{{ opt.label }}</span>
                                                </slot>
                                            </a>
                                        </template>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </teleport>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

const NULL_VALUE = 'null'

const props = defineProps({
    modelValue: { type: [String, Number, Boolean, Object, Array, null], default: null },
    options: { type: Array, default: () => [] },
    label: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    includeAllOption: { type: Boolean, default: true },
    allLabel: { type: String, default: 'Не выбрана' },
    valueKey: { type: String, default: 'id' },
    labelKey: { type: String, default: 'name' },
    size: { type: String, default: 'md' },
    castToNumber: { type: Boolean, default: false },
    currentLabelFormatter: { type: Function, default: null },
    fullWidth: { type: Boolean, default: true },
    maxSelectedChars: { type: [Number, null], default: null },
    hideChevron: { type: Boolean, default: false },
    dropdownAnchorRef: { type: Object, default: null },
    searchable: { type: Boolean, default: false },
    searchPlaceholder: { type: String, default: 'Поиск...' },
    searchByFirstLetters: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
    showCheckboxesWhenMultiple: { type: Boolean, default: false },
    multipleLabelFormat: { type: String, default: 'list', validator: (v) => ['count', 'list'].includes(v) },
    virtualized: { type: Boolean, default: false },
    itemHeight: { type: Number, default: 36 },
    overscan: { type: Number, default: 6 },
    /** Не подстраивать размер подписи под ширину и computed-style триггера (для компактных тулбаров) */
    fixedTriggerLabelFontSize: { type: Boolean, default: false },
    /** Минимальная ширина выпадающего меню (может быть шире триггера) */
    dropdownMinWidth: { type: Number, default: 0 },
    /** Доп. класс на выпадающее меню (teleport в body — для стилей с :global у потребителя) */
    dropdownMenuClass: { type: String, default: '' },
    /** Одинаковый размер шрифта у всех пунктов списка, включая active (компактные тулбары) */
    uniformDropdownListFont: { type: Boolean, default: false },
    /** Ключ глубины вложенности в объекте опции (пусто — без иерархии) */
    depthKey: { type: String, default: '' },
    /** Доп. отступ слева на уровень вложенности, rem; 0 — без отступа */
    optionIndentPerLevel: { type: Number, default: 0 },
    /** Ключ доп. подписи (вторая строка) в объекте опции */
    secondaryLabelKey: { type: String, default: '' },
    /** Размер шрифта основной подписи вложенного пункта; пусто — как у списка */
    nestedOptionFontSize: { type: String, default: '' },
    /** Размер шрифта доп. подписи; пусто — как у списка */
    nestedSecondaryFontSize: { type: String, default: '' },
    /** Сторона раскрытия меню: 'bottom' (по умолчанию) — под триггером, 'right' — сбоку справа (для пунктов-подменю) */
    placement: { type: String, default: 'bottom', validator: (v) => ['bottom', 'right'].includes(v) },
    /** Зазор в px между триггером и меню при placement="right" (0 — меню примыкает к триггеру) */
    placementGap: { type: Number, default: 4 },
    /** Вертикальное выравнивание меню при placement="right": 'start' (по умолчанию, верх меню = верх триггера) | 'center' (центр меню = центр триггера) */
    placementAlign: { type: String, default: 'start', validator: (v) => ['start', 'center'].includes(v) },
    /** Открывать выпадающий список при наведении (удобно для подменю, напр. выбор темы в SettingsMenu) */
    openOnHover: { type: Boolean, default: false },
    /** Задержка закрытия при уходе курсора, ms — чтобы успеть перейти с триггера на телепортированное меню */
    hoverCloseDelay: { type: Number, default: 120 },
})

const emit = defineEmits(['update:modelValue', 'change', 'blur'])

const rootCssVars = computed(() => {
    const vars = {
        '--select-box-nested-indent-per-level': `${props.optionIndentPerLevel}rem`,
    }
    if (props.nestedOptionFontSize) {
        vars['--select-box-nested-font-size'] = props.nestedOptionFontSize
    }
    if (props.nestedSecondaryFontSize) {
        vars['--select-box-nested-secondary-font-size'] = props.nestedSecondaryFontSize
    }
    return vars
})

function getOptionDepth(raw) {
    if (!props.depthKey || raw == null || typeof raw !== 'object') return 0
    const value = raw[props.depthKey]
    const num = Number(value)
    return Number.isFinite(num) ? Math.max(0, num) : 0
}

function getSecondaryLabel(raw) {
    if (!props.secondaryLabelKey || raw == null || typeof raw !== 'object') return ''
    const value = raw[props.secondaryLabelKey]
    if (value == null) return ''
    const text = String(value).trim()
    return text || ''
}

function hasNestedLayout(opt) {
    return getOptionDepth(opt.raw) > 0 || Boolean(getSecondaryLabel(opt.raw))
}

function getOptionTitle(opt) {
    const secondary = getSecondaryLabel(opt.raw)
    if (secondary) return `${secondary} › ${opt.label}`
    return opt.label
}

function getDropdownItemStyle(opt) {
    const depth = getOptionDepth(opt.raw)
    if (depth <= 0 || props.optionIndentPerLevel <= 0) return undefined
    return {
        paddingLeft: `calc(var(--select-box-item-padding-x) + ${depth * props.optionIndentPerLevel}rem)`,
    }
}

const dropdownTeleportMenuClass = computed(() => {
    const parts = ['dropdown-menu', 'show', 'fixed-menu']
    if (props.dropdownMenuClass) parts.push(props.dropdownMenuClass)
    if (props.uniformDropdownListFont) parts.push('select-box-menu--uniform-font')
    return parts
})

function toKey(value) {
    if (value === null || value === undefined) return NULL_VALUE
    const type = typeof value
    if (type === 'object') return `${type}:${JSON.stringify(value)}`
    return `${type}:${String(value)}`
}

const normalizedOptions = computed(() => {
    const result = []
    for (const raw of props.options) {
        const isObject = typeof raw === 'object' && raw !== null
        const value = isObject ? raw[props.valueKey] : raw
        const label = isObject ? (raw[props.labelKey] ?? String(value ?? '')) : String(raw ?? '')
        result.push({ key: toKey(value), value, label, raw })
    }
    return result
})

function matchesFirstLetters(label, query) {
    const words = (label || '').split(/[\s\-]+/).filter(Boolean)
    const q = query.toLowerCase()
    let wordIdx = 0
    let charIdx = 0
    while (charIdx < q.length && wordIdx < words.length) {
        const firstChar = words[wordIdx].charAt(0).toLowerCase()
        if (firstChar === q.charAt(charIdx)) charIdx++
        wordIdx++
    }
    return charIdx === q.length
}

const searchQuery = ref('')
const hasActiveSearch = computed(() => props.searchable && searchQuery.value.trim().length > 0)
const filteredOptions = computed(() => {
    if (!props.searchable || !searchQuery.value.trim()) return normalizedOptions.value
    const q = searchQuery.value.trim()
    const qLower = q.toLowerCase()
    if (props.searchByFirstLetters) {
        return normalizedOptions.value.filter(opt => {
            const label = opt.label ?? ''
            const labelLower = label.toLowerCase()
            return matchesFirstLetters(label, q) || labelLower.includes(qLower)
        })
    }
    return normalizedOptions.value.filter(opt => (opt.label ?? '').toLowerCase().includes(qLower))
})

const isOpen = ref(false)
const fixedMenuStyle = ref({ top: '0px', left: '0px', width: '0px' })
function resolveContextFontSize(trigger, root) {
    if (!trigger) return '1rem'
    const triggerStyle = getComputedStyle(trigger)
    if (triggerStyle.fontSize) return triggerStyle.fontSize
    if (root) {
        const rootStyle = getComputedStyle(root)
        if (rootStyle.fontSize) return rootStyle.fontSize
    }
    return '1rem'
}

function updateMenuPosition() {
    const root = rootEl.value
    if (!root) return
    const trigger = root.querySelector('.select-trigger')
    if (!trigger) return
    const triggerRect = trigger.getBoundingClientRect()
    const anchorEl = props.dropdownAnchorRef?.value
    const anchorRect = anchorEl ? anchorEl.getBoundingClientRect() : null
    const rect = (anchorRect && anchorRect.width > 0) ? anchorRect : triggerRect
    const viewportPadding = 8
    const minDropdownWidth = 120

    let top
    let left
    let width
    let maxWidth

    if (props.placement === 'right') {
        const sideGap = props.placementGap
        maxWidth = Math.max(0, window.innerWidth - viewportPadding * 2)
        width = Math.min(Math.max(minDropdownWidth, props.dropdownMinWidth || 0), maxWidth)
        const fitsRight = triggerRect.right + sideGap + width <= window.innerWidth - viewportPadding
        left = fitsRight
            ? triggerRect.right + sideGap
            : Math.max(viewportPadding, triggerRect.left - sideGap - width)

        if (props.placementAlign === 'center') {
            const menuHeight = menuEl.value?.getBoundingClientRect().height || triggerRect.height
            const centerTop = triggerRect.top + triggerRect.height / 2 - menuHeight / 2
            top = Math.min(
                Math.max(viewportPadding, centerTop),
                Math.max(viewportPadding, window.innerHeight - viewportPadding - menuHeight)
            )
        } else {
            top = Math.min(
                triggerRect.top,
                window.innerHeight - viewportPadding
            )
        }
    } else {
        maxWidth = Math.max(0, window.innerWidth - viewportPadding * 2)
        const minW = Math.max(minDropdownWidth, props.dropdownMinWidth || 0, rect.width)
        width = Math.min(minW, maxWidth)
        left = Math.min(
            rect.left,
            window.innerWidth - viewportPadding - width
        )
        top = triggerRect.bottom
    }

    const triggerStyle = getComputedStyle(trigger)
    const rootStyle = root ? getComputedStyle(root) : null
    const menuFontSize = resolveContextFontSize(trigger, root)
    const customFontSize = rootStyle?.getPropertyValue('--select-box-font-size').trim()
    const resolvedMenuFontSize = customFontSize || menuFontSize
    const menuLineHeight = triggerStyle.lineHeight || rootStyle?.lineHeight || '1.5'
    fixedMenuStyle.value = {
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        maxWidth: `${maxWidth}px`,
        boxSizing: 'border-box',
        fontSize: resolvedMenuFontSize,
        lineHeight: menuLineHeight,
        '--select-box-font-size': resolvedMenuFontSize,
        '--select-box-search-font-size': rootStyle?.getPropertyValue('--select-box-search-font-size').trim() || '1em',
        '--select-box-compact-font-size': rootStyle?.getPropertyValue('--select-box-compact-font-size').trim() || '1em',
        '--select-box-item-padding-y': rootStyle?.getPropertyValue('--select-box-item-padding-y').trim() || '0.375rem',
        '--select-box-item-padding-x': rootStyle?.getPropertyValue('--select-box-item-padding-x').trim() || '0.75rem',
        '--select-box-nested-indent-per-level': rootStyle?.getPropertyValue('--select-box-nested-indent-per-level').trim() || `${props.optionIndentPerLevel}rem`,
        '--select-box-nested-font-size': props.nestedOptionFontSize
            || rootStyle?.getPropertyValue('--select-box-nested-font-size').trim()
            || '1em',
        '--select-box-nested-secondary-font-size': props.nestedSecondaryFontSize
            || rootStyle?.getPropertyValue('--select-box-nested-secondary-font-size').trim()
            || props.nestedOptionFontSize
            || '1em',
    }
}
const searchInputEl = ref(null)
let hoverCloseTimer = null

function clearHoverCloseTimer() {
    if (hoverCloseTimer !== null) {
        clearTimeout(hoverCloseTimer)
        hoverCloseTimer = null
    }
}

function scheduleHoverClose() {
    if (!props.openOnHover) return
    clearHoverCloseTimer()
    hoverCloseTimer = setTimeout(() => {
        close()
        hoverCloseTimer = null
    }, props.hoverCloseDelay)
}

function onHoverZoneEnter() {
    if (!props.openOnHover || props.disabled) return
    clearHoverCloseTimer()
    open()
}

function onHoverZoneLeave() {
    if (!props.openOnHover) return
    scheduleHoverClose()
}

function open() {
    if (props.disabled || isOpen.value) return
    isOpen.value = true
    updateMenuPosition()
    if (props.dropdownAnchorRef) {
        nextTick(() => {
            updateMenuPosition()
            requestAnimationFrame(() => updateMenuPosition())
        })
    } else {
        requestAnimationFrame(() => updateMenuPosition())
    }
    if (props.searchable) {
        nextTick(() => searchInputEl.value?.focus())
    }
    if (props.virtualized) {
        startIndex.value = 0
        endIndex.value = 0
        nextTick(() => {
            if (listContainerRef.value) {
                listContainerRef.value.scrollTop = 0
                updateVisibleRange()
            }
        })
    }
}

function toggle() {
    if (props.disabled) return
    if (isOpen.value) close()
    else open()
}

function close() {
    clearHoverCloseTimer()
    isOpen.value = false
    searchQuery.value = ''
}

function coerce(val) {
    if (val === null || val === undefined) return null
    if (props.castToNumber) {
        const n = Number(val)
        return Number.isFinite(n) ? n : null
    }
    return val
}

function choose(value) {
    if (props.multiple && Array.isArray(props.modelValue)) {
        if (value === null || value === undefined) {
            emit('update:modelValue', [])
            emit('change', [])
            return
        }
        const v = coerce(value)
        const arr = [...props.modelValue]
        const idx = arr.findIndex((item) => valuesAreEqual(item, v))
        if (idx >= 0) arr.splice(idx, 1)
        else arr.push(v)
        emit('update:modelValue', arr)
        emit('change', arr)
        return
    }
    const v = coerce(value)
    emit('update:modelValue', v)
    emit('change', v)
    close()
}

const rawCurrentLabel = computed(() => {
    if (props.multiple && Array.isArray(props.modelValue)) {
        if (!props.modelValue.length) return props.allLabel
        if (props.multipleLabelFormat === 'count' && props.modelValue.length > 1) {
            return `${props.modelValue.length} выбрано`
        }
        if (props.multipleLabelFormat === 'count' && props.modelValue.length === 1) {
            const val = props.modelValue[0]
            const found = normalizedOptions.value.find((o) => valuesAreEqual(o.value, val))
            return found ? found.label : String(val)
        }
        const labels = props.modelValue.map((val) => {
            const found = normalizedOptions.value.find((o) => valuesAreEqual(o.value, val))
            return found ? found.label : String(val)
        })
        return labels.join(', ')
    }
    if (props.modelValue === null || props.modelValue === undefined || props.modelValue === '') return props.allLabel
    const found = normalizedOptions.value.find(o => valuesAreEqual(o.value, props.modelValue))
    if (!found) return props.allLabel
    if (typeof props.currentLabelFormatter === 'function') {
        try { return props.currentLabelFormatter({ option: found.raw, value: found.value, label: found.label }) } catch { return found.label }
    }
    return found.label
})

const currentLabel = computed(() => {
    const label = rawCurrentLabel.value ?? ''
    const limit = props.maxSelectedChars
    if (typeof limit === 'number' && limit > 0 && label.length > limit) {
        return label.slice(0, Math.max(0, limit - 1)) + '…'
    }
    return label
})

const selectedOption = computed(() => {
    const found = normalizedOptions.value.find(o => valuesAreEqual(o.value, props.modelValue))
    return found ? found.raw : null
})

function valuesAreEqual(a, b) {
    const aNil = a === null || a === undefined || a === ''
    const bNil = b === null || b === undefined || b === ''
    if (aNil || bNil) return aNil && bNil
    if (typeof a === 'object' || typeof b === 'object') {
        try { return JSON.stringify(a) === JSON.stringify(b) } catch { return false }
    }
    return String(a) === String(b)
}

function isSelected(val) {
    if (props.multiple && Array.isArray(props.modelValue)) {
        return props.modelValue.some((item) => valuesAreEqual(item, val))
    }
    return valuesAreEqual(props.modelValue, val)
}

function handleClickOutside(e) {
    const root = rootEl.value
    if (!root) return
    if (menuEl.value?.contains(e.target)) return
    if (!root.contains(e.target)) close()
}

const rootEl = ref(null)
const menuEl = ref(null)
const valueTextEl = ref(null)
const listContainerRef = ref(null)
const listScrollTop = ref(0)
const listViewportHeight = ref(260)
const startIndex = ref(0)
const endIndex = ref(0)

const effectiveOptionsForVirtual = computed(() => {
    if (!props.virtualized) return []
    const list = filteredOptions.value
    if (props.includeAllOption && !hasActiveSearch.value) {
        return [{ key: '__all__', value: null, label: props.allLabel, raw: null }, ...list]
    }
    return list
})

const totalHeight = computed(() => (props.virtualized ? effectiveOptionsForVirtual.value.length * props.itemHeight : 0))
const visibleOptions = computed(() => {
    if (!props.virtualized) return filteredOptions.value
    const list = effectiveOptionsForVirtual.value
    const start = Math.max(0, startIndex.value)
    const end = Math.min(list.length, endIndex.value)
    return list.slice(start, end)
})
const virtualOffsetY = computed(() => (props.virtualized ? startIndex.value * props.itemHeight : 0))

function updateVisibleRange() {
    if (!props.virtualized || !listContainerRef.value) return
    const el = listContainerRef.value
    listViewportHeight.value = el.clientHeight
    const scrollTop = el.scrollTop
    listScrollTop.value = scrollTop
    const count = effectiveOptionsForVirtual.value.length
    const start = Math.max(0, Math.floor(scrollTop / props.itemHeight) - props.overscan)
    const end = Math.min(count, Math.ceil((scrollTop + el.clientHeight) / props.itemHeight) + props.overscan)
    startIndex.value = start
    endIndex.value = end
}

function onListScroll() {
    updateVisibleRange()
}
const currentFontSize = ref('')
const valueTextInlineStyle = computed(() => {
    if (props.fixedTriggerLabelFontSize) return undefined
    if (!currentFontSize.value) return undefined
    return { fontSize: currentFontSize.value }
})
const baseFontSize = 16
const minFontSize = 12
function adjustFontSize() {
    if (props.fixedTriggerLabelFontSize) return
    if (typeof props.maxSelectedChars === 'number' && props.maxSelectedChars > 0) return
    const el = valueTextEl.value
    if (!el) return
    el.style.fontSize = ''
    currentFontSize.value = ''
    const parent = el.parentElement
    if (!parent) return
    const trigger = rootEl.value?.querySelector('.select-trigger')
    const root = rootEl.value
    const rootStyle = root ? getComputedStyle(root) : null
    const containerFontSizePx = trigger ? (parseFloat(getComputedStyle(trigger).fontSize) || baseFontSize) : baseFontSize
    const iconSizeVar = rootStyle?.getPropertyValue('--select-box-icon-size').trim() || '1em'
    let iconPx = containerFontSizePx
    if (iconSizeVar.endsWith('em')) {
        iconPx = (parseFloat(iconSizeVar) || 1) * containerFontSizePx
    } else {
        iconPx = parseFloat(iconSizeVar) || containerFontSizePx
    }
    const iconWidth = props.hideChevron ? 0 : iconPx + 8
    const available = parent.clientWidth - iconWidth - 8
    if (available <= 0) return
    const effectiveMinSize = Math.max(minFontSize, Math.round(containerFontSizePx * 0.75))
    let size = Math.round(containerFontSizePx)
    el.style.fontSize = size + 'px'
    el.style.whiteSpace = 'nowrap'
    while (el.scrollWidth > available && size > effectiveMinSize) {
        size -= 1
        el.style.fontSize = size + 'px'
    }
    if (size < Math.round(containerFontSizePx)) {
        currentFontSize.value = el.style.fontSize
    }
}
const onResize = () => {
    adjustFontSize()
    updateMenuPosition()
}
onMounted(() => {
    document.addEventListener('click', handleClickOutside, true)
    nextTick(adjustFontSize)
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', updateMenuPosition, true)
})
onBeforeUnmount(() => {
    clearHoverCloseTimer()
    document.removeEventListener('click', handleClickOutside, true)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('scroll', updateMenuPosition, true)
})

watch(() => props.modelValue, async () => {
    await nextTick()
    adjustFontSize()
})

watch([() => (props.virtualized ? effectiveOptionsForVirtual.value.length : filteredOptions.value.length), isOpen], () => {
    if (props.virtualized && isOpen.value) {
        nextTick(updateVisibleRange)
    }
})

watch(searchQuery, () => {
    if (props.virtualized && isOpen.value && listContainerRef.value) {
        listContainerRef.value.scrollTop = 0
        nextTick(updateVisibleRange)
    }
})
</script>

<style scoped lang="scss">
.select-box {
    --select-box-font-size: 1rem;
    --select-box-search-font-size: 1em;
    --select-box-compact-font-size: 1em;
    --select-box-trigger-min-height: 38px;
    --select-box-icon-size: 1.125em;
    --select-box-item-padding-y: 0.375rem;
    --select-box-item-padding-x: 0.75rem;
    --select-box-nested-indent-per-level: 0rem;
    --select-box-nested-font-size: 1em;
    --select-box-nested-secondary-font-size: 1em;

    max-width: 100%;
    font-size: var(--select-box-font-size);
    line-height: 1.5;
}

.select-box > .form-label {
    font-size: 1em;
    line-height: 1.5;
}

.select-trigger--open {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-bottom-color: transparent;
}

.select-trigger {
    background-color: var(--color-primary-background);
    border: 1px solid var(--bs-border-color, #dee2e6);
    color: var(--color-primary-text);
    text-shadow: none;
    box-shadow: none;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    min-height: var(--select-box-trigger-min-height);
    padding: var(--select-box-item-padding-y) var(--select-box-item-padding-x);
    font-size: 1em;
    line-height: 1.5;
    --bs-btn-font-size: 1em;
    --bs-btn-line-height: 1.5;
    --bs-btn-padding-y: var(--select-box-item-padding-y);
    --bs-btn-padding-x: var(--select-box-item-padding-x);
    white-space: nowrap;
    text-align: left;
    display: inline-flex;
    transition:
        background-color 0.3s ease,
        border-color 0.3s ease,
        color 0.3s ease,
        box-shadow 0.3s ease,
        transform 0.28s ease;

    &:active:not(:disabled) {
        transform: scale(0.992);
        transition-duration: 0.28s;
    }
}

.select-trigger :deep(svg) {
    filter: none;
}
.select-trigger-slot {
    min-width: 0;
    overflow: hidden;
}
.select-trigger .value-text {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.dropdown-menu {
    position: absolute;
    left: 0;
    right: 0;
    top: 100%;
    margin-top: .25rem;
    z-index: 100002;
    width: auto;
    min-width: 100%;
    max-width: 100vw;
    background-color: var(--color-primary-background);
    border: 1px solid var(--color-border);
    border-radius: .375rem;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0;
}

.select-box-search {
    flex-shrink: 0;
    padding: var(--select-box-item-padding-y) var(--select-box-item-padding-x);
    border: none;
    border-bottom: 1px solid var(--color-border);
    border-radius: 0;
    background-color: var(--color-primary-background);
    color: var(--color-primary-text);
    font-size: var(--select-box-search-font-size);
    line-height: 1.5;
    outline: none;
    width: 100%;
    box-sizing: border-box;
}

.select-box-search::placeholder {
    color: var(--color-secondary-text);
}

.dropdown-menu-list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 260px;
    overflow-y: auto;
    overflow-x: hidden;
}

.dropdown-menu-list-virtual-wrap {
    display: flex;
    flex-direction: column;
    max-height: 260px;
    overflow: hidden;
}

.dropdown-menu-list.virtual-list-container {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
}

.virtual-list-spacer {
    pointer-events: none;
}

.virtual-list-inner {
    pointer-events: auto;
}

.fixed-menu {
    position: fixed;
    z-index: 100002;
    left: auto;
    right: auto;
    top: auto;
    min-width: unset;
    margin-top: 0;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
}
.select-box .dropdown { position: relative; width: 100%; max-width: 100%; }

.dropdown-item {
    color: var(--color-primary-text);
    background-color: transparent;
    font-size: 1em;
    line-height: 1.5;
    padding: var(--select-box-item-padding-y) var(--select-box-item-padding-x);
    display: block;
    width: 100%;
    clear: both;
    font-weight: 400;
    text-align: left;
    text-decoration: none;
    transition: background-color 0.3s ease, color 0.3s ease;
    border: 0;
    cursor: pointer;

    &:active {
        transition-duration: 0.28s;
    }
}

.dropdown-item :deep(svg) {
    width: 1em;
    height: 1em;
    flex-shrink: 0;
    vertical-align: middle;
}

.dropdown-item:hover {
    background-color: var(--color-hover-background);
    color: var(--color-primary-text);
}

.dropdown-item.multi-line {
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
}
.dropdown-item.active {
    background-color: var(--color-accent-bg, rgba(var(--bs-primary-rgb), 0.1));
    color: var(--color-accent, #0d6efd);
    font-weight: 400;
}

.select-box-menu--uniform-font .dropdown-item,
.select-box-menu--uniform-font .dropdown-item.active {
    font-size: 1em;
    font-weight: 400;
}

.select-box-option-row {
    display: flex;
    align-items: flex-start;
    gap: 0.5em;
    width: 100%;
    min-width: 0;
}

.select-box-option-checkbox {
    width: 1em;
    height: 1em;
    min-width: 1em;
    margin: 0.125em 0 0;
    flex-shrink: 0;
    cursor: pointer;
}

.select-box-option-label {
    flex: 1;
    min-width: 0;
}

.select-trigger-chevron {
    flex-shrink: 0;
    transition: transform 0.3s ease;
}

.select-trigger-chevron--open {
    transform: rotate(180deg);
}

.icon-center {
    width: var(--select-box-icon-size);
    height: var(--select-box-icon-size);
    min-width: var(--select-box-icon-size);
    min-height: var(--select-box-icon-size);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
}

.form-check-input {
    cursor: pointer;
}
</style>

<style lang="scss">
.fixed-menu {
    .select-box-nested-option {
        display: flex;
        flex-direction: column;
        width: 100%;
        min-width: 0;
    }

    .select-box-nested-option__secondary {
        font-size: var(--select-box-nested-secondary-font-size, 1em);
        color: var(--color-secondary-text, #6c757d);
        line-height: 1.35;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .select-box-nested-option__primary {
        font-size: var(--select-box-nested-font-size, 1em);
        line-height: 1.35;
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        word-break: break-word;
    }
}
</style>