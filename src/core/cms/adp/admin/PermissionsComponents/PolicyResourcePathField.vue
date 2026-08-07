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
  apiPages: { type: Array, default: () => [] },
  apiModulePageGroups: { type: Array, default: () => [] },
  apiModuleCatalog: { type: Array, default: () => [] },
  resourcePath: { type: String, default: '' },
  isPattern: { type: Boolean, default: false },
  resources: { type: Array, default: () => [] },
  policyTypes: { type: Array, default: () => ['url'] },
  multiple: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  /** 'url' — клиентские path; 'api' — HTTP API (только single-режим) */
  catalogMode: { type: String, default: 'url' },
})

const emit = defineEmits(['update:resourcePath', 'update:isPattern', 'update:resources'])

const resourceMode = ref(props.isPattern ? 'pattern' : 'page')
const selectedModule = ref(null)
const selectedModules = ref([])
const selectedPatternKeys = ref([])
const savedPagePath = ref(props.isPattern ? '' : (props.resourcePath || ''))
const savedPatternPath = ref(props.isPattern ? (props.resourcePath || '') : '')
const savedPageResources = ref([])
const savedPatternResources = ref([])
const suppressModeWatch = ref(false)

function resourceKey(policyType, path) {
  return `${policyType}::${path}`
}

function parseResourceKey(key) {
  const sep = key.indexOf('::')
  if (sep < 0) {
    return null
  }
  return {
    policy_type: key.slice(0, sep),
    path: key.slice(sep + 2),
  }
}

const activePolicyTypes = computed(() => {
  const types = (props.multiple ? props.policyTypes : [props.catalogMode === 'api' ? 'api' : 'url'])
    .filter((type) => type === 'url' || type === 'api')
  return types.length ? types : ['url']
})

const pathModeOptions = computed(() => {
  const options = getPolicyPathModeOptions()
  if (!activePolicyTypes.value.includes('api') || activePolicyTypes.value.includes('url')) {
    return options
  }
  return options.map((opt) => (
    opt.id === 'page'
      ? { ...opt, name: t('admin.policies.endpoint') }
      : opt
  ))
})

const moduleOptions = computed(() => {
  if (!props.multiple) {
    return mapModuleSelectOptions(props.pages, props.moduleCatalog)
  }

  const byId = new Map()
  if (activePolicyTypes.value.includes('url')) {
    for (const opt of mapModuleSelectOptions(props.pages, props.moduleCatalog)) {
      byId.set(opt.id, opt)
    }
  }
  if (activePolicyTypes.value.includes('api')) {
    for (const opt of mapModuleSelectOptions(props.apiPages, props.apiModuleCatalog)) {
      if (!byId.has(opt.id)) {
        byId.set(opt.id, opt)
      }
    }
  }
  return Array.from(byId.values())
})

const urlGroups = computed(() =>
  (props.modulePageGroups || []).filter((group) => (group.pages || []).length > 0),
)

const apiGroups = computed(() =>
  (props.apiModulePageGroups || []).filter((group) => (group.pages || []).length > 0),
)

const singleGroups = computed(() =>
  (props.modulePageGroups || []).filter((group) => (group.pages || []).length > 0),
)

function buildCorePresets(policyType) {
  if (policyType === 'api') {
    return [
      { path: '/api/**', name: t('admin.policies.allApi') },
      { path: '/api/cms/**', name: t('admin.policies.allCmsApi') },
    ]
  }
  return [
    { path: '/admin-panel/**', name: t('admin.policies.allAdmin') },
    { path: '/settings/**', name: t('admin.policies.allSettings') },
  ]
}

function buildModulePresets(policyType, moduleKey) {
  const pages = policyType === 'api' ? props.apiPages : props.pages
  const catalog = policyType === 'api' ? props.apiModuleCatalog : props.moduleCatalog
  if (!moduleKey || moduleKey === 'core') {
    return buildCorePresets(policyType)
  }
  const moduleLabel = formatModuleLabel(moduleKey, catalog)
  return resolveModuleUrlPrefixes(moduleKey, pages).map((prefix) => ({
    path: `${prefix}/**`,
    name: t('admin.policies.wholeModule', { module: moduleLabel }),
  }))
}

const patternPresets = computed(() => {
  if (!props.multiple) {
    const policyType = activePolicyTypes.value[0] || 'url'
    return buildModulePresets(policyType, selectedModule.value).map((item) => ({
      id: item.path,
      path: item.path,
      policy_type: policyType,
      name: item.name,
    }))
  }

  const typePrefix = activePolicyTypes.value.length > 1
  const moduleKeys = selectedModules.value.length ? selectedModules.value : [null]
  const presets = []
  const seen = new Set()

  for (const policyType of activePolicyTypes.value) {
    for (const moduleKey of moduleKeys) {
      for (const item of buildModulePresets(policyType, moduleKey)) {
        const key = resourceKey(policyType, item.path)
        if (seen.has(key)) {
          continue
        }
        seen.add(key)
        presets.push({
          id: key,
          path: item.path,
          policy_type: policyType,
          name: typePrefix
            ? `${policyType === 'api' ? 'API' : 'URL'} · ${item.name}`
            : item.name,
        })
      }
    }
  }

  return presets
})

