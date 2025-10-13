<template>
    <div class="dropdown w-100" ref="triggerRef">
        <button class="btn btn-light w-100 d-flex align-items-center justify-content-between"
            type="button" @click="toggle" :aria-expanded="open ? 'true' : 'false'">
            <span class="d-flex align-items-center gap-2">
                <component :is="currentType.icon" class="lucide" :size="iconSize" :style="{ color: currentType.color }" />
                <span>{{ currentType.label }}</span>
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
            </svg>
        </button>
    </div>

    <teleport to="body">
        <ul v-if="open" class="dropdown-menu show p-0 overflow-hidden" :style="menuStyle">
            <li v-for="t in resolvedTypes" :key="t.value">
                <button class="dropdown-item d-flex align-items-center gap-2" @click="selectType(t)">
                    <component :is="t.icon" class="lucide" :size="iconSize" :style="{ color: t.color }" />
                    <span>{{ t.label }}</span>
                </button>
            </li>
        </ul>
    </teleport>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Type as TypeIcon, Hash, Binary, Calendar, CalendarClock, CheckSquare } from 'lucide-vue-next'

const props = defineProps({
    modelValue: { type: String, default: 'string' },
    types: { type: Array, default: null },
})

const emit = defineEmits(['update:modelValue', 'change'])

const defaultTypes = [
    { value: 'string', label: 'Строка', icon: TypeIcon, color: 'var(--color-primary-text)' },
    { value: 'integer', label: 'Целое число', icon: Hash, color: '#0d6efd' },
    { value: 'float', label: 'Дробное число', icon: Binary, color: '#20c997' },
    { value: 'boolean', label: 'Логический', icon: CheckSquare, color: '#fd7e14' },
    { value: 'date', label: 'Дата', icon: Calendar, color: '#6f42c1' },
    { value: 'datetime', label: 'Дата и время', icon: CalendarClock, color: '#6f42c1' },
]

const resolvedTypes = computed(() => (props.types && props.types.length ? props.types : defaultTypes))

const currentType = computed(() => resolvedTypes.value.find(t => t.value === props.modelValue) || resolvedTypes.value[0])

function selectType(t) {
    emit('update:modelValue', t.value)
    emit('change', t)
    close()
}

const open = ref(false)
const triggerRef = ref(null)
const menuStyle = ref({})
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)

const iconSize = computed(() => {
    const fromVw = Math.round(viewportWidth.value * 0.012)
    const size = Math.max(16, Math.min(22, fromVw))
    return size
})

function updatePosition() {
    const el = triggerRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    menuStyle.value = {
        position: 'fixed',
        top: rect.bottom + 'px',
        left: rect.left + 'px',
        width: rect.width + 'px',
        zIndex: 1080,
        display: 'block',
    }
}

function openMenu() {
    open.value = true
    nextTick(updatePosition)
}

function close() {
    open.value = false
}

function toggle() {
    if (open.value) close()
    else openMenu()
}

function onGlobalClick(e) {
    const el = triggerRef.value
    if (!el) return
    if (!open.value) return
    if (!el.contains(e.target)) close()
}

onMounted(() => {
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('resize', () => { viewportWidth.value = window.innerWidth })
    window.addEventListener('click', onGlobalClick)
})

onBeforeUnmount(() => {
    window.removeEventListener('scroll', updatePosition, true)
    window.removeEventListener('resize', updatePosition)
    window.removeEventListener('click', onGlobalClick)
})
</script>

<style scoped lang="scss">
.dropdown > button {
    background-color: var(--bs-body-bg);
    color: var(--color-primary-text);
    border: 0.1rem solid var(--bs-border-color);
    font-size: clamp(0.9rem, 0.85rem + 0.25vw, 1.05rem);
    box-shadow: none !important;
}

.dropdown-item{
    padding: .5rem .75rem;
    font-size: clamp(0.9rem, 0.85rem + 0.25vw, 1.05rem);
}

.dropdown-menu{
    background-color: var(--color-primary-background);
    color: var(--color-primary-text);
    box-shadow: none !important;
    border: var(--bs-border-width) solid var(--bs-border-color);
}

.dropdown-item:hover,
.dropdown-item:focus,
.dropdown-item.active{
    background-color: var(--bs-dropdown-link-hover-bg);
}

.lucide{
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
}
</style>


