<template>
    <div class="main-content">
        <div class="main-content-header">
            <h6>Параметры</h6>
            <span class="params-description text-muted">Параметр — это переменная датасета или чарта, которая может заменять константные значения в вычисляемых полях. Параметр может быть числом, строкой, датой или логическим значением. Параметры датасета доступны во всех чартах, созданных на основе этого датасета. Значение по умолчанию для параметра может быть переопределено на уровне чарта.</span>
        </div>
        <div class="main-content-body">
            <BiGrid :rows="rows" :columns="columns" :striped="true" :hover="true" @duplicate="onDuplicate" @edit="onEdit" @copyId="onCopyId" @delete="onDelete"/>
        </div>
        <div class="main-content-footer">
            <button type="button" class="btn btn-add" data-bs-toggle="modal" data-bs-target="#paramsAddModal">Добавить</button>
        </div>
        <ParamsAddModal ref="addEditModalRef" modal-id="paramsAddModal" :existing-names="existingNames" @submit="handleAdd" @update="handleUpdate" />
    </div>
</template>

<script setup>
    import { ref, watch, computed, onMounted } from 'vue'
    import { useToast } from 'vue-toastification'
    import ParamsAddModal from './components/ParamsAddModal.vue'
    import BiGrid from '@/core/bi/components/bi_grid.vue'

    const props = defineProps({
        datasetId: { type: [String, Number], default: null }
    })

    const rows = ref([])
    const addEditModalRef = ref(null)
    const toast = useToast()

    const storageKey = computed(() => `bi:dataset:params:${props.datasetId ?? 'new'}`)

    function loadFromCache(){
        try{
            const raw = sessionStorage.getItem(storageKey.value)
            if(raw){
                const parsed = JSON.parse(raw)
                if(Array.isArray(parsed)){
                    // Нормализуем ключи из snake_case (как приходит из БД)
                    // к camelCase, которые использует грид
                    rows.value = parsed.map(p => ({
                        name: p.name ?? '',
                        type: p.type ?? '',
                        // поддерживаем несколько вариантов ключей
                        defaultValue: (p.defaultValue ?? p.default ?? p.default_value) ?? '',
                        sourceUsage: (p.sourceUsage ?? p.source_usage) ?? false,
                    }))
                }
            }
        }catch(err){
            console.warn('ParamsPage: failed to load from sessionStorage', err)
        }
    }

    const emit = defineEmits(['changed'])

    function saveToCache(){
        try{
            sessionStorage.setItem(storageKey.value, JSON.stringify(rows.value))
        }catch(err){
            console.warn('ParamsPage: failed to save to sessionStorage', err)
        }
        // Сообщаем родителю о том, что параметры изменились
        emit('changed')
    }

    onMounted(() => {
        try{
            window.addEventListener('beforeunload', () => {
                // При обновлении/закрытии страницы очищаем черновик параметров из sessionStorage
                // (данные из БД будут заново загружены и синхронизированы при открытии страницы)
                try{ sessionStorage.removeItem(storageKey.value) }catch(err){ console.warn('ParamsPage: failed to remove cache on unload', err) }
            })
        }catch(err){ console.warn('ParamsPage: failed to bind beforeunload', err) }
        loadFromCache()
    })

    watch(rows, () => {
        saveToCache()
    }, { deep: true })

    const columns = [
        { key: 'name', label: 'Имя параметра', width: '26%' },
        { key: 'type', label: 'Тип', width: '16%' },
        { key: 'defaultValue', label: 'Значение по умолчанию', width: '23%' },
        { key: 'sourceUsage', label: 'Использование в настройке источника', width: '35%' },
    ]

    const existingNames = computed(() => rows.value.map(r => r.name))

    function handleAdd(payload){
        const exists = rows.value.some(r => r.name === payload.name)
        if (exists) {
            toast.error('Имя параметра должно быть уникальным')
            return
        }
        rows.value.push({
            name: payload.name,
            type: payload.type,
            defaultValue: payload.default,
            sourceUsage: false,
        })
        toast.success('Параметр добавлен')
    }

    function handleUpdate(payload){
        const { index, name, type, default: def } = payload
        if (typeof index === 'number' && rows.value[index]) {
            const exists = rows.value.some((r, i) => i !== index && r.name === name)
            if (exists) {
                toast.error('Имя параметра должно быть уникальным')
                return
            }
            rows.value[index] = { ...rows.value[index], name, type, defaultValue: def }
            toast.success('Параметр обновлён')
        }
    }

    function onDuplicate({ row, index }){
        const suffix = '-copy'
        let base = row.name + suffix
        let candidate = base
        let counter = 1
        const names = new Set(rows.value.map(r => r.name))
        while (names.has(candidate)) {
            candidate = base + '-' + counter
            counter += 1
        }
        rows.value.splice(index + 1, 0, {
            name: candidate,
            type: row.type,
            defaultValue: row.defaultValue,
            sourceUsage: row.sourceUsage,
        })
        toast.info('Дубликат создан')
    }

    function onEdit({ row, index }){
        if (addEditModalRef.value && typeof addEditModalRef.value.open === 'function') {
            addEditModalRef.value.open({ row, index })
        }
    }

    async function onCopyId({ row }){
        try {
            await navigator.clipboard.writeText(String(row.name || ''))
            toast.success('ID скопирован в буфер обмена')
        } catch (err) {
            toast.error('Не удалось скопировать ID')
            console.warn('ParamsPage: clipboard write failed', err)
        }
    }

    function onDelete({ index }){
        if (typeof index === 'number') {
            rows.value.splice(index, 1)
            toast.success('Параметр удалён')
        }
    }
</script>

<style scoped lang="scss">
    .main-content{
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        padding: 1.25rem 5rem 0 5rem;
        height: 100%;
        gap: 15px;
    }

    .btn-add{
        background-color: var(--color-primary-background);
        color: var(--color-primary-text);
    }

    .btn-add:hover{
        background-color: var(--color-hover-background);
    }

    .params-description{
        display: block;
        margin-top: 0.25rem;
        font-size: clamp(0.75rem, 0.6rem + 0.7vw, 0.875rem);
        line-height: 1.5;
    }
</style>