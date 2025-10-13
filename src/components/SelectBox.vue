<template>
    <div class="select-box" ref="rootEl">
        <label v-if="label" class="form-label mb-1">{{ label }}</label>
        <div class="dropdown" :class="{ 'is-open': isOpen }">
            <button
                class="btn btn-light w-100 d-flex align-items-center justify-content-between select-trigger"
                type="button"
                :disabled="disabled"
                @click="toggle"
                @blur="$emit('blur')"
            >
                <span class="d-flex align-items-center flex-grow-1 me-2">
                    <slot name="selected" :option="selectedOption" :label="currentLabel">
                        <span ref="valueTextEl" class="value-text" :style="{ fontSize: currentFontSize }">{{ currentLabel }}</span>
                    </slot>
                </span>
                <span class="d-inline-flex align-items-center"><ChevronDown class="icon-center" /></span>
            </button>
            <!-- Портал выпадающего списка в body с позиционированием fixed -->
            <teleport to="body">
                <ul
                    v-if="isOpen"
                    class="dropdown-menu show fixed-menu"
                    :style="fixedMenuStyle"
                >
                    <li v-if="includeAllOption">
                        <a
                            class="dropdown-item"
                            :class="{ active: isSelected(null) }"
                            href="#"
                            @click.prevent="choose(null)"
                        >{{ allLabel }}</a>
                    </li>
                    <li v-for="opt in normalizedOptions" :key="opt.key">
                        <a
                            class="dropdown-item multi-line"
                            :class="{ active: isSelected(opt.value) }"
                            href="#"
                            @click.prevent="choose(opt.value)"
                        >
                            <slot name="option" :option="opt.raw" :label="opt.label" :value="opt.value" :active="isSelected(opt.value)">
                                {{ opt.label }}
                            </slot>
                        </a>
                    </li>
                </ul>
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
    allLabel: { type: String, default: 'Все' },
    valueKey: { type: String, default: 'id' },
    labelKey: { type: String, default: 'name' },
    size: { type: String, default: 'md' }, // sm | md | lg
    castToNumber: { type: Boolean, default: false },
    currentLabelFormatter: { type: Function, default: null },
    // зарезервировано на будущее, сейчас селект всегда занимает 100% ширины контейнера
    fullWidth: { type: Boolean, default: true },
    // ограничение длины отображаемого выбранного текста (обрезается с …)
    maxSelectedChars: { type: [Number, null], default: null },
})

const emit = defineEmits(['update:modelValue', 'change', 'blur'])

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

const keyToValueMap = computed(() => {
    const map = new Map()
    for (const item of normalizedOptions.value) {
        map.set(item.key, item.value)
    }
    map.set(NULL_VALUE, null)
    return map
})

const internalValue = computed(() => toKey(props.modelValue))

const isOpen = ref(false)
const fixedMenuStyle = ref({ top: '0px', left: '0px', width: '0px' })
function updateMenuPosition() {
    const root = rootEl.value
    if (!root) return
    const trigger = root.querySelector('.select-trigger')
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const viewportPadding = 8
    const maxWidth = Math.max(0, window.innerWidth - viewportPadding * 2)
    const width = Math.min(rect.width, maxWidth)
    const left = Math.min(
        rect.left,
        window.innerWidth - viewportPadding - width
    )
    fixedMenuStyle.value = {
        top: `${rect.bottom + 4}px`,
        left: `${left}px`,
        width: `${width}px`,
        maxWidth: `${maxWidth}px`,
        boxSizing: 'border-box',
    }
}
function toggle() {
    if (props.disabled) return
    isOpen.value = !isOpen.value
    if (isOpen.value) {
        updateMenuPosition()
        // на следующем кадре пересчитать ещё раз, если раскладка изменилась
        requestAnimationFrame(() => updateMenuPosition())
    }
}
function close() { isOpen.value = false }

function coerce(val) {
    if (val === null || val === undefined) return null
    if (props.castToNumber) {
        const n = Number(val)
        return Number.isFinite(n) ? n : null
    }
    return val
}

function choose(value) {
    const v = coerce(value)
    emit('update:modelValue', v)
    emit('change', v)
    close()
}

function clearSelection() {
    emit('update:modelValue', null)
    emit('change', null)
}

