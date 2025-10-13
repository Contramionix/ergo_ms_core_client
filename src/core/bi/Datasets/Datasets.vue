<template>
    <div class="datasets">
        <div class="datasets-header">
            <h1>Датасеты</h1>
            <button type="button" class="btn btn-primary" style="height: 2.25rem; display: flex; align-items: center; justify-content: center;" @click="goToCreateDataset">
                Создать датасет
            </button>
        </div>
        <div class="datasets-body">
            <GenericListPage :config="datasetsConfig" :hideCreateButton="true" />
        </div>
    </div>
</template>

<script setup>
    import GenericListPage from '@/core/bi/MainPage/Sidebar/GenericListPage.vue'
    import { getListConfig } from '@/core/bi/MainPage/Sidebar/components/js/listConfigs.js'
    import { useRouter } from 'vue-router'
    import { currentSidebarPage } from '@/core/bi/MainPage/Sidebar/components/js/useSidebarStore'
    import { onMounted, onBeforeUnmount } from 'vue'

    const datasetsConfig = getListConfig('datasets')
    const router = useRouter()

    onMounted(() => {
        currentSidebarPage.value = 'datasets'
    })

    onBeforeUnmount(() => {
        currentSidebarPage.value = ''
    })

    function goToCreateDataset() {
        if (datasetsConfig.createRoute) {
            router.push(datasetsConfig.createRoute)
        } else {
            console.error('createRoute не определен в конфигурации датасетов')
        }
    }
</script>

<style scoped lang="scss">
    .datasets {
        display: flex;
        flex-direction: column;
    }
    .datasets-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .datasets-body {
        display: flex;
        flex-direction: column;
    }
</style>