<script setup>
import { computed, inject, nextTick, ref, watch } from 'vue'
import { ChevronDown, ChevronUp } from '@lucide/vue'
import LucideIcon from '@/components/LucideIcon.vue'
import SearchInput from '@/components/SearchInput.vue'
import {
  NOTIFICATION_NAV_KEY,
  anchorIdBrowser,
  anchorIdCategory,
  anchorIdGlobal,
  anchorIdModule,
  anchorIdModules,
  anchorIdRetention,
} from '@/core/notifications/js/useNotificationSettingsNav.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { matchSearchQuery } from '@/js/utils/searchQuery.js'

const { t } = useAppI18n()

const NOTIFICATIONS_TAB_ID = 'notifications'

const props = defineProps({
  sections: { type: Array, required: true },
  activeTabId: { type: String, required: true },
  notificationSections: { type: Array, default: () => [] },
  notificationActiveAnchorId: { type: String, default: '' },
  resetKey: { type: [Boolean, Number, String], default: null },
})

const emit = defineEmits(['select', 'notification-navigate'])

const notificationNav = inject(NOTIFICATION_NAV_KEY, null)
const isNotificationsExpanded = ref(false)
const searchQuery = ref('')
const navBodyRef = ref(null)

const hasSearchQuery = computed(() => Boolean(searchQuery.value.trim()))

function matchesQuery(text) {
  return matchSearchQuery(text, searchQuery.value)
}

function filterNotificationCategories(moduleSection) {
  if (!hasSearchQuery.value) return moduleSection.categories || []
  return (moduleSection.categories || []).filter(
    (category) =>
      matchesQuery(category.category_label) || matchesQuery(moduleSection.module_label),
  )
}

function notificationSectionMatches(moduleSection) {
  if (matchesQuery(moduleSection.module_label)) return true
  return (moduleSection.categories || []).some((category) => matchesQuery(category.category_label))
}

function notificationsTabLabel() {
  for (const section of props.sections) {
    const tab = section.items.find((item) => isNotificationsTab(item.id))
    if (tab) return tab.label
  }
  return t('settings.tabs.notifications')
}

function notificationsTabLabelMatches() {
  return matchesQuery(notificationsTabLabel())
}

function notificationsMatchQuery() {
  if (notificationsTabLabelMatches()) return true
  if (matchesQuery(t('settings.browserNotifications.caption'))) return true
  if (matchesQuery(t('settings.notifications.inboxRetention'))) return true
  if (matchesQuery(t('settings.notifications.channels'))) return true
  if (matchesQuery(t('settings.notifications.moduleNotifications'))) return true
  return props.notificationSections.some((section) => notificationSectionMatches(section))
}

const filteredNotificationSections = computed(() => {
  if (!hasSearchQuery.value || notificationsTabLabelMatches()) {
    return props.notificationSections
  }
  return props.notificationSections
    .filter((section) => notificationSectionMatches(section))
    .map((section) => ({
      ...section,
      categories: filterNotificationCategories(section),
    }))
})

const coreNavLinks = computed(() => [
  {
    id: 'browser',
    label: t('settings.browserNotifications.caption'),
    anchorId: anchorIdBrowser(),
  },
  {
    id: 'retention',
    label: t('settings.notifications.inboxRetention'),
    anchorId: anchorIdRetention(),
  },
  {
    id: 'channels',
    label: t('settings.notifications.channels'),
    anchorId: anchorIdGlobal(),
  },
])

const visibleCoreNavLinks = computed(() => {
  if (!hasSearchQuery.value || notificationsTabLabelMatches()) {
    return coreNavLinks.value
  }
  return coreNavLinks.value.filter((link) => matchesQuery(link.label))
})

const showModulesNavGroup = computed(() => {
  if (!props.notificationSections.length && !filteredNotificationSections.value.length) {
    return false
  }
  if (!hasSearchQuery.value || notificationsTabLabelMatches()) return true
  if (matchesQuery(t('settings.notifications.moduleNotifications'))) return true
  return filteredNotificationSections.value.length > 0
})

const isModulesGroupExpanded = computed(() => {
  if (hasSearchQuery.value) return true
  return notificationNav?.modulesGroupExpanded?.value ?? true
})

const filteredSections = computed(() => {
  if (!hasSearchQuery.value) return props.sections
  return props.sections
    .map((section) => ({
      ...section,
      items: section.items.filter((tab) => {
        if (matchesQuery(tab.label)) return true
        if (isNotificationsTab(tab.id)) return notificationsMatchQuery()
        return false
      }),
    }))
    .filter((section) => section.items.length > 0)
})

const hasNoResults = computed(
  () => hasSearchQuery.value && filteredSections.value.length === 0,
)

function isNotificationsTab(tabId) {
  return tabId === NOTIFICATIONS_TAB_ID
}

function isModuleExpanded(module) {
  if (hasSearchQuery.value) return true
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
    if (props.activeTabId === NOTIFICATIONS_TAB_ID && !hasSearchQuery.value) {
      toggleNotificationsExpand()
    } else {
      isNotificationsExpanded.value = true
      emit('select', tab.id)
    }
    return
  }
  emit('select', tab.id)
}

