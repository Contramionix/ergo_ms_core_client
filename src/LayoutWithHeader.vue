<template>
    <div class="layout-page">
        <div class="layout-header">
            <HeaderBar />
        </div>
        <div class="layout-content">
            <slot />
        </div>
    </div>
</template>

<script setup>
import HeaderBar from '@/modules/crm/project-ed/components/HeaderBar.vue'
</script>

<style scoped lang="scss">
.layout-page {
    display: flex;
    flex-direction: column;
    height: 100%;
}
.layout-header {
    padding: 0 2rem;
}
.layout-content {
    flex: 1;
    display: block;
    padding: 0 2rem;
}
</style>


