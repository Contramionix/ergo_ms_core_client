// Автоматически импортируем все endpoints.js файлы из core и modules
const coreEndpointsModules = import.meta.glob('@/core/**/endpoints.js', { eager: true });
// Модули из папки modules/ ищутся по структуре modules/<module_name>/client/js/
// Путь от src/js/api/endpoints.js до modules/: ../../../../../modules/
const modulesEndpointsModules = import.meta.glob('../../../../../modules/*/client/js/endpoints.js', { eager: true });

// Объединяем все импортированные эндпоинты
const allEndpoints = {};

// Обрабатываем эндпоинты из core
Object.values(coreEndpointsModules).forEach(module => {
    // Каждый модуль экспортирует объект с эндпоинтами
    const exportedEndpoints = Object.values(module)[0];
    if (exportedEndpoints && typeof exportedEndpoints === 'object') {
        Object.assign(allEndpoints, exportedEndpoints);
    }
});

// Обрабатываем эндпоинты из modules
Object.values(modulesEndpointsModules).forEach(module => {
    // Каждый модуль экспортирует объект с эндпоинтами
    const exportedEndpoints = Object.values(module)[0];
    if (exportedEndpoints && typeof exportedEndpoints === 'object') {
        Object.assign(allEndpoints, exportedEndpoints);
    }
});

// Экспортируем объединенные эндпоинты
export const endpoints = allEndpoints;
