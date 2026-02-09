<template>
    <div class="connections">
        <div class="connections-header">
            <h1>Подключения</h1>
            <button type="button" class="btn btn-primary" style="height: 2.25rem; display: flex; align-items: center; justify-content: center;" @click="goToCreateConnection">
                Создать подключение
            </button>
        </div>
        <div class="connections-body">
            <GenericListPage :config="connectionsConfig" :hideCreateButton="true" />
        </div>
    </div>
</template>

<script setup>
    import GenericListPage from '@/core/bi/MainPage/Sidebar/GenericListPage.vue'
    import { getListConfig } from '@/core/bi/MainPage/Sidebar/components/js/listConfigs.js'
    import { useRouter } from 'vue-router'
    import { currentSidebarPage } from '@/core/bi/MainPage/Sidebar/components/js/useSidebarStore'
    import { onMounted, onBeforeUnmount } from 'vue'

    const connectionsConfig = getListConfig('connections')
    const router = useRouter()

    onMounted(() => {
        currentSidebarPage.value = 'connections'
    })

    onBeforeUnmount(() => {
        currentSidebarPage.value = ''
    })

    function goToCreateConnection() {
        if (connectionsConfig.createRoute) {
            router.push(connectionsConfig.createRoute)
        }
    }
</script>

<style scoped lang="scss">
    .connections {
        display: flex;
        flex-direction: column;
    }
    .connections-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .connections-body {
        display: flex;
        flex-direction: column;
    }
</style>