function handleCoreNavClick(anchorId) {
  isNotificationsExpanded.value = true
  emit('select', NOTIFICATIONS_TAB_ID)
  emit('notification-navigate', anchorId)
}

function handleModulesGroupClick() {
  isNotificationsExpanded.value = true
  emit('select', NOTIFICATIONS_TAB_ID)
  if (hasSearchQuery.value) {
    emit('notification-navigate', anchorIdModules())
    return
  }
  const wasExpanded = isModulesGroupExpanded.value
  notificationNav?.toggleModulesGroupExpanded()
  if (!wasExpanded) {
    emit('notification-navigate', anchorIdModules())
  }
}

function handleCategoryNavClick(module, category) {
  isNotificationsExpanded.value = true
  emit('select', NOTIFICATIONS_TAB_ID)
  emit('notification-navigate', anchorIdCategory(module, category))
}

function handleModuleHeaderClick(module) {
  isNotificationsExpanded.value = true
  emit('select', NOTIFICATIONS_TAB_ID)
  if (hasSearchQuery.value) {
    emit('notification-navigate', anchorIdModule(module))
    return
  }
  const wasExpanded = isModuleExpanded(module)
  toggleModuleExpand(module)
  // При раскрытии модуля сразу ведём к его секции — без прыжка подсветки.
  if (!wasExpanded) {
    emit('notification-navigate', anchorIdModule(module))
  }
}

async function syncExpandFromAnchor(anchorId) {
  if (!anchorId) return
  if (props.activeTabId === NOTIFICATIONS_TAB_ID) {
    isNotificationsExpanded.value = true
  }
  if (
    anchorId === anchorIdBrowser()
    || anchorId === anchorIdRetention()
    || anchorId === anchorIdGlobal()
  ) {
    return
  }
  if (anchorId === anchorIdModules()) {
    await notificationNav?.expandModulesGroup()
    return
  }
  for (const section of props.notificationSections) {
    const moduleAnchor = `notif-module-${section.module}`
    if (anchorId === moduleAnchor || anchorId.startsWith(`notif-${section.module}-`)) {
      await notificationNav?.expandModule(section.module)
    }
  }
}

function showNotificationsSublist(tabId) {
  if (!isNotificationsTab(tabId)) return false
  if (props.activeTabId !== tabId) return false
  return isNotificationsExpanded.value || hasSearchQuery.value
}

watch(
  () => props.resetKey,
  () => {
    searchQuery.value = ''
  },
)

watch(
  () => props.activeTabId,
  (tabId) => {
    if (tabId === NOTIFICATIONS_TAB_ID) {
      isNotificationsExpanded.value = true
    }
  },
  { immediate: true },
)

