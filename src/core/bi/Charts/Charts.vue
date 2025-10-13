<template>
    <div class="charts">
        <div class="charts-header">
            <h1>Чарты</h1>
            <button type="button" class="btn btn-primary" style="height: 2.25rem; display: flex; align-items: center; justify-content: center;" @click="goToCreateChart">
                Создать чарт
            </button>
        </div>
        <div class="charts-body">
            <GenericListPage :config="chartsConfig" :hideCreateButton="true" />
        </div>
    </div>
</template>

<script setup>
    import GenericListPage from '@/core/bi/MainPage/Sidebar/GenericListPage.vue'
    import { getListConfig } from '@/core/bi/MainPage/Sidebar/components/js/listConfigs.js'
    import { useRouter } from 'vue-router'
    import { currentSidebarPage } from '@/core/bi/MainPage/Sidebar/components/js/useSidebarStore'
    import { onMounted, onBeforeUnmount } from 'vue'

    const chartsConfig = getListConfig('charts')
    const router = useRouter()

    onMounted(() => {
        currentSidebarPage.value = 'charts'
    })

    onBeforeUnmount(() => {
        currentSidebarPage.value = ''
    })

    function goToCreateChart() {
        if (chartsConfig.createRoute) {
            router.push(chartsConfig.createRoute)
        } else {
            console.error('createRoute не определен в конфигурации чартов')
        }
    }
</script>

<style scoped lang="scss">
    .charts {
        display: flex;
        flex-direction: column;
    }
    .charts-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .charts-body {
        display: flex;
        flex-direction: column;
    }
</style>
