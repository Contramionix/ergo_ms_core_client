<script setup>
import { computed, ref, watch, defineAsyncComponent, useId } from 'vue'
import { Keyboard, ListTree } from 'lucide-vue-next'
import SelectBox from '@/components/SelectBox.vue'
import {
  getPolicyPathModeOptions,
  mapModuleSelectOptions,
} from '@/core/cms/js/adminSelectOptions.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const PolicyPageBrowser = defineAsyncComponent(() =>
  import('@/core/cms/adp/admin/PermissionsComponents/PolicyPageBrowser.vue'),
)

const { t } = useAppI18n()
const fieldId = useId()

const props = defineProps({
  pages: { type: Array, default: () => [] },
  modulePageGroups: { type: Array, default: () => [] },
  moduleCatalog: { type: Array, default: () => [] },
  resourcePath: { type: String, default: '' },
  isPattern: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
})

const emit = defineEmits(['update:resourcePath', 'update:isPattern'])

const resourceMode = ref(props.isPattern ? 'pattern' : 'page')
const selectedModule = ref(null)
const showManualInput = ref(false)

const pathModeOptions = computed(() => getPolicyPathModeOptions())
const moduleOptions = computed(() => mapModuleSelectOptions(props.pages, props.moduleCatalog))

const groups = computed(() =>
  props.modulePageGroups.length > 0
    ? props.modulePageGroups
    : [],
)

const patternPresets = computed(() => {
  if (!selectedModule.value || selectedModule.value === 'core') {
    return [
      { id: '/admin-panel/*', name: t('admin.policies.allAdmin') },
      { id: '/settings/*', name: t('admin.policies.allSettings') },
    ]
  }
  return [
    {
      id: `/${selectedModule.value}/*`,
      name: t('admin.policies.wholeModule', { module: selectedModule.value }),
    },
  ]
})

const manualPathId = computed(() => `${fieldId}-manual-path`)
const patternPathId = computed(() => `${fieldId}-pattern-path`)
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
  if (mode === 'page') {
    showManualInput.value = false
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
      showManualInput.value = false
      return
    }

    showManualInput.value = true
  },
  { immediate: true },
)

function toggleManualInput() {
  showManualInput.value = !showManualInput.value
}

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
      <template v-if="resourceMode === 'page'">
        <PolicyPageBrowser
          v-if="!showManualInput"
          :groups="groups"
          :model-value="resourcePath"
          @update:model-value="emit('update:resourcePath', $event)"
        >
          <template #actions>
            <button type="button" class="ui-btn ui-btn--secondary" @click="toggleManualInput">
              <Keyboard :size="16" aria-hidden="true" />
              <span>{{ t('admin.policies.enterPathManually') }}</span>
            </button>
          </template>
        </PolicyPageBrowser>

        <div v-else class="policy-resource-path__manual">
          <div>
            <label class="form-label" :for="manualPathId">{{ t('admin.policies.pagePath') }}</label>
            <input
              :id="manualPathId"
              type="text"
              class="form-control"
              :class="{ 'is-invalid': invalid }"
              :value="resourcePath"
              placeholder="/example/path"
              @input="emit('update:resourcePath', $event.target.value)"
            />
          </div>
          <button type="button" class="ui-btn ui-btn--secondary" @click="toggleManualInput">
            <ListTree :size="16" aria-hidden="true" />
            <span>{{ t('admin.policies.chooseFromCatalog') }}</span>
          </button>
        </div>
      </template>

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
            :model-value="null"
            :options="patternPresets"
            value-key="id"
            label-key="name"
            :include-all-option="true"
            :all-label="t('admin.policies.selectPreset')"
            @update:model-value="applyPatternPreset"
          />
        </div>

        <div>
          <label class="form-label" :for="patternPathId">{{ t('admin.policies.pathPattern') }}</label>
          <input
            :id="patternPathId"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': invalid }"
            :value="resourcePath"
            placeholder="/module/*"
            @input="emit('update:resourcePath', $event.target.value)"
          />
          <small class="form-text text-muted d-block">
            <span v-html="t('admin.policies.pathPatternHelp')"></span>
          </small>
        </div>
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

.policy-resource-path__manual {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}
</style>
