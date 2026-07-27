<script setup>
import { inject, ref, watch } from 'vue'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'
import {
  NOTIFICATION_NAV_KEY,
  anchorIdCategory,
  anchorIdGlobal,
  anchorIdModule,
} from '@/core/notifications/js/useNotificationSettingsNav.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()

const NOTIFICATIONS_TAB_ID = 'notifications'

const props = defineProps({
  sections: { type: Array, required: true },
  activeTabId: { type: String, required: true },
  notificationSections: { type: Array, default: () => [] },
  notificationActiveAnchorId: { type: String, default: '' },
})

const emit = defineEmits(['select', 'notification-navigate'])

const notificationNav = inject(NOTIFICATION_NAV_KEY, null)
const isNotificationsExpanded = ref(false)

function isNotificationsTab(tabId) {
  return tabId === NOTIFICATIONS_TAB_ID
}

function isModuleExpanded(module) {
  return notificationNav?.isModuleExpanded(module) ?? false
}

function toggleNotificationsExpand() {
  isNotificationsExpanded.value = !isNotificationsExpanded.value
}

function toggleModuleExpand(module) {
  notificationNav?.toggleModuleExpanded(module)
}

function handleTabClick(tab) {
  if (isNotificationsTab(tab.id)) {
    // Сворачивать вложенный список только если вкладка уже активна.
    // При переходе с другой вкладки всегда раскрываем — иначе клик «схлопывает» меню.
    if (props.activeTabId === NOTIFICATIONS_TAB_ID) {
      toggleNotificationsExpand()
    } else {
      isNotificationsExpanded.value = true
      emit('select', tab.id)
    }
    return
  }
  emit('select', tab.id)
}

function handleGlobalNavClick() {
  isNotificationsExpanded.value = true
  emit('select', NOTIFICATIONS_TAB_ID)
  emit('notification-navigate', anchorIdGlobal())
}

function handleCategoryNavClick(module, category) {
  isNotificationsExpanded.value = true
  emit('select', NOTIFICATIONS_TAB_ID)
  emit('notification-navigate', anchorIdCategory(module, category))
}

function handleModuleHeaderClick(module) {
  isNotificationsExpanded.value = true
  emit('select', NOTIFICATIONS_TAB_ID)
  const wasExpanded = isModuleExpanded(module)
  toggleModuleExpand(module)
  // При раскрытии модуля сразу ведём к его секции — без прыжка подсветки.
  if (!wasExpanded) {
    emit('notification-navigate', anchorIdModule(module))
  }
}

function syncExpandFromAnchor(anchorId) {
  if (!anchorId) return
  if (props.activeTabId === NOTIFICATIONS_TAB_ID) {
    isNotificationsExpanded.value = true
  }
  if (anchorId === anchorIdGlobal()) return
  for (const section of props.notificationSections) {
    const moduleAnchor = `notif-module-${section.module}`
    if (anchorId === moduleAnchor || anchorId.startsWith(`notif-${section.module}-`)) {
      notificationNav?.expandModule(section.module)
    }
  }
}

watch(
  () => props.activeTabId,
  (tabId) => {
    if (tabId === NOTIFICATIONS_TAB_ID) {
      isNotificationsExpanded.value = true
    }
  },
  { immediate: true },
)

watch(
  () => props.notificationActiveAnchorId,
  (anchorId) => syncExpandFromAnchor(anchorId),
  { immediate: true },
)
</script>

<template>
  <nav class="user-settings-modal__nav" :aria-label="t('settings.sections.user')">
    <div
      v-for="(section, sectionIndex) in sections"
      :key="section.title ?? sectionIndex"
      class="user-settings-modal__nav-section"
    >
      <h3 class="user-settings-modal__nav-section-title">{{ section.title }}</h3>
      <ul class="user-settings-modal__nav-list list-unstyled mb-0">
        <li v-for="tab in section.items" :key="tab.id" class="user-settings-modal__nav-item-wrap">
          <button
            type="button"
            class="user-settings-modal__nav-item"
            :class="{
              'user-settings-modal__nav-item--active': activeTabId === tab.id,
              'user-settings-modal__nav-item--expandable': isNotificationsTab(tab.id),
            }"
            @click="handleTabClick(tab)"
          >
            <span class="user-settings-modal__nav-icon" aria-hidden="true">
              <component :is="tab.icon" :size="18" />
            </span>
            <span class="user-settings-modal__nav-label">{{ tab.label }}</span>
            <ChevronDown
              v-if="isNotificationsTab(tab.id)"
              :size="16"
              class="user-settings-modal__nav-chevron"
              :class="{ 'user-settings-modal__nav-chevron--rotated': isNotificationsExpanded && activeTabId === tab.id }"
            />
          </button>

          <Transition name="nav-sublist">
            <ul
              v-if="isNotificationsTab(tab.id) && isNotificationsExpanded && activeTabId === tab.id"
              class="user-settings-modal__nav-sublist list-unstyled mb-0"
            >
              <li>
                <button
                  type="button"
                  class="user-settings-modal__nav-sublink"
                  :class="{ 'user-settings-modal__nav-sublink--active': notificationActiveAnchorId === anchorIdGlobal() }"
                  @click="handleGlobalNavClick"
                >
                  {{ t('settings.notifications.channels') }}
                </button>
              </li>
              <li
                v-for="moduleSection in notificationSections"
                :key="moduleSection.module"
                class="user-settings-modal__nav-module-wrap"
              >
                <button
                  type="button"
                  class="user-settings-modal__nav-sublink user-settings-modal__nav-sublink--module"
                  :class="{ 'user-settings-modal__nav-sublink--expanded': isModuleExpanded(moduleSection.module) }"
                  :aria-expanded="isModuleExpanded(moduleSection.module)"
                  @click="handleModuleHeaderClick(moduleSection.module)"
                >
                  <span>{{ moduleSection.module_label }}</span>
                  <ChevronUp
                    v-if="isModuleExpanded(moduleSection.module)"
                    :size="14"
                    class="user-settings-modal__nav-chevron user-settings-modal__nav-chevron--sm"
                    aria-hidden="true"
                  />
                  <ChevronDown
                    v-else
                    :size="14"
                    class="user-settings-modal__nav-chevron user-settings-modal__nav-chevron--sm"
                    aria-hidden="true"
                  />
                </button>
                <Transition name="nav-sublist">
                  <ul
                    v-if="isModuleExpanded(moduleSection.module)"
                    class="user-settings-modal__nav-sublist user-settings-modal__nav-sublist--nested list-unstyled mb-0"
                  >
                    <li v-for="category in moduleSection.categories" :key="category.category">
                      <button
                        type="button"
                        class="user-settings-modal__nav-sublink user-settings-modal__nav-sublink--nested"
                        :class="{
                          'user-settings-modal__nav-sublink--active':
                            notificationActiveAnchorId === anchorIdCategory(moduleSection.module, category.category),
                        }"
                        @click="handleCategoryNavClick(moduleSection.module, category.category)"
                      >
                        {{ category.category_label }}
                      </button>
                    </li>
                  </ul>
                </Transition>
              </li>
            </ul>
          </Transition>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style scoped lang="scss">
.user-settings-modal__nav {
  flex: 0 0 260px;
  max-width: 280px;
  border-right: 1px solid var(--color-secondary-background);
  background-color: var(--color-secondary-background);
  padding: 0.75rem 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--color-hover-background) transparent;

  @media (width < $ui-bp-md) {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.25rem;
    flex: 0 0 auto;
    max-width: none;
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--color-secondary-background);
    padding: 0.5rem;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }
}

.user-settings-modal__nav-section {
  &:not(:first-child) {
    margin-top: 1rem;
    padding-top: 1rem;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0.5rem;
      right: 0.5rem;
      height: 1px;
      background-color: var(--color-hover-background);
    }
  }

  @media (width < $ui-bp-md) {
    display: contents;

    &:not(:first-child) {
      margin-top: 0;
      padding-top: 0;

      &::before {
        display: none;
      }
    }
  }
}

.user-settings-modal__nav-section-title {
  margin: 0 0 0.375rem;
  padding: 0 0.75rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-secondary-text, rgba(128, 128, 128, 0.95));

  @media (width < $ui-bp-md) {
    display: none;
  }
}

.user-settings-modal__nav-list {
  padding: 0 0.5rem;

  @media (width < $ui-bp-md) {
    display: contents;
  }
}

.user-settings-modal__nav-item-wrap {
  margin-bottom: 0.125rem;

  @media (width < $ui-bp-md) {
    margin-bottom: 0;
    flex: 0 0 auto;
  }
}

.user-settings-modal__nav-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  text-align: left;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: $radius-usual;
  background: transparent;
  color: var(--color-primary-text);
  font-size: 0.9375rem;
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: var(--color-hover-background);
  }

  &--active {
    background-color: var(--color-hover-background);
    font-weight: 600;
  }

  &--expandable {
    justify-content: space-between;
  }

  @media (width < $ui-bp-md) {
    width: auto;
    white-space: nowrap;
    min-height: 40px;
    padding: 0.5rem 0.875rem;

    .user-settings-modal__nav-chevron {
      display: none;
    }
  }
}

.user-settings-modal__nav-label {
  flex: 1;
  min-width: 0;
}

.user-settings-modal__nav-icon {
  display: inline-flex;
  flex-shrink: 0;
  opacity: 0.9;
}

.user-settings-modal__nav-chevron {
  flex-shrink: 0;
  color: var(--color-secondary-text);
  transition: transform 0.2s ease;

  &--sm {
    margin-left: auto;
  }

  &--rotated {
    transform: rotate(180deg);
  }
}

.user-settings-modal__nav-sublist {
  margin: 0.125rem 0 0.25rem 0.75rem;
  padding-left: 0.5rem;
  border-left: 1px solid var(--color-hover-background);
  overflow: hidden;

  &--nested {
    margin-left: 0.5rem;
    margin-top: 0.125rem;
  }

  @media (width < $ui-bp-md) {
    display: none;
  }
}

.user-settings-modal__nav-sublink {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  text-align: left;
  padding: 0.375rem 0.625rem;
  margin-bottom: 0.0625rem;
  border: none;
  border-radius: $radius-usual;
  background: transparent;
  color: var(--color-secondary-text);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover {
    background-color: var(--color-hover-background);
    color: var(--color-primary-text);
  }

  &--active {
    background-color: var(--color-hover-background);
    color: var(--color-primary-text);
    font-weight: 600;
  }

  &--module {
    font-weight: 500;
    color: var(--color-primary-text);
  }

  &--nested {
    font-size: 0.75rem;
    padding-left: 0.75rem;
  }
}

.nav-sublist-enter-active,
.nav-sublist-leave-active {
  transition: opacity 0.15s ease, max-height 0.2s ease;
  max-height: 480px;
}

.nav-sublist-enter-from,
.nav-sublist-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
