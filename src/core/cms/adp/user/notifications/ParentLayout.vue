<script setup>
import { defineAsyncComponent } from 'vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'

const UserNotifications = defineAsyncComponent({
  loader: () => import('@/core/cms/adp/user/notifications/UserNotifications.vue'),
  loadingComponent: SpinnerLoading,
  delay: 80,
})
</script>

<template>
  <div class="container-fluid p-0">
    <div class="row no-gutters">
      <div class="col-12">
        <UserNotifications class="full-page-card" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.full-page-card {
  width: 100%;
}
</style>