const selectedPatternResources = computed(() =>
  selectedPatternKeys.value
    .map((key) => parseResourceKey(key))
    .filter(Boolean)
    .map((item) => ({
      path: item.path,
      policy_type: item.policy_type,
      is_pattern: true,
    })),
)

const pathModeId = computed(() => `${fieldId}-path-mode`)

function emitMultipleResources() {
  if (!props.multiple) {
    return
  }
  const next = resourceMode.value === 'pattern'
    ? selectedPatternResources.value
    : savedPageResources.value
  emit('update:resources', next)
}

function syncSelectedPatternsFromResources(list = []) {
  selectedPatternKeys.value = (list || [])
    .filter((item) => item?.is_pattern && item.path && item.policy_type)
    .map((item) => resourceKey(item.policy_type, item.path))
  savedPatternResources.value = selectedPatternResources.value
}

watch(
  () => props.isPattern,
  (value) => {
    const nextMode = value ? 'pattern' : 'page'
    if (resourceMode.value === nextMode) {
      return
    }
    suppressModeWatch.value = true
    resourceMode.value = nextMode
    suppressModeWatch.value = false
    if (!props.multiple) {
      if (value) {
        savedPatternPath.value = props.resourcePath || ''
        savedPagePath.value = ''
      } else {
        savedPagePath.value = props.resourcePath || ''
        savedPatternPath.value = ''
      }
    }
  },
)

watch(resourceMode, (mode, prevMode) => {
  if (suppressModeWatch.value || prevMode == null || prevMode === mode) {
    return
  }

  const nextIsPattern = mode === 'pattern'
  if (props.isPattern !== nextIsPattern) {
    emit('update:isPattern', nextIsPattern)
  }

  if (props.multiple) {
    if (prevMode === 'pattern') {
      savedPatternResources.value = selectedPatternResources.value
    } else {
      savedPageResources.value = [...(props.resources || [])].filter((item) => !item.is_pattern)
    }
    if (nextIsPattern) {
      syncSelectedPatternsFromResources(savedPatternResources.value)
      emit('update:resources', selectedPatternResources.value)
    } else {
      emit('update:resources', savedPageResources.value)
    }
    return
  }

  if (prevMode === 'pattern') {
    savedPatternPath.value = props.resourcePath || ''
  } else {
    savedPagePath.value = props.resourcePath || ''
  }
  const restored = nextIsPattern ? savedPatternPath.value : savedPagePath.value
  if ((props.resourcePath || '') !== (restored || '')) {
    emit('update:resourcePath', restored || '')
  }
})

watch(
  () => props.resourcePath,
  (path) => {
    if (props.multiple) {
      return
    }
    const normalized = path || ''
    if (resourceMode.value === 'pattern') {
      savedPatternPath.value = normalized
    } else {
      savedPagePath.value = normalized
    }
    if (!normalized || resourceMode.value === 'pattern') {
      return
    }
    const matchedPage = props.pages.find((page) => page.path === normalized)
    if (matchedPage) {
      selectedModule.value = matchedPage.module_name || matchedPage.module || 'core'
    }
  },
  { immediate: true },
)

watch(
  () => props.resources,
  (list) => {
    if (!props.multiple) {
      return
    }
    if (resourceMode.value === 'pattern') {
      const nextKeys = (list || [])
        .filter((item) => item?.is_pattern && item.path && item.policy_type)
        .map((item) => resourceKey(item.policy_type, item.path))
      if (nextKeys.join('|') !== selectedPatternKeys.value.join('|')) {
        selectedPatternKeys.value = nextKeys
      }
      savedPatternResources.value = selectedPatternResources.value
      return
    }
    savedPageResources.value = (list || [])
      .filter((item) => item?.path && item.policy_type)
      .map((item) => ({
        path: item.path,
        policy_type: item.policy_type,
        is_pattern: false,
      }))
  },
  { deep: true },
)

watch(selectedPatternKeys, () => {
  if (!props.multiple || resourceMode.value !== 'pattern') {
    return
  }
  savedPatternResources.value = selectedPatternResources.value
  emitMultipleResources()
})

watch(
  [selectedModules, activePolicyTypes],
  () => {
    if (!props.multiple || resourceMode.value !== 'pattern') {
      return
    }
    if (!selectedModules.value.length) {
      return
    }
    selectedPatternKeys.value = patternPresets.value.map((item) => item.id)
  },
  { deep: true },
)

watch(
  () => props.catalogMode,
  () => {
    if (props.multiple) {
      return
    }
    selectedModule.value = null
    savedPagePath.value = ''
    savedPatternPath.value = ''
  },
)

watch(
  activePolicyTypes,
  (types) => {
    if (!props.multiple) {
      return
    }
    const allowed = new Set(types)
    selectedPatternKeys.value = selectedPatternKeys.value.filter((key) => {
      const parsed = parseResourceKey(key)
      return parsed && allowed.has(parsed.policy_type)
    })
    savedPageResources.value = savedPageResources.value.filter((item) => allowed.has(item.policy_type))
    emitMultipleResources()
  },
  { deep: true },
)

function applyPatternPreset(presetPath) {
  if (!presetPath) {
    return
  }
  emit('update:resourcePath', presetPath)
}

function onPagePathsUpdate(policyType, paths) {
  const pathList = Array.isArray(paths) ? paths : (paths ? [paths] : [])
  const others = savedPageResources.value.filter((item) => item.policy_type !== policyType)
  savedPageResources.value = [
    ...others,
    ...pathList.map((path) => ({
      path,
      policy_type: policyType,
      is_pattern: false,
    })),
  ]
  if (resourceMode.value === 'page') {
    emit('update:resources', savedPageResources.value)
  }
}

function pathsForType(policyType) {
  return savedPageResources.value
    .filter((item) => item.policy_type === policyType)
    .map((item) => item.path)
}

const singlePagePaths = computed({
  get() {
    if (props.multiple) {
      return []
    }
    return props.resourcePath || ''
  },
  set(value) {
    emit('update:resourcePath', value || '')
  },
})
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

    <div
      class="policy-resource-path__body"
      :class="{ 'policy-resource-path__body--invalid': invalid }"
    >
      <template v-if="multiple">
        <div v-show="resourceMode === 'page'" class="policy-resource-path__browsers">
          <div v-if="activePolicyTypes.includes('url')" class="policy-resource-path__browser-block">
            <div v-if="activePolicyTypes.length > 1" class="policy-resource-path__browser-title">
              URL
            </div>
            <PolicyPageBrowser
              :groups="urlGroups"
              catalog-mode="url"
              multiple
              :model-value="pathsForType('url')"
              @update:model-value="onPagePathsUpdate('url', $event)"
            />
          </div>
          <div v-if="activePolicyTypes.includes('api')" class="policy-resource-path__browser-block">
            <div v-if="activePolicyTypes.length > 1" class="policy-resource-path__browser-title">
              API
            </div>
            <PolicyPageBrowser
              :groups="apiGroups"
              catalog-mode="api"
              multiple
              :model-value="pathsForType('api')"
              @update:model-value="onPagePathsUpdate('api', $event)"
            />
          </div>
        </div>
      </template>

      <PolicyPageBrowser
        v-else
        v-show="resourceMode === 'page'"
        :groups="singleGroups"
        :catalog-mode="catalogMode"
        :model-value="singlePagePaths"
        @update:model-value="singlePagePaths = $event"
      />

      <div v-show="resourceMode === 'pattern'" class="policy-resource-path__pattern">
        <div class="policy-resource-path__row">
          <SelectBox
            v-if="multiple"
            v-model="selectedModules"
            :label="t('admin.policies.modulesPresets')"
            :options="moduleOptions"
            value-key="id"
            label-key="name"
            multiple
            show-checkboxes-when-multiple
            :include-all-option="false"
            :all-label="t('admin.policies.coreModule')"
            searchable
          />
          <SelectBox
            v-else
            v-model="selectedModule"
            :label="t('admin.policies.modulePresets')"
            :options="moduleOptions"
            value-key="id"
            label-key="name"
            :include-all-option="false"
            :all-label="t('admin.policies.coreModule')"
            searchable
          />

          <SelectBox
            v-if="multiple"
            v-model="selectedPatternKeys"
            :label="t('admin.policies.quickPatterns')"
            :options="patternPresets"
            value-key="id"
            label-key="name"
            multiple
            show-checkboxes-when-multiple
            :include-all-option="true"
            :all-label="t('admin.policies.selectPresets')"
            :class="{ 'is-invalid': invalid && resourceMode === 'pattern' }"
          />
          <SelectBox
            v-else
            :label="t('admin.policies.quickPatterns')"
            :model-value="resourcePath || null"
            :options="patternPresets"
            value-key="id"
            label-key="name"
            :include-all-option="true"
            :all-label="t('admin.policies.selectPreset')"
            :class="{ 'is-invalid': invalid && resourceMode === 'pattern' }"
            @update:model-value="applyPatternPreset"
          />
        </div>

        <small v-if="multiple && resources.length" class="form-text text-muted d-block">
          {{ t('admin.policies.selectedResourcesCount', { count: resources.length }) }}
        </small>
      </div>

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

.policy-resource-path__body--invalid :deep(.policy-page-browser__modules),
.policy-resource-path__body--invalid :deep(.policy-page-browser__pages),
.policy-resource-path__body--invalid :deep(.policy-page-browser__search-results) {
  border-color: var(--bs-form-invalid-border-color, var(--bs-danger, #dc3545));
}

.policy-resource-path__pattern {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.policy-resource-path__browsers {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.policy-resource-path__browser-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-secondary-text);
  margin-bottom: 0.5rem;
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
