<template>
  <div>
    <div class="container-fluid mt-4">
      <div class="row justify-content-center">
        <div class="col-md-10">
          <div class="d-flex flex-column gap-4">
            <div class="admin-section-header">
              <h2>Ограничения</h2>
              <p class="admin-section-desc">Управление ограничениями страниц и URL-политиками доступа</p>
            </div>

            <LoadingContentArea :loading="isLoading" min-height="16rem">
              <div class="d-flex flex-column gap-4">
                <PageManager
                  :pages="pages"
                  :components="components"
                  @page-type-change="onPageTypeChange"
                  @component-added="onComponentAdded"
                  @delete-component="deleteComponent"
                />

                <PolicyManager
                  ref="policyManagerRef"
                  :pages="pages"
                  :roles="roles"
                  :role-groups="roleGroups"
                  :policies="policies"
                  :selected-page-path="selectedPagePath"
                  @update:policies="policies = $event"
                  @update:selected-page-path="selectedPagePath = $event"
                  @request-delete="requestPolicyDeletion"
                />
              </div>
            </LoadingContentArea>
          </div>
        </div>
      </div>
    </div>

    <ModalCenter
      standalone
      modal-id="limitationErrorModal"
      :visible="showErrorModal"
      @close="showErrorModal = false"
    >
      <template #title>
        <span class="text-danger">Ошибка</span>
      </template>
      {{ errorMessage }}
      <template #footer>
        <button type="button" class="ui-btn ui-btn--secondary" @click="showErrorModal = false">Закрыть</button>
      </template>
    </ModalCenter>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import { runWithConfirm } from '@/js/utils/confirm.js'
import ModalCenter from '@/components/ModalCenter.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import {
  DeletePolicy,
  GetPageComponents,
  GetPages,
  GetPolicies,
  GetRoleGroups,
  GetRoles,
  PutPages,
  RemovePageComponent
} from '@/core/cms/adp/admin/js/GroupsPolitics'
import PageManager from './LimitationComponents/PageManager.vue'
import PolicyManager from './LimitationComponents/PolicyManager.vue'

const toast = useToast()

const pages = ref([])
const components = ref([])
const roles = ref([])
const roleGroups = ref([])
const policies = ref([])
const selectedPagePath = ref('')
const prevTypes = reactive({})

const showErrorModal = ref(false)
const errorMessage = ref('')
const policyManagerRef = ref(null)
const isLoading = ref(true)

onMounted(async () => {
  await initializeData()
})

async function initializeData() {
  isLoading.value = true
  try {
    const [pagesResponse, componentsResponse, rolesResponse, roleGroupsResponse, policiesResponse] = await Promise.all([
      GetPages(),
      GetPageComponents(),
      GetRoles(),
      GetRoleGroups(),
      GetPolicies()
    ])

    pages.value = pagesResponse.pages || []
    components.value = componentsResponse || []
    roles.value = rolesResponse || []
    roleGroups.value = roleGroupsResponse || []
    policies.value = policiesResponse || []

    for (const page of pages.value) {
      prevTypes[page.path] = page.type
    }

    if (!selectedPagePath.value && pages.value.length > 0) {
      selectedPagePath.value = pages.value[0].path
    }
  } catch (error) {
    logError('Ошибка инициализации ограничений', error)
    toast.error('Не удалось загрузить данные ограничений. Попробуйте позже.')
  } finally {
    isLoading.value = false
  }
}

watch(
  () => pages.value,
  (newPages) => {
    if (!selectedPagePath.value && newPages.length > 0) {
      selectedPagePath.value = newPages[0].path
    }
  },
  { deep: true }
)

async function onPageTypeChange(page) {
  if (page.type === 'withoutliminations') {
    const hasComponents = components.value.some((component) => component.page_path === page.path)
    if (hasComponents) {
      toast.error(`Невозможно сделать страницу "${page.path}" открытой, так как на ней есть компоненты.`)
      page.type = prevTypes[page.path]
      return
    }
  }
  prevTypes[page.path] = page.type
  await PutPages(page.path, page.type)
  toast.success('Тип страницы обновлен')
}

function onComponentAdded(component) {
  components.value.push(component)
}

async function deleteComponent(index, path, compid) {
  const response = await RemovePageComponent(path, compid)
  if (response.message === 'Компонент успешно удален') {
    components.value.splice(index, 1)
    toast.success('Компонент удален')
  } else {
    errorMessage.value = response.message
    showErrorModal.value = true
  }
}

function renderPolicyTarget(policy) {
  if (policy.role_name) return `Роль · ${policy.role_name}`
  if (policy.role_group_name) return `Группа · ${policy.role_group_name}`
  return '—'
}

async function requestPolicyDeletion(policy) {
  await runWithConfirm(
    {
      title: 'Удаление политики',
      message: `Удалить политику «${policy.name}» для ${renderPolicyTarget(policy)}?`,
      confirmText: 'Удалить',
      variant: 'danger',
    },
    async () => {
      await DeletePolicy(policy.id)
      toast.success('Политика удалена')
      if (policyManagerRef.value) {
        await policyManagerRef.value.refreshPolicies()
      }
    },
  )
}
</script>

<style scoped>
.admin-section-header {
  padding-bottom: 0.5rem;
}

.admin-section-header h2 {
  margin: 0;
  font-weight: 700;
  color: var(--color-primary-text);
}

.admin-section-desc {
  margin: 0.25rem 0 0;
  color: var(--color-secondary-text);
  font-size: 0.9rem;
}
</style>
