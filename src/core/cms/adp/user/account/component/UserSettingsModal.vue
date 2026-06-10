<script setup>
import { ref, computed, watch, onUnmounted, provide } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
import UserSettingsNav from './UserSettingsNav.vue'
import { TAB_SECTIONS } from './userSettingsTabs.js'
import {
  NOTIFICATION_NAV_KEY,
  createNotificationNavController,
} from '@/core/notifications/js/useNotificationSettingsNav.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  initialTab: { type: String, default: 'profile' },
})

const emit = defineEmits(['close'])

const panelWrapRef = ref(null)
const notificationNav = createNotificationNavController(panelWrapRef)
provide(NOTIFICATION_NAV_KEY, notificationNav)

const notificationSections = computed(() => notificationNav.sections.value)
const notificationActiveAnchorId = computed(() => notificationNav.activeAnchorId.value)

function tabById(tabId) {
  for (const section of TAB_SECTIONS) {
    const tab = section.items.find((t) => t.id === tabId)
    if (tab) return tab
  }
  return TAB_SECTIONS[0].items[0]
}

const activeTabId = ref(
  TAB_SECTIONS.some((s) => s.items.some((t) => t.id === props.initialTab))
    ? props.initialTab
    : TAB_SECTIONS[0].items[0].id,
)

const activePanel = computed(() => tabById(activeTabId.value).component)

const disableBodyScroll = () => {
  document.body.style.overflow = 'hidden'
}

const enableBodyScroll = () => {
  document.body.style.overflow = ''
}

watch(
  () => props.show,
  (isOpen) => {
    if (isOpen) {
      disableBodyScroll()
      activeTabId.value = TAB_SECTIONS.some((s) => s.items.some((t) => t.id === props.initialTab))
        ? props.initialTab
        : TAB_SECTIONS[0].items[0].id
    } else {
      enableBodyScroll()
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
  enableBodyScroll()
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
  <Teleport to="body">
    <Transition name="usm-backdrop">
      <div v-if="show" class="user-settings-backdrop" @click="handleClose"></div>
    </Transition>
    <Transition name="usm-dialog" appear>
      <ModalCenter v-if="show" modal-id="userSettingsModal" :show-title="false" modal-aria-label="Настройки пользователя" :show-footer="false" custom-class="show d-block user-settings-modal-root" dialog-class="modal-xl" body-class="p-0 user-settings-modal-body" @closemodal="handleClose">
        <div class="user-settings-modal__layout">
          <UserSettingsNav :sections="TAB_SECTIONS" :active-tab-id="activeTabId" :notification-sections="notificationSections" :notification-active-anchor-id="notificationActiveAnchorId" @select="selectTab" @notification-navigate="handleNotificationNavigate"/>
          <div ref="panelWrapRef" class="user-settings-modal__panel-wrap">
            <component :is="activePanel" />
          </div>
        </div>
      </ModalCenter>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.user-settings-modal__layout {
  display: flex;
  align-items: stretch;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
}

.user-settings-modal__panel-wrap {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
  scrollbar-width: thin;
  scrollbar-color: var(--color-hover-background) transparent;
}
</style>

<style lang="scss">
.user-settings-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1050;
}

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
}

.user-settings-modal-root.modal .modal-content {
  height: 100%;
  min-height: 0;
}

.user-settings-modal-root.modal {
  z-index: 1055;
  transition: none !important;
}

.usm-backdrop-enter-active,
.usm-backdrop-leave-active {
  transition: opacity 0.22s ease;
}
.usm-backdrop-enter-from,
.usm-backdrop-leave-to {
  opacity: 0;
}

.usm-dialog-enter-active {
  transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.34, 1.2, 0.64, 1);
}
.usm-dialog-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}
.usm-dialog-enter-from,
.usm-dialog-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
