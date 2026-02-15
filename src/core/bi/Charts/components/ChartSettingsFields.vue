<template>
    <div class="chart-settings-fields">
        <div v-for="setting in settingTypes" :key="setting.key" class="setting">
            <div class="setting-header" :class="{ 'setting-header--actions-visible': fieldsModalOpenForKey === setting.key }">
                <div class="setting-header-left">
                    <component :is="setting.icon" size="18" />
                    <h6 class="m-0 me-1">{{ setting.label }}</h6>
                </div>
                <div class="setting-header-right">
                    <button v-if="showSectionSettings(setting.key)" type="button" class="action-btn settings-btn" title="Настройки секции" @click="emit('openSectionSettings', { settingKey: setting.key, setting })">
                        <Settings size="16" class="settings-btn-icon" />
                    </button>
                    <button type="button" class="btn btn-sm fw-bold add-field-btn" data-fields-modal-trigger @click="onAddFieldClick($event, setting.key)">
                        <Plus size="16" />
                    </button>
                </div>
            </div>
            <div v-for="f in selectedFields[setting.key]" :key="f.id" class="selected-field" :class="{ 'selected-field--clickable': setting.key === 'filters' }">
                <div class="selected-field-content" @click="setting.key === 'filters' ? emit('editFilter', f) : null">
                    <button v-if="!isVirtualMeasureField(f)" type="button" class="field-icon-btn" :class="f.source" @click.stop="emit('openFieldSettings', { field: f, settingKey: setting.key })">
                        <component :is="getFieldIcon(f)" size="16" />
                    </button>
                    <span v-else class="field-icon" :class="f.source"><component :is="getFieldIcon(f)" size="16" /></span>
                    <span class="field-name-wrap">
                        <span :class="{ 'field-name--virtual': isVirtualMeasureField(f) }">{{ getFieldDisplayName(f) }}</span>{{ filterFieldSuffix(f, setting.key) }}
                    </span>
                </div>
                <div class="selected-field-actions">
                    <button v-if="!isVirtualMeasureField(f)" type="button" class="action-btn formula-btn" title="Формула" @click.stop="emit('openFormula', { field: f, settingKey: setting.key })"><SquareFunction size="16" /></button>
                    <button class="remove-btn" @click.stop="emit('removeField', f, setting.key)" title="Удалить"><X size="16" /></button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { Type, Hash, Calendar, CheckCircle, MapPin, Globe, Plus, X, BarChart2, SquareFunction, Settings } from 'lucide-vue-next'
import { isVirtualMeasureField } from '../js/measureVirtualFields.js'

const props = defineProps({
    settingTypes: {
        type: Array,
        required: true,
    },
    selectedFields: {
        type: Object,
        required: true,
    },
    fieldsModalOpenForKey: {
        type: String,
        default: null,
    },
    chartType: {
        type: String,
        default: '',
    },
})

const emit = defineEmits(['addFieldClick', 'removeField', 'editFilter', 'openFieldSettings', 'openFormula', 'openSectionSettings'])

const SECTION_KEYS_WITH_SETTINGS_BY_CHART_TYPE = {
    table: ['columns', 'color'],
    indicator: ['color'],
    pie: [],
    doughnut: [],
    bar: ['x', 'y', 'labels'],
    area: ['x', 'y', 'labels'],
    scatter: ['x', 'y', 'sizeDots'],
}

function showSectionSettings(settingKey) {
    const type = (props.chartType || '').toLowerCase().trim()
    const allowed = SECTION_KEYS_WITH_SETTINGS_BY_CHART_TYPE[type]
    if (!Array.isArray(allowed) || !allowed.includes(settingKey)) return false
    if (type === 'table' && settingKey === 'color') {
        return (props.selectedFields?.color?.length ?? 0) > 0
    }
    if (type === 'table' && settingKey === 'columns') {
        return (props.selectedFields?.columns?.length ?? 0) > 0
    }
    return true
}

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

function getFieldIcon(f) {
    if (isVirtualMeasureField(f)) return BarChart2
    return typeIcon[f.type] || Type
}

function getFieldDisplayName(f) {
    if (isVirtualMeasureField(f)) return f.displayName ?? f.label ?? f.name
    return f.displayName ?? f.name
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
        align-items: center;
    }

    .setting-header-left {
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .setting-header-right {
        display: flex;
        align-items: center;
        gap: 4px;

        & > button {
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.15s, color 0.15s;
            padding: 0;
            margin: 0;
            display: flex;
            color: var(--color-secondary-text);
            border: none;
            background: none;
            cursor: pointer;
            border-radius: 4px;

            &:hover {
                color: var(--color-accent);
            }
        }

        & > button.add-field-btn {
            color: var(--color-primary-text);

            &:hover {
                color: var(--color-accent);
            }
        }
    }

    .setting:hover .setting-header-right > button,
    .setting-header--actions-visible .setting-header-right > button {
        opacity: 1;
        pointer-events: auto;
    }

    .setting-header--actions-visible .setting-header-right > button.add-field-btn {
        color: var(--color-accent);
    }

    .action-btn.settings-btn {
        color: var(--color-primary-text);
        cursor: pointer;
        background: none;
        border: none;
        padding: 2px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.15s, background 0.15s, color 0.15s;

        .settings-btn-icon {
            transition: transform 0.2s ease;
        }

        &:hover {
            color: var(--color-accent);

            .settings-btn-icon {
                transform: rotate(90deg);
            }
        }
    }

    .selected-field {
        display: flex;
        justify-content: space-between;
        background: var(--color-primary-background);
        border-radius: 6px;
        padding: 4px 10px 4px 6px;
        font-size: 14px;
        line-height: 1.4;
        margin-top: 7px;
        color: var(--color-primary-text, #222);
        transition: background 0.2s;
    }

    .selected-field:hover {
        background: var(--color-hover-background);
    }

    .selected-field-content {
        flex: 1;
        min-width: 0;
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: flex-start;
        width: 100%;
    }

    .field-name-wrap {
        display: block;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        line-height: 1.4;
    }

    .selected-field--clickable .selected-field-content {
        cursor: pointer;
    }

    .selected-field-actions {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
        max-width: 0;
        margin-left: 0;
        overflow: hidden;
        opacity: 0;
        transition: max-width 0.2s, margin-left 0.2s, opacity 0.15s;
    }

    .selected-field:hover .selected-field-actions {
        max-width: 80px;
        margin-left: 8px;
        opacity: 1;
    }

    .selected-field .action-btn,
    .selected-field .remove-btn {
        color: var(--color-secondary-text);
        cursor: pointer;
        background: none;
        border: none;
        padding: 2px;
        border-radius: 4px;
        transition: background 0.15s, color 0.15s;
    }

    .selected-field .action-btn:hover,
    .selected-field .remove-btn:hover {
        color: var(--color-accent);
    }

    .field-icon,
    .field-icon-btn {
        color: var(--color-accent);
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .field-icon-btn {
        padding: 2px;
        margin: -2px;
        border: none;
        background: none;
        cursor: pointer;
        border-radius: 4px;
        transition: background 0.15s ease, color 0.15s ease;
    }

    .field-icon-btn:hover {
        background: var(--color-hover-background);
        color: var(--color-accent);
    }

    .field-name--virtual {
        font-style: italic;
    }
}
</style>