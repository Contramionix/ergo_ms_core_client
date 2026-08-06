<script setup>
import { computed, ref, watch, useId } from 'vue'
import SelectBox from '@/components/SelectBox.vue'
import PolicyPageBrowser from '@/core/cms/adp/admin/PermissionsComponents/PolicyPageBrowser.vue'
import {
  formatModuleLabel,
  getPolicyPathModeOptions,
  mapModuleSelectOptions,
  resolveModuleUrlPrefixes,
} from '@/core/cms/js/adminSelectOptions.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()
const fieldId = useId()

const props = defineProps({
  pages: { type: Array, default: () => [] },
  modulePageGroups: { type: Array, default: () => [] },
  moduleCatalog: { type: Array, default: () => [] },
  resourcePath: { type: String, default: '' },
  isPattern: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  /** 'url' — клиентские path; 'api' — HTTP API */
  catalogMode: { type: String, default: 'url' },
})

const emit = defineEmits(['update:resourcePath', 'update:isPattern'])

const resourceMode = ref(props.isPattern ? 'pattern' : 'page')
const selectedModule = ref(null)

const pathModeOptions = computed(() => {
  const options = getPolicyPathModeOptions()
  if (props.catalogMode !== 'api') {
    return options
  }
  return options.map((opt) => (
    opt.id === 'page'
      ? { ...opt, name: t('admin.policies.endpoint') }
      : opt
  ))
})
const moduleOptions = computed(() => mapModuleSelectOptions(props.pages, props.moduleCatalog))

const groups = computed(() =>
  (props.modulePageGroups || []).filter((group) => (group.pages || []).length > 0),
)

const patternPresets = computed(() => {
  if (props.catalogMode === 'api') {
    if (!selectedModule.value || selectedModule.value === 'core') {
      return [
        { id: '/api/**', name: t('admin.policies.allApi') },
        { id: '/api/cms/**', name: t('admin.policies.allCmsApi') },
      ]
    }
    const moduleLabel = formatModuleLabel(selectedModule.value, props.moduleCatalog)
    return resolveModuleUrlPrefixes(selectedModule.value, props.pages).map((prefix) => {
      const pattern = `${prefix}/**`
      return {
        id: pattern,
        name: t('admin.policies.wholeModule', { module: moduleLabel, pattern }),
      }
    })
  }

  if (!selectedModule.value || selectedModule.value === 'core') {
    return [
      { id: '/admin-panel/**', name: t('admin.policies.allAdmin') },
      { id: '/settings/**', name: t('admin.policies.allSettings') },
    ]
  }

  const moduleLabel = formatModuleLabel(selectedModule.value, props.moduleCatalog)
  return resolveModuleUrlPrefixes(selectedModule.value, props.pages).map((prefix) => {
    const pattern = `${prefix}/**`
    return {
      id: pattern,
      name: t('admin.policies.wholeModule', { module: moduleLabel, pattern }),
    }
  })
})

const pathModeId = computed(() => `${fieldId}-path-mode`)

watch(
  () => props.isPattern,
  (value) => {
    resourceMode.value = value ? 'pattern' : 'page'
  },
)

watch(resourceMode, (mode) => {
  const nextIsPattern = mode === 'pattern'
  if (props.isPattern !== nextIsPattern) {
    emit('update:isPattern', nextIsPattern)
  }
})

watch(
  () => props.resourcePath,
  (path) => {
    if (!path || props.isPattern) {
      return
    }

    const matchedPage = props.pages.find((page) => page.path === path)
    if (matchedPage) {
      selectedModule.value = matchedPage.module_name || matchedPage.module || 'core'
    }
  },
  { immediate: true },
)

watch(
  () => props.catalogMode,
  () => {
    selectedModule.value = null
  },
)

function applyPatternPreset(presetPath) {
  if (!presetPath) {
    return
  }
  emit('update:resourcePath', presetPath)
}
</script>

<template>
  <div class="policy-resource-path">
    <SelectBox
      :id="pathModeId"
      v-model="resourceMode"
      :label="t('admin.policies.path')"
      :options="pathModeOptions"
      value-key="id"
      label-key="name"
      :include-all-option="false"
    />

    <div class="policy-resource-path__body">
      <PolicyPageBrowser
        v-if="resourceMode === 'page'"
        :groups="groups"
        :catalog-mode="catalogMode"
        :model-value="resourcePath"
        @update:model-value="emit('update:resourcePath', $event)"
      />

      <template v-else>
        <div class="policy-resource-path__row">
          <SelectBox
            v-model="selectedModule"
            :label="t('admin.policies.modulePresets')"
            :options="moduleOptions"
            value-key="id"
            label-key="name"
            :include-all-option="true"
            :all-label="t('admin.policies.noModule')"
            searchable
          />
          <SelectBox
            :label="t('admin.policies.quickPatterns')"
            :model-value="resourcePath || null"
            :options="patternPresets"
            value-key="id"
            label-key="name"
            :include-all-option="true"
            :all-label="t('admin.policies.selectPreset')"
            @update:model-value="applyPatternPreset"
          />
        </div>

        <small class="form-text text-muted d-block">
          {{ t('admin.policies.pathPatternHelp') }}
        </small>
      </template>

      <div v-if="invalid" class="invalid-feedback d-block">
        {{ t('admin.policies.pathRequired') }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.policy-resource-path {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  code {
    font-size: 0.85em;
  }
}

.policy-resource-path__body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.policy-resource-path__row {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  gap: 0.75rem;

  @media (width < $ui-bp-md) {
    grid-template-columns: 1fr;
  }
}
</style>
