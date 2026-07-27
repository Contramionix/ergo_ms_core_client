<script setup>
import { computed, ref, watch } from 'vue'
import SelectBox from '@/components/SelectBox.vue'
import PolicyPageBrowser from '@/core/cms/adp/admin/PermissionsComponents/PolicyPageBrowser.vue'
import { mapModuleSelectOptions } from '@/core/cms/js/adminSelectOptions.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()

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

watch(
  () => props.isPattern,
  (value) => {
    resourceMode.value = value ? 'pattern' : 'page'
  },
)

watch(resourceMode, (mode) => {
  const isPattern = mode === 'pattern'
  if (props.isPattern !== isPattern) {
    emit('update:isPattern', isPattern)
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

function setResourceMode(mode) {
  resourceMode.value = mode
}

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
    <label class="form-label d-block">{{ t('admin.policies.path') }}</label>
    <div class="btn-group mb-3" role="group" :aria-label="t('admin.policies.pathModeAria')">
      <input
        id="resourceModePage"
        type="radio"
        class="btn-check"
        name="resourceMode"
        value="page"
        :checked="resourceMode === 'page'"
        @change="setResourceMode('page')"
      />
      <label class="btn btn-outline-primary" for="resourceModePage">{{ t('admin.policies.page') }}</label>

      <input
        id="resourceModePattern"
        type="radio"
        class="btn-check"
        name="resourceMode"
        value="pattern"
        :checked="resourceMode === 'pattern'"
        @change="setResourceMode('pattern')"
      />
      <label class="btn btn-outline-primary" for="resourceModePattern">{{ t('admin.policies.pattern') }}</label>
    </div>

    <template v-if="resourceMode === 'page'">
      <template v-if="!showManualInput">
        <PolicyPageBrowser
          :groups="groups"
          :model-value="resourcePath"
          @update:model-value="emit('update:resourcePath', $event)"
        />

        <button type="button" class="btn btn-link btn-sm px-0 mt-2" @click="toggleManualInput">
          {{ t('admin.policies.enterPathManually') }}
        </button>
      </template>

      <template v-else>
        <div class="form-floating mb-2" v-auto-animate>
          <input
            id="manualResourcePath"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': invalid }"
            :value="resourcePath"
            placeholder="/example/path"
            @input="emit('update:resourcePath', $event.target.value)"
          />
          <label for="manualResourcePath">{{ t('admin.policies.pagePath') }}</label>
        </div>
        <button type="button" class="btn btn-link btn-sm px-0 mb-2" @click="toggleManualInput">
          {{ t('admin.policies.chooseFromCatalog') }}
        </button>
      </template>
    </template>

    <template v-else>
      <div class="row g-3 mb-3">
        <div class="col-md-5">
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
        </div>
        <div class="col-md-7">
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
      </div>

      <div class="form-floating mb-2" v-auto-animate>
        <input
          id="patternResourcePath"
          type="text"
          class="form-control"
          :class="{ 'is-invalid': invalid }"
          :value="resourcePath"
          placeholder="/module/*"
          @input="emit('update:resourcePath', $event.target.value)"
        />
        <label for="patternResourcePath">{{ t('admin.policies.pathPattern') }}</label>
      </div>
      <small class="text-muted d-block">
        <span v-html="t('admin.policies.pathPatternHelp')"></span>
      </small>
    </template>

    <div v-if="invalid" class="invalid-feedback d-block">
      {{ t('admin.policies.pathRequired') }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.policy-resource-path {
  code {
    font-size: 0.85em;
  }
}
</style>
