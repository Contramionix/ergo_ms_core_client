<template>
    <div class="chart-settings-fields">
        <div v-for="setting in settingTypes" :key="setting.key" class="setting">
            <div class="setting-header">
                <div class="setting-header-left">
                    <component :is="setting.icon" size="18" />
                    <h6 class="m-0 me-1">{{ setting.label }}</h6>
                </div>
                <div class="setting-header-right">
                    <button class="btn btn-sm fw-bold" style="padding: 0; margin: 0; display: flex;" data-fields-modal-trigger @click="onAddFieldClick($event, setting.key)">
                        <Plus size="16" />
                    </button>
                </div>
            </div>
            <div v-for="f in selectedFields[setting.key]" :key="f.id" class="selected-field" :class="{ 'selected-field--clickable': setting.key === 'filters' }">
                <div class="selected-field-content" style="display: flex; gap: 8px; justify-content: center; align-items: center;" @click="setting.key === 'filters' ? emit('editFilter', f) : null">
                    <span class="field-icon" :class="f.source">
                        <component :is="typeIcon[f.type] || Type" size="16" />
                    </span>
                    {{ f.name }}{{ filterFieldSuffix(f, setting.key) }}
                </div>
                <button class="remove-btn" @click.stop="emit('removeField', f, setting.key)" title="Удалить">
                    <X size="18" />
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { Type, Hash, Calendar, CheckCircle, MapPin, Globe, Plus, X } from 'lucide-vue-next'

defineProps({
    settingTypes: {
        type: Array,
        required: true,
    },
    selectedFields: {
        type: Object,
        required: true,
    },
})

const emit = defineEmits(['addFieldClick', 'removeField', 'editFilter'])

const typeIcon = {
    string: Type,
    integer: Hash,
    float: Hash,
    number: Hash,
    date: Calendar,
    'date&time': Calendar,
    bool: CheckCircle,
    boolean: CheckCircle,
    geopoint: MapPin,
    geopolygon: Globe,
}

function onAddFieldClick(event, settingKey) {
    emit('addFieldClick', event, settingKey)
}

function filterFieldSuffix(f, settingKey) {
    if (settingKey !== 'filters' || !f.filter) return ''
    const op = f.filter.op
    const value = f.filter.value
    if (op === 'empty' || op === 'nempty') return ''
    if (Array.isArray(value)) {
        const n = value.length
        if (n === 0) return ''
        const word = n === 1 ? 'значение' : n >= 2 && n <= 4 ? 'значения' : 'значений'
        return `: ${n} ${word}`
    }
    return value == null ? '' : `: ${String(value)}`
}
</script>

<style lang="scss" scoped>
.chart-settings-fields {
    display: flex;
    flex-direction: column;
    gap: 20px;

    .setting {
        background-color: var(--color-secondary-background);
        width: 100%;
        border-radius: 8px;
        padding: 10px;
        display: flex;
        flex-direction: column;
    }

    .setting-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
    }

    .setting-header-left {
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .setting-header-right {
        display: flex;
        justify-content: center;
    }

    .selected-field {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--color-primary-background);
        border-radius: 6px;
        padding: 4px 10px 4px 6px;
        font-size: 14px;
        line-height: 1;
        margin-top: 7px;
        color: var(--color-primary-text, #222);
        transition: background 0.2s;
    }

    .selected-field:hover {
        background: var(--color-hover-background);
    }

    .selected-field-content {
        align-self: center;
    }

    .selected-field--clickable .selected-field-content {
        cursor: pointer;
    }

    .selected-field .remove-btn {
        margin-left: 8px;
        color: var(--color-secondary-text);
        cursor: pointer;
        background: none;
        border: none;
        padding: 2px;
        border-radius: 4px;
        transition: background 0.15s;
    }

    .selected-field .remove-btn:hover {
        color: var(--color-accent);
    }

    .field-icon {
        color: var(--color-accent);
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
}
</style>