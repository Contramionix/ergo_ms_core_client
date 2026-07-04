<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import { Send } from 'lucide-vue-next'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import UserProfileFields from './UserProfileFields.vue'
import {
  USER_PROFILE_IDENTITY_FIELDS,
  mapUserProfileToFormData,
  buildUserProfilePayload,
  validateUserProfileData,
} from '@/core/cms/adp/js/userProfileForm.js'
import {
  fetchMyProfileChangeRequests,
  createProfileChangeRequest,
} from '@/core/cms/adp/js/profileChangeRequestService.js'

const props = defineProps({
  profileData: { type: Object, required: true },
})

const toast = useToast()

const loading = ref(true)
const submitting = ref(false)
const requests = ref([])
const requestFlowEnabled = ref(false)
const requestFormData = ref({})
const requestErrors = ref({})

const pendingRequest = computed(() =>
  requests.value.find((item) => item.status === 'pending') || null,
)

const hasPendingRequest = computed(() => Boolean(pendingRequest.value))

const statusLabels = {
  pending: 'На рассмотрении',
  approved: 'Одобрено',
  rejected: 'Отклонено',
}

const statusClass = {
  pending: 'profile-change-request__status--pending',
  approved: 'profile-change-request__status--approved',
  rejected: 'profile-change-request__status--rejected',
}

const resetRequestForm = () => {
  requestFormData.value = mapUserProfileToFormData(props.profileData)
  requestErrors.value = {}
}

const loadRequests = async () => {
  loading.value = true
  try {
    const data = await fetchMyProfileChangeRequests()
    requestFlowEnabled.value = Boolean(data.request_flow_enabled)
    requests.value = data.requests || []
  } catch (error) {
    logError('Ошибка загрузки заявок на изменение данных профиля:', error)
    requestFlowEnabled.value = false
    requests.value = []
  } finally {
    loading.value = false
  }
}

const submitRequest = async () => {
  requestErrors.value = {}

  const validation = validateUserProfileData(
    buildUserProfilePayload(requestFormData.value, USER_PROFILE_IDENTITY_FIELDS),
  )
  if (!validation.isValid) {
    requestErrors.value = Object.fromEntries(
      Object.entries(validation.errors).filter(([field]) =>
        USER_PROFILE_IDENTITY_FIELDS.includes(field),
      ),
    )
    if (Object.keys(requestErrors.value).length) {
      return
    }
  }

  submitting.value = true
  try {
    await createProfileChangeRequest({
      ...buildUserProfilePayload(requestFormData.value, USER_PROFILE_IDENTITY_FIELDS),
      comment: (requestFormData.value.comment || '').trim(),
    })
    toast.success('Заявка отправлена администратору')
    await loadRequests()
  } catch (error) {
    logError('Ошибка отправки заявки:', error)
    const message = error?.response?.data?.error || 'Не удалось отправить заявку'
    toast.error(message)
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.profileData,
  () => {
    if (!hasPendingRequest.value) {
      resetRequestForm()
    }
  },
  { deep: true },
)

onMounted(async () => {
  resetRequestForm()
  await loadRequests()
})
</script>

<template>
  <div v-if="requestFlowEnabled" class="profile-change-request">
    <div class="profile-change-request__header">
      <h2 class="profile-change-request__title">Заявка на изменение данных</h2>
      <p class="profile-change-request__hint">
        Изменение email, фамилии, имени, отчества и телефона доступно только администратору.
        Заполните форму ниже — заявка попадёт в реестр администратора.
      </p>
    </div>

    <div v-if="loading" class="profile-change-request__loading">
      <SpinnerLoading color="primary" />
    </div>

    <template v-else>
      <div v-if="pendingRequest" class="profile-change-request__notice">
        <span class="profile-change-request__status" :class="statusClass.pending">
          {{ statusLabels.pending }}
        </span>
        <p class="mb-1">
          Email: <strong>{{ pendingRequest.email || pendingRequest.current_email || '—' }}</strong>
        </p>
        <p class="mb-1">
          ФИО: <strong>{{ pendingRequest.requested_full_name || '—' }}</strong>
        </p>
        <p class="mb-1">
          Телефон: <strong>{{ pendingRequest.phone || pendingRequest.current_phone || '—' }}</strong>
        </p>
        <p v-if="pendingRequest.comment" class="mb-0 text-muted">
          Комментарий: {{ pendingRequest.comment }}
        </p>
      </div>

      <template v-else>
        <UserProfileFields
          :fields="USER_PROFILE_IDENTITY_FIELDS"
          :form-data="requestFormData"
          :errors="requestErrors"
          id-prefix="profile-change-request"
        />

        <div class="profile-change-request__row">
          <label class="profile-change-request__label" for="profile-change-request-comment">
            Комментарий
          </label>
          <div class="profile-change-request__control">
            <textarea
              id="profile-change-request-comment"
              v-model="requestFormData.comment"
              rows="3"
              maxlength="500"
              class="form-control form-control-sm profile-change-request__textarea"
              placeholder="Пояснение для администратора (необязательно)"
            />
          </div>
        </div>

        <div class="profile-change-request__footer">
          <button
            type="button"
            class="btn btn-sm profile-change-request__submit"
            :disabled="submitting"
            @click="submitRequest"
          >
            <Send :size="16" class="profile-change-request__submit-icon" />
            <span v-if="submitting">Отправка...</span>
            <span v-else>Отправить заявку</span>
          </button>
        </div>
      </template>

      <div v-if="requests.length" class="profile-change-request__history">
        <h3 class="profile-change-request__history-title">История заявок</h3>
        <div
          v-for="item in requests"
          :key="item.id"
          class="profile-change-request__history-item"
        >
          <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
            <span class="profile-change-request__status" :class="statusClass[item.status]">
              {{ statusLabels[item.status] || item.status }}
            </span>
            <span class="text-muted small">{{ item.email || item.current_email }}</span>
            <span class="text-muted small">{{ item.requested_full_name }}</span>
            <span v-if="item.phone" class="text-muted small">{{ item.phone }}</span>
          </div>
          <p v-if="item.admin_comment" class="mb-0 small text-muted">
            Ответ администратора: {{ item.admin_comment }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.profile-change-request {
  margin-top: 1rem;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 0.625rem;
  overflow: hidden;
}

.profile-change-request__header {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.profile-change-request__title {
  margin: 0 0 0.35rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary-text);
}

.profile-change-request__hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-secondary-text);
}

.profile-change-request__loading {
  display: flex;
  justify-content: center;
  padding: 1.5rem;
}

.profile-change-request__notice {
  padding: 0.875rem 1rem;
}

.profile-change-request__row {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border-top: 1px solid var(--color-border);

  @media (max-width: 575.98px) {
    flex-direction: column;
  }
}

.profile-change-request__label {
  flex: 0 0 auto;
  min-width: 6.5rem;
  padding-top: 0.35rem;
  font-size: 0.875rem;
  color: var(--color-secondary-text);
  margin: 0;
}

.profile-change-request__control {
  flex: 1 1 60%;
  min-width: 0;
}

.profile-change-request__textarea {
  background: var(--color-primary-background);
  color: var(--color-primary-text);
  border: 1px solid var(--color-border);
  resize: vertical;
  min-height: 4.5rem;
}

.profile-change-request__footer {
  display: flex;
  justify-content: flex-end;
  padding: 0.75rem 1rem 1rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-primary-background);
}

.profile-change-request__submit {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--color-primary-background);
  color: var(--color-primary-text);
  border: 1px solid var(--color-border);
  box-shadow: none;

  &:hover:not(:disabled),
  &:focus-visible:not(:disabled) {
    background: var(--color-secondary-background);
    color: var(--color-primary-text);
    border-color: var(--color-border);
    box-shadow: none;
  }

  &:disabled {
    opacity: 0.65;
  }
}

.profile-change-request__submit-icon {
  flex-shrink: 0;
}

.profile-change-request__status {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.profile-change-request__status--pending {
  background: rgba(var(--bs-primary-rgb, 13, 110, 253), 0.12);
  color: var(--bs-primary, #0d6efd);
}

.profile-change-request__status--approved {
  background: rgba(var(--bs-success-rgb, 25, 135, 84), 0.12);
  color: var(--bs-success, #198754);
}

.profile-change-request__status--rejected {
  background: rgba(var(--bs-danger-rgb, 220, 53, 69), 0.12);
  color: var(--bs-danger, #dc3545);
}

.profile-change-request__history {
  padding: 0.875rem 1rem 1rem;
  border-top: 1px solid var(--color-border);
}

.profile-change-request__history-title {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary-text);
}

.profile-change-request__history-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
}
</style>
