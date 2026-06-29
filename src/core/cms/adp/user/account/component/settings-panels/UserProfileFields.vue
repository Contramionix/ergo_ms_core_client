<script setup>
import { computed } from 'vue'
import { BIO_MAX_LENGTH } from '@/core/cms/adp/js/userProfileForm.js'

const props = defineProps({
  fields: { type: Array, required: true },
  formData: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) },
  idPrefix: { type: String, default: 'user-profile' },
  emailReadonly: { type: Boolean, default: false },
})

const bioCharCount = computed(() => (props.formData.bio || '').length)

const fieldMeta = {
  email: {
    label: 'Email',
    type: 'email',
    autocomplete: 'email',
    placeholder: 'email@example.com',
  },
  first_name: {
    label: 'Имя',
    type: 'text',
    autocomplete: 'given-name',
    placeholder: 'Введите имя',
  },
  last_name: {
    label: 'Фамилия',
    type: 'text',
    autocomplete: 'family-name',
    placeholder: 'Введите фамилию',
  },
  middle_name: {
    label: 'Отчество',
    type: 'text',
    autocomplete: 'additional-name',
    placeholder: 'Введите отчество',
  },
  phone: {
    label: 'Телефон',
    type: 'tel',
    autocomplete: 'tel',
    placeholder: '+7 (999) 123-45-67',
  },
  website: {
    label: 'Веб-сайт',
    type: 'url',
    autocomplete: 'url',
    placeholder: 'https://example.com',
  },
  country: {
    label: 'Страна',
    type: 'text',
    autocomplete: 'country-name',
    placeholder: 'Введите страну',
  },
  city: {
    label: 'Город',
    type: 'text',
    autocomplete: 'address-level2',
    placeholder: 'Введите город',
  },
  bio: {
    label: 'О себе',
    type: 'textarea',
    placeholder: 'Расскажите о себе',
  },
}

const visibleFields = computed(() =>
  props.fields.filter((field) => fieldMeta[field]).map((field) => ({ key: field, ...fieldMeta[field] })),
)

const inputId = (field) => `${props.idPrefix}-${field}`
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
          v-if="field.key === 'email' && emailReadonly"
          class="profile-card__value profile-card__value--static text-truncate"
          :title="formData.email || 'Не указан'"
        >
          {{ formData.email || 'Не указан' }}
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--color-border);

  @media (max-width: 575.98px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
}

.profile-card__row--last {
  border-bottom: none;
}

.profile-card__label {
  flex: 0 0 auto;
  min-width: 6.5rem;
  padding-top: 0.35rem;
  font-size: 0.875rem;
  color: var(--color-secondary-text);
  margin: 0;
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
  flex: 1 1 60%;
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
