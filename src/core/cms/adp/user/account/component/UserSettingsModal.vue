<script setup>
import { ref, computed, watch, onUnmounted, provide } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import {
  NOTIFICATION_NAV_KEY,
  createNotificationNavController,
} from '@/core/notifications/js/useNotificationSettingsNav.js'
import UserSettingsNav from './UserSettingsNav.vue'
import { TAB_SECTIONS } from './userSettingsTabs.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  initialTab: { type: String, default: 'profile' },
})

const emit = defineEmits(['close'])
const { t } = useAppI18n()

const panelWrapRef = ref(null)
const notificationNav = createNotificationNavController(panelWrapRef)
provide(NOTIFICATION_NAV_KEY, notificationNav)

const notificationSections = computed(() => notificationNav.sections.value)
const notificationActiveAnchorId = computed(() => notificationNav.activeAnchorId.value)

function tabById(tabId) {
  const sections = TAB_SECTIONS.value
  for (const section of sections) {
    const tab = section.items.find((item) => item.id === tabId)
    if (tab) return tab
  }
  return sections[0].items[0]
}

const activeTabId = ref(
  TAB_SECTIONS.value.some((s) => s.items.some((t) => t.id === props.initialTab))
    ? props.initialTab
    : TAB_SECTIONS.value[0].items[0].id,
)

const activePanel = computed(() => tabById(activeTabId.value).component)

watch(
  () => props.show,
  (isOpen) => {
    if (isOpen) {
      activeTabId.value = TAB_SECTIONS.value.some((s) => s.items.some((t) => t.id === props.initialTab))
        ? props.initialTab
        : TAB_SECTIONS.value[0].items[0].id
    } else {
      notificationNav.teardownObserver()
    }
  },
)

watch(activeTabId, (tabId) => {
  if (tabId !== 'notifications') {
    notificationNav.teardownObserver()
  }
})

onUnmounted(() => {
  notificationNav.teardownObserver()
})

function selectTab(id) {
  activeTabId.value = id
}

function handleNotificationNavigate(anchorId) {
  notificationNav.scrollToAnchor(anchorId)
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <ModalCenter
    standalone
    :visible="show"
    modal-id="userSettingsModal"
    :show-title="false"
    :modal-aria-label="t('settings.sections.user')"
    :show-footer="false"
    custom-class="user-settings-modal-root"
    dialog-class="modal-xl"
    body-class="p-0 user-settings-modal-body"
    @close="handleClose"
  >
    <div class="user-settings-modal__layout">
      <UserSettingsNav :sections="TAB_SECTIONS" :active-tab-id="activeTabId" :notification-sections="notificationSections" :notification-active-anchor-id="notificationActiveAnchorId" @select="selectTab" @notification-navigate="handleNotificationNavigate"/>
      <div ref="panelWrapRef" class="user-settings-modal__panel-wrap">
        <KeepAlive>
          <component :is="activePanel" :key="activeTabId" />
        </KeepAlive>
      </div>
    </div>
  </ModalCenter>
</template>

<style scoped lang="scss">
.user-settings-modal__layout {
  display: flex;
  align-items: stretch;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;

  @media (width < $ui-bp-md) {
    flex-direction: column;
  }
}

.user-settings-modal__panel-wrap {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
  scrollbar-width: thin;
  scrollbar-color: var(--color-hover-background) transparent;

  @media (width < $ui-bp-md) {
    padding: 1rem;
  }
}
</style>

<style lang="scss">
.user-settings-modal-body.modal-body {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1 1 auto;
  min-height: 0;
}

.user-settings-modal-root.modal .modal-dialog {
  height: min(82vh, 780px);
  max-height: 90vh;
  transition: none !important;

  @media (width < $ui-bp-md) {
    height: min(92dvh, 780px);
    max-height: 96dvh;
    margin: 0.5rem auto;
  }
}

.user-settings-modal-root.modal .modal-content {
  height: 100%;
  min-height: 0;
}

.user-settings-modal-root.modal {
  transition: none !important;
}
</style>