async function scrollActiveNavLinkIntoView(anchorId) {
  if (!anchorId || props.activeTabId !== NOTIFICATIONS_TAB_ID) return
  await nextTick()
  const root = navBodyRef.value
  if (!root) return
  const el = root.querySelector(`[data-notif-anchor="${CSS.escape(anchorId)}"]`)
  el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

watch(
  () => props.notificationActiveAnchorId,
  async (anchorId) => {
    await syncExpandFromAnchor(anchorId)
    await scrollActiveNavLinkIntoView(anchorId)
  },
  { immediate: true },
)

watch(hasSearchQuery, (searching) => {
  if (searching) {
    isNotificationsExpanded.value = true
    notificationNav?.expandModulesGroup()
    for (const section of filteredNotificationSections.value) {
      notificationNav?.expandModule(section.module)
    }
  }
})
</script>

<template>
  <nav class="user-settings-modal__nav" :aria-label="t('settings.sections.user')">
    <div class="user-settings-modal__nav-search">
      <SearchInput v-model="searchQuery" :placeholder="t('settings.nav.searchPlaceholder')" layout="grow" :show-icon="true" background="primary" focus-border="primary"/>
    </div>

    <div ref="navBodyRef" class="user-settings-modal__nav-body">
      <p v-if="hasNoResults" class="user-settings-modal__nav-empty">
        {{ t('settings.nav.noResults') }}
      </p>

      <div v-for="(section, sectionIndex) in filteredSections" :key="section.title ?? sectionIndex" class="user-settings-modal__nav-section">
        <h3 class="user-settings-modal__nav-section-title">{{ section.title }}</h3>
        <ul class="user-settings-modal__nav-list list-unstyled mb-0">
          <li v-for="tab in section.items" :key="tab.id" class="user-settings-modal__nav-item-wrap">
            <button type="button" class="user-settings-modal__nav-item" :class="{ 'user-settings-modal__nav-item--active': activeTabId === tab.id, 'user-settings-modal__nav-item--expandable': isNotificationsTab(tab.id), }" @click="handleTabClick(tab)">
              <span class="user-settings-modal__nav-icon" aria-hidden="true">
                <LucideIcon :name="tab.icon" :size="18" />
              </span>
              <span class="user-settings-modal__nav-label">{{ tab.label }}</span>
              <ChevronDown v-if="isNotificationsTab(tab.id)" :size="16" class="user-settings-modal__nav-chevron" :class="{ 'user-settings-modal__nav-chevron--rotated': showNotificationsSublist(tab.id), }"/>
            </button>

            <Transition name="nav-sublist">
              <ul v-if="showNotificationsSublist(tab.id)" class="user-settings-modal__nav-sublist list-unstyled mb-0">
                <li v-for="link in visibleCoreNavLinks" :key="link.id">
                  <button type="button" class="user-settings-modal__nav-sublink" :data-notif-anchor="link.anchorId" :class="{ 'user-settings-modal__nav-sublink--active': notificationActiveAnchorId === link.anchorId, }" @click="handleCoreNavClick(link.anchorId)">
                    {{ link.label }}
                  </button>
                </li>
                <li v-if="showModulesNavGroup" class="user-settings-modal__nav-module-wrap">
                  <button type="button" class="user-settings-modal__nav-sublink" :data-notif-anchor="anchorIdModules()" :class="{ 'user-settings-modal__nav-sublink--active': notificationActiveAnchorId === anchorIdModules(), 'user-settings-modal__nav-sublink--expanded': isModulesGroupExpanded, }" :aria-expanded="isModulesGroupExpanded" @click="handleModulesGroupClick">
                    <span>{{ t('settings.notifications.moduleNotifications') }}</span>
                    <ChevronUp v-if="isModulesGroupExpanded" :size="14" class="user-settings-modal__nav-chevron user-settings-modal__nav-chevron--sm" aria-hidden="true"/>
                    <ChevronDown v-else :size="14" class="user-settings-modal__nav-chevron user-settings-modal__nav-chevron--sm" aria-hidden="true"/>
                  </button>
                  <Transition name="nav-sublist">
                    <ul v-if="isModulesGroupExpanded" class="user-settings-modal__nav-sublist user-settings-modal__nav-sublist--nested list-unstyled mb-0">
                      <li v-for="moduleSection in filteredNotificationSections" :key="moduleSection.module" class="user-settings-modal__nav-module-wrap">
                        <button type="button" class="user-settings-modal__nav-sublink user-settings-modal__nav-sublink--module" :data-notif-anchor="anchorIdModule(moduleSection.module)" :class="{ 'user-settings-modal__nav-sublink--expanded': isModuleExpanded(moduleSection.module), 'user-settings-modal__nav-sublink--active': notificationActiveAnchorId === anchorIdModule(moduleSection.module), }" :aria-expanded="isModuleExpanded(moduleSection.module)" @click="handleModuleHeaderClick(moduleSection.module)">
                          <span>{{ moduleSection.module_label }}</span>
                          <ChevronUp v-if="isModuleExpanded(moduleSection.module)" :size="14" class="user-settings-modal__nav-chevron user-settings-modal__nav-chevron--sm" aria-hidden="true"/>
                          <ChevronDown v-else :size="14" class="user-settings-modal__nav-chevron user-settings-modal__nav-chevron--sm" aria-hidden="true"/>
                        </button>
                        <Transition name="nav-sublist">
                          <ul v-if="isModuleExpanded(moduleSection.module)" class="user-settings-modal__nav-sublist user-settings-modal__nav-sublist--nested list-unstyled mb-0">
                            <li v-for="category in moduleSection.categories" :key="category.category">
                              <button type="button" class="user-settings-modal__nav-sublink user-settings-modal__nav-sublink--nested" :data-notif-anchor="anchorIdCategory(moduleSection.module, category.category)" :class="{ 'user-settings-modal__nav-sublink--active': notificationActiveAnchorId === anchorIdCategory(moduleSection.module, category.category), }" @click="handleCategoryNavClick(moduleSection.module, category.category)">
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
            </Transition>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped lang="scss">
.user-settings-modal__nav {
  display: flex;
  flex-direction: column;
  flex: 0 0 260px;
  max-width: 280px;
  border-right: 1px solid var(--color-secondary-background);
  background-color: var(--color-secondary-background);
  padding: 0.75rem 0 0.75rem;
  min-height: 0;
  overflow: hidden;

  @media (width < $ui-bp-md) {
    flex: 0 0 auto;
    max-width: none;
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--color-secondary-background);
    padding: 0.5rem;
    overflow: visible;
  }
}

.user-settings-modal__nav-search {
  flex: 0 0 auto;
  padding: 0 0.5rem 0.625rem;

  :deep(.search-input) {
    --search-input-height: 34px;
    --search-input-font-size: 0.8125rem;
    --search-input-icon-size: 14px;
    --search-input-padding-start: 2rem;
    min-width: 0;
  }

  :deep(.search-input__icon) {
    left: 0.625rem;
  }

  @media (width < $ui-bp-md) {
    padding: 0 0 0.5rem;
  }
}

.user-settings-modal__nav-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--color-hover-background) transparent;

  @media (width < $ui-bp-md) {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.25rem;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }
}

.user-settings-modal__nav-empty {
  margin: 0;
  padding: 0.75rem;
  font-size: 0.8125rem;
  color: var(--color-secondary-text);

  @media (width < $ui-bp-md) {
    white-space: nowrap;
    padding: 0.5rem 0.75rem;
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
