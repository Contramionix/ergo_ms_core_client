<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import LucideIcon from '@/components/LucideIcon.vue'
import SearchInput from '@/components/SearchInput.vue'
import SelectBox from '@/components/SelectBox.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { useDevToolsStore } from './useDevToolsStore.js'

const { t } = useAppI18n()
const store = useDevToolsStore()

const userQuery = ref('')
const permissionQuery = ref('')
let searchTimer = null

const roleOptions = computed(() => store.roles.map((role) => ({
  id: role.name,
  name: role.name,
})))

const filteredCatalog = computed(() => {
  const needle = permissionQuery.value.trim().toLowerCase()
  if (!needle) {
    return store.catalog
  }
  return store.catalog
    .map((module) => ({
      ...module,
      permissions: (module.permissions || []).filter((permission) => {
        const label = `${permission.label || ''} ${permission.key || ''}`.toLowerCase()
        return label.includes(needle)
      }),
    }))
    .filter((module) => module.permissions.length > 0)
})

const previewLabel = computed(() => {
  if (store.preview.as_user_label) {
    return store.preview.as_user_label
  }
  if (store.preview.role_name) {
    return store.preview.role_name
  }
  if (store.preview.view_as_regular) {
    return t('devTools.asRegularUser')
  }
  return ''
})

watch(userQuery, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    store.searchUsers(value)
  }, 250)
})

onMounted(() => {
  store.searchUsers('')
})

function userCaption(user) {
  return user.full_name || user.username
}
</script>

<template>
  <div class="dev-tools-panel">
    <header class="dev-tools-panel__header">
      <div class="dev-tools-panel__heading">
        <h2 class="dev-tools-panel__title">{{ t('devTools.title') }}</h2>
        <p v-if="previewLabel" class="dev-tools-panel__status">
          {{ t('devTools.nowViewing', { name: previewLabel }) }}
        </p>
      </div>
      <div class="dev-tools-panel__header-actions">
        <button
          type="button"
          class="dev-tools-panel__icon-btn"
          :disabled="store.applying"
          :aria-label="t('devTools.reset')"
          :title="t('devTools.reset')"
          @click="store.resetPreview()"
        >
          <LucideIcon name="RotateCcw" :size="16" />
        </button>
        <button
          type="button"
          class="dev-tools-panel__icon-btn"
          :aria-label="t('devTools.hide')"
          :title="t('devTools.hide')"
          @click="store.hideFab()"
        >
          <LucideIcon name="EyeOff" :size="16" />
        </button>
        <button
          type="button"
          class="dev-tools-panel__icon-btn"
          :aria-label="t('devTools.close')"
          :title="t('devTools.close')"
          @click="store.togglePanel()"
        >
          <LucideIcon name="X" :size="16" />
        </button>
      </div>
    </header>

    <ToggleSwitch
      :model-value="store.preview.view_as_regular"
      :disabled="store.applying"
      :label="t('devTools.viewAsRegular')"
      @update:model-value="store.setViewAsRegular($event)"
    />
    <p class="dev-tools-panel__hint">{{ t('devTools.viewAsRegularHint') }}</p>

    <section class="dev-tools-panel__section">
      <h3 class="dev-tools-panel__section-title">{{ t('devTools.entity') }}</h3>
      <button
        v-if="store.preview.as_user_public_id"
        type="button"
        class="dev-tools-panel__chip is-active"
        @click="store.setAsUser(null)"
      >
        {{ store.preview.as_user_label }} ×
      </button>
      <SearchInput
        v-model="userQuery"
        :placeholder="t('devTools.searchUser')"
        :show-icon="true"
      />
      <div v-if="store.recentUsers.length" class="dev-tools-panel__chips">
        <button
          v-for="user in store.recentUsers"
          :key="user.public_id"
          type="button"
          class="dev-tools-panel__chip"
          :class="{ 'is-active': store.preview.as_user_public_id === user.public_id }"
          @click="store.setAsUser(user)"
        >
          {{ userCaption(user) }}
        </button>
      </div>
      <ul class="dev-tools-panel__users">
        <li v-for="user in store.userResults" :key="user.public_id">
          <button
            type="button"
            class="dev-tools-panel__user"
            :class="{ 'is-active': store.preview.as_user_public_id === user.public_id }"
            @click="store.setAsUser(user)"
          >
            <strong>{{ userCaption(user) }}</strong>
            <span>{{ user.username }}<template v-if="user.role_name"> · {{ user.role_name }}</template></span>
          </button>
        </li>
      </ul>
    </section>

    <section class="dev-tools-panel__section">
      <h3 class="dev-tools-panel__section-title">{{ t('devTools.role') }}</h3>
      <SelectBox
        :model-value="store.preview.role_name || ''"
        :options="roleOptions"
        value-key="id"
        label-key="name"
        :include-all-option="true"
        :all-label="t('devTools.roleCurrent')"
        :searchable="true"
        @update:model-value="store.setRoleName($event)"
      />
    </section>

    <section class="dev-tools-panel__section">
      <h3 class="dev-tools-panel__section-title">{{ t('devTools.permissions') }}</h3>
      <SearchInput
        v-model="permissionQuery"
        :placeholder="t('devTools.searchPermission')"
        :show-icon="true"
      />
      <div class="dev-tools-panel__perms">
        <details
          v-for="module in filteredCatalog"
          :key="module.module_name"
          class="dev-tools-panel__module"
          open
        >
          <summary>{{ module.module_label }}</summary>
          <label
            v-for="permission in module.permissions"
            :key="permission.key"
            class="dev-tools-panel__perm"
          >
            <input
              class="form-check-input"
              type="checkbox"
              :checked="store.isPermissionChecked(module.module_name, permission.key)"
              :disabled="store.applying"
              @change="store.setPermission(module.module_name, permission.key, $event.target.checked)"
            >
            <span>{{ permission.label }}</span>
          </label>
        </details>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.dev-tools-panel {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  max-height: min(36rem, calc(100dvh - 6rem));
  overflow: auto;
  padding: 0.9rem 1rem 1rem;
}