const sizeClass = computed(() => {
    if (props.size === 'sm') return 'form-select-sm'
    if (props.size === 'lg') return 'form-select-lg'
    return ''
})

const rawCurrentLabel = computed(() => {
    if (props.modelValue === null || props.modelValue === undefined || props.modelValue === '') {
        return props.allLabel
    }
    const found = normalizedOptions.value.find(o => {
        // сравнение по значению (с учётом объектов/чисел/строк)
        if (typeof o.value === 'object' && o.value !== null) {
            try { return JSON.stringify(o.value) === JSON.stringify(props.modelValue) } catch { return false }
        }
        return String(o.value) === String(props.modelValue)
    })
    if (!found) return props.allLabel
    if (typeof props.currentLabelFormatter === 'function') {
        try { return props.currentLabelFormatter({ option: found.raw, value: found.value, label: found.label }) } catch { /* noop */ }
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
    return valuesAreEqual(props.modelValue, val)
}

function handleClickOutside(e) {
    const root = rootEl.value
    if (!root) return
    // Если клик произошёл внутри телепортированного меню, не закрываем
    const openMenus = document.querySelectorAll('ul.dropdown-menu.fixed-menu.show')
    for (const menu of openMenus) {
        if (menu.contains(e.target)) return
    }
    if (!root.contains(e.target)) close()
}

const rootEl = ref(null)
const valueTextEl = ref(null)
const currentFontSize = ref('1rem')
const baseFontSize = 16 // px (примерно 1rem)
const minFontSize = 12 // px
function adjustFontSize() {
    // Если явно задано ограничение символов, полагаемся на CSS-ellipsis и не пытаемся уменьшать шрифт
    if (typeof props.maxSelectedChars === 'number' && props.maxSelectedChars > 0) {
        return
    }
    const el = valueTextEl.value
    if (!el) return
    // Сбрасываем до базового
    el.style.fontSize = ''
    currentFontSize.value = '1rem'
    const parent = el.parentElement
    if (!parent) return
    // Оставим место под иконку справа
    const iconWidth = 22
    const available = parent.clientWidth - iconWidth - 8
    if (available <= 0) return
    // Если текст выходит за пределы, уменьшаем шрифт до minFontSize
    let size = baseFontSize
    el.style.whiteSpace = 'nowrap'
    while (el.scrollWidth > available && size > minFontSize) {
        size -= 1
        el.style.fontSize = size + 'px'
    }
    currentFontSize.value = el.style.fontSize || '1rem'
}
onMounted(() => {
    document.addEventListener('click', handleClickOutside)
    nextTick(adjustFontSize)
    window.addEventListener('resize', () => { adjustFontSize(); updateMenuPosition() })
    window.addEventListener('scroll', updateMenuPosition, true)
})
onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside)
    window.removeEventListener('resize', adjustFontSize)
    window.removeEventListener('scroll', updateMenuPosition, true)
})

watch(() => props.modelValue, async () => {
    await nextTick()
    adjustFontSize()
})
</script>

<style scoped lang="scss">
/* Кнопка-селект */
.select-trigger {
    background-color: var(--color-primary-background);
    border: 1px solid var(--bs-border-color, #dee2e6);
    min-height: 38px;
    white-space: nowrap;
    text-align: left;
    display: inline-flex;
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
    z-index: 12000; /* поверх модалки Bootstrap */
    max-height: 260px;
    overflow-y: auto;
    overflow-x: hidden;
    width: auto;
    min-width: 100%;
    max-width: 100vw;
    background-color: var(--bs-body-bg, #fff);
    border: 1px solid var(--bs-border-color, #dee2e6);
    border-radius: .375rem;
    box-shadow: 0 .5rem 1rem rgba(0,0,0,.15);
}
.fixed-menu {
    position: fixed;
    z-index: 12000; /* поверх модалки Bootstrap */
    left: auto; /* задаётся inline */
    right: auto; /* сбрасываем наследование */
    top: auto;  /* задаётся inline */
    min-width: unset;
}
.select-box { max-width: 100%; }
.select-box .dropdown { position: relative; width: 100%; max-width: 100%; }
.dropdown-item.multi-line {
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
}
.dropdown-item.active {
    background-color: var(--bs-primary-bg-subtle, #e7f1ff);
    color: var(--bs-primary, #0d6efd);
}
.icon-center {
    width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle;
}
</style>