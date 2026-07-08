<script setup>
import { computed, ref, watch } from 'vue'
import SelectBox from '@/components/SelectBox.vue'
import PolicyPageBrowser from '@/core/cms/adp/admin/PermissionsComponents/PolicyPageBrowser.vue'
import { mapModuleSelectOptions } from '@/core/cms/js/adminSelectOptions.js'

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
      { id: '/admin-panel/*', name: 'Вся админ-панель · /admin-panel/*' },
      { id: '/settings/*', name: 'Все настройки · /settings/*' },
    ]
  }
  return [
    {
      id: `/${selectedModule.value}/*`,
      name: `Весь модуль · /${selectedModule.value}/*`,
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
    <label class="form-label d-block">Путь</label>
    <div class="btn-group mb-3" role="group" aria-label="Режим выбора пути">
      <input
        id="resourceModePage"
        type="radio"
        class="btn-check"
        name="resourceMode"
        value="page"
        :checked="resourceMode === 'page'"
        @change="setResourceMode('page')"
      />
      <label class="btn btn-outline-primary" for="resourceModePage">Страница</label>

      <input
        id="resourceModePattern"
        type="radio"
        class="btn-check"
        name="resourceMode"
        value="pattern"
        :checked="resourceMode === 'pattern'"
        @change="setResourceMode('pattern')"
      />
      <label class="btn btn-outline-primary" for="resourceModePattern">Шаблон</label>
    </div>

    <template v-if="resourceMode === 'page'">
      <template v-if="!showManualInput">
        <PolicyPageBrowser
          :groups="groups"
          :model-value="resourcePath"
          @update:model-value="emit('update:resourcePath', $event)"
        />

        <button type="button" class="btn btn-link btn-sm px-0 mt-2" @click="toggleManualInput">
          Ввести путь вручную
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
          <label for="manualResourcePath">Путь страницы</label>
        </div>
        <button type="button" class="btn btn-link btn-sm px-0 mb-2" @click="toggleManualInput">
          Выбрать из каталога
        </button>
      </template>
    </template>

    <template v-else>
      <div class="row g-3 mb-3">
        <div class="col-md-5">
          <SelectBox
            v-model="selectedModule"
            label="Модуль для пресетов"
            :options="moduleOptions"
            value-key="id"
            label-key="name"
            :include-all-option="true"
            all-label="Без модуля"
            searchable
          />
        </div>
        <div class="col-md-7">
          <SelectBox
            label="Быстрые шаблоны"
            :model-value="null"
            :options="patternPresets"
            value-key="id"
            label-key="name"
            :include-all-option="true"
            all-label="Выберите пресет"
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
        <label for="patternResourcePath">Шаблон пути</label>
      </div>
      <small class="text-muted d-block">
        Используйте <code>*</code> для одного сегмента и <code>**</code> для любого хвоста пути.
      </small>
    </template>

    <div v-if="invalid" class="invalid-feedback d-block">
      Укажите путь или выберите страницу.
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