.dev-tools-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.dev-tools-panel__heading {
  min-width: 0;
}

.dev-tools-panel__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.dev-tools-panel__status {
  margin: 0.2rem 0 0;
  color: var(--color-text-muted, #6c757d);
  font-size: 0.8125rem;
}

.dev-tools-panel__header-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.25rem;
}

.dev-tools-panel__icon-btn,
.dev-tools-panel__chip,
.dev-tools-panel__user {
  appearance: none;
  margin: 0;
  border: 1px solid var(--color-border);
  background: var(--color-surface, #fff);
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.dev-tools-panel__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border-radius: 0.5rem;
  line-height: 0;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  &:hover:not(:disabled) {
    border-color: var(--color-primary);
  }
}

.dev-tools-panel__hint,
.dev-tools-panel__section-title {
  margin: 0;
  font-size: 0.8125rem;
}

.dev-tools-panel__hint {
  color: var(--color-text-muted, #6c757d);
}

.dev-tools-panel__section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dev-tools-panel__section-title {
  font-weight: 600;
}

.dev-tools-panel__chips,
.dev-tools-panel__users {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dev-tools-panel__users {
  flex-direction: column;
  flex-wrap: nowrap;
  max-height: 9rem;
  overflow: auto;
}

.dev-tools-panel__chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  line-height: 1.2;
  white-space: nowrap;
}

.dev-tools-panel__user {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  padding: 0.4rem 0.6rem;
  border-radius: 0.5rem;
  text-align: left;
  line-height: 1.25;

  span {
    color: var(--color-text-muted, #6c757d);
    font-size: 0.75rem;
  }
}

.dev-tools-panel__chip.is-active,
.dev-tools-panel__user.is-active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
}

.dev-tools-panel__perms {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 14rem;
  overflow: auto;
}

.dev-tools-panel__module summary {
  cursor: pointer;
  font-weight: 600;
}

.dev-tools-panel__perm {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0.25rem 0 0.25rem 0.4rem;
  font-size: 0.8125rem;
}
</style>
