<script setup>
import { computed } from 'vue'
import { BIO_MAX_LENGTH } from '@/core/cms/adp/js/userProfileForm.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const formData = defineModel('formData', { type: Object, required: true })

const props = defineProps({
  fields: { type: Array, required: true },
  errors: { type: Object, default: () => ({}) },
  idPrefix: { type: String, default: 'user-profile' },
  emailReadonly: { type: Boolean, default: false },
  readonlyFields: { type: Array, default: () => [] },
})

const { t } = useAppI18n()
const bioCharCount = computed(() => (formData.value.bio || '').length)

const fieldMeta = computed(() => ({
  email: {
    label: t('settings.profile.email'),
    type: 'email',
    autocomplete: 'email',
    placeholder: 'email@example.com',
  },
  first_name: {
    label: t('settings.profile.firstName'),
    type: 'text',
    autocomplete: 'given-name',
    placeholder: t('settings.profile.enterFirstName'),
  },
  last_name: {
    label: t('settings.profile.lastName'),
    type: 'text',
    autocomplete: 'family-name',
    placeholder: t('settings.profile.enterLastName'),
  },
  middle_name: {
    label: t('settings.profile.middleName'),
    type: 'text',
    autocomplete: 'additional-name',
    placeholder: t('settings.profile.enterMiddleName'),
  },
  phone: {
    label: t('settings.profile.phone'),
    type: 'tel',
    autocomplete: 'tel',
    placeholder: '+7 (999) 123-45-67',
  },
  bio: {
    label: t('settings.profile.bio'),
    type: 'textarea',
    placeholder: t('settings.profile.enterBio'),
  },
}))

const visibleFields = computed(() =>
  props.fields
    .filter((field) => fieldMeta.value[field])
    .map((field) => ({ key: field, ...fieldMeta.value[field] })),
)

const inputId = (field) => `${props.idPrefix}-${field}`

const isFieldReadonly = (fieldKey) =>
  (fieldKey === 'email' && props.emailReadonly) || props.readonlyFields.includes(fieldKey)
</script>

<template>
  <template v-for="(field, index) in visibleFields" :key="field.key">
    <div
      class="profile-card__row"
      :class="{ 'profile-card__row--last': index === visibleFields.length - 1 }"
    >
      <label class="profile-card__label" :for="inputId(field.key)">{{ field.label }}</label>
      <div class="profile-card__control">
        <span
          v-if="isFieldReadonly(field.key)"
          class="profile-card__value profile-card__value--static text-truncate"
          :title="formData[field.key] || t('settings.profile.notSpecified')"
        >
          {{ formData[field.key] || t('settings.profile.notSpecified') }}
        </span>

        <textarea
          v-else-if="field.type === 'textarea'"
          :id="inputId(field.key)"
          v-model="formData[field.key]"
          rows="4"
          :maxlength="BIO_MAX_LENGTH"
          class="form-control form-control-sm profile-card__input profile-card__textarea"
          :class="{ 'is-invalid': errors[field.key] }"
          :placeholder="field.placeholder"
        />

        <input
          v-else
          :id="inputId(field.key)"
          v-model="formData[field.key]"
          :type="field.type"
          class="form-control form-control-sm profile-card__input"
          :class="{ 'is-invalid': errors[field.key] }"
          :autocomplete="field.autocomplete"
          :placeholder="field.placeholder"
        />

        <div
          v-if="field.key === 'bio'"
          class="profile-card__char-counter"
          :class="{ 'profile-card__char-counter--limit': bioCharCount >= BIO_MAX_LENGTH }"
        >
          {{ bioCharCount }}/{{ BIO_MAX_LENGTH }}
        </div>

        <div v-if="errors[field.key]" class="invalid-feedback d-block">
          {{ errors[field.key] }}
        </div>
      </div>
    </div>
  </template>
</template>

<style scoped lang="scss">
.profile-card__row {
  display: grid;
  grid-template-columns: minmax(9.5rem, 12rem) minmax(0, 1fr);
  align-items: start;
  column-gap: 1rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--color-border);

  @media (width < $ui-bp-sm) {
    grid-template-columns: 1fr;
    row-gap: 0.5rem;
  }
}

.profile-card__row--last {
  border-bottom: none;
}

.profile-card__label {
  min-width: 0;
  padding-top: 0.35rem;
  font-size: 0.875rem;
  line-height: 1.3;
  color: var(--color-secondary-text);
  margin: 0;
  overflow-wrap: anywhere;
}

.profile-card__value {
  flex: 1 1 auto;
  font-size: 0.9375rem;
  color: var(--color-primary-text);
}

.profile-card__value--static {
  display: block;
  padding-top: 0.35rem;
  text-align: left;
}

.profile-card__control {
  min-width: 0;
}

.profile-card__input {
  background: var(--color-primary-background);
  color: var(--color-primary-text);
  border: 1px solid var(--color-border);
  box-shadow: none;

  &:focus,
  &:focus-visible {
    outline: none;
    background: var(--color-hover-background);
    border-color: var(--color-border);
    box-shadow: none;
  }

  &::placeholder {
    color: var(--color-secondary-text);
    opacity: 0.75;
  }
}

.profile-card__textarea {
  resize: vertical;
  min-height: 5.5rem;
  line-height: 1.4;
  font-family: inherit;
}

.profile-card__char-counter {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-secondary-text);
  text-align: right;
}

.profile-card__char-counter--limit {
  color: var(--bs-danger, #dc3545);
}
</style>
