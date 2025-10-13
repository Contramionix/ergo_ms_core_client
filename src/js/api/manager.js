import axios from 'axios'
import Cookies from 'js-cookie'
import tokenService from '@/core/cms/js/tokenService'

// Класс для работы с API
class ApiClient {
    // Конструктор класса
    constructor() {
        this.baseUrl = `http://${import.meta.env.VITE_API_HOST || 'localhost'}:${import.meta.env.VITE_API_PORT || '8000'}/`;
        this.apiPath = 'api/';
        this.client = axios.create({
            baseURL: `${this.baseUrl}${this.apiPath}`,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Интерцептор запросов: тихий refresh перед отправкой, если срок на исходе
        this.client.interceptors.request.use(async (config) => {
            if (tokenService.shouldRefresh()) {
                try { await tokenService.tryRefresh() } catch (_) { /* игнор, дадим серверу ответить 401 */ }
            }
            return config
        })

        // Интерцептор ответов: одноразовый silent refresh при 401 и повтор
        this.client.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config
                if (error.response?.status === 401 && !originalRequest?._retry) {
                    originalRequest._retry = true
                    try {
                        await tokenService.tryRefresh()
                        // проставим новый Authorization и повторим запрос
                        this._addAuthToken(originalRequest)
                        return this.client(originalRequest)
                    } catch (e) {
                        // падение refresh — выполняем logout и редирект
                        this.logout()
                        if (typeof window !== 'undefined' && window.location) {
                            if (!window.location.pathname.includes('/start') && !window.location.pathname.includes('/login')) {
                                window.location.href = '/start'
                            }
                        }
                    }
                }
                return Promise.reject(error)
            }
        )
    }

    // Основные методы запросов
    // Метод для GET-запросов
    async get(endpoint, params = {}, needToken = true) {
        try {
            const config = { params };
            if (needToken) {
                this._addAuthToken(config);
            }
            const response = await this.client.get(endpoint, config);
            return this.handleResponse(response);
        } catch (error) {
            const errorInfo = this.handleError(error);
            // Пробрасываем ошибку дальше для обработки в composables
            throw error;
        }
    }

    // Метод для POST-запросов
    async post(endpoint, data = {}, needToken = true) {
        try {
            const config = {};
            if (needToken) {
                this._addAuthToken(config);
            }

            // Если отправляем FormData, не устанавливаем Content-Type,
            // чтобы axios автоматически установил правильный multipart/form-data с boundary
            if (data instanceof FormData) {
                config.headers = {
                    ...config.headers,
                    'Content-Type': undefined // Позволяет axios автоматически установить правильный заголовок
                };
            }

            const response = await this.client.post(endpoint, data, config);
            return this.handleResponse(response);
        } catch (error) {
            const errorInfo = this.handleError(error);
            // Пробрасываем ошибку дальше для обработки в composables
            throw error;
        }
    }

    // Метод для PUT-запросов
    async put(endpoint, data = {}, needToken = true) {
        try {
            const config = {};
            if (needToken) {
                this._addAuthToken(config);
            }

            // Если отправляем FormData, не устанавливаем Content-Type,
            // чтобы axios автоматически установил правильный multipart/form-data с boundary
            if (data instanceof FormData) {
                config.headers = {
                    ...config.headers,
                    'Content-Type': undefined // Позволяет axios автоматически установить правильный заголовок
                };
            }

            const response = await this.client.put(endpoint, data, config);
            return this.handleResponse(response);
        } catch (error) {
            const errorInfo = this.handleError(error);
            // Пробрасываем ошибку дальше для обработки в composables
            throw error;
        }
    }

    async patch(endpoint, data = {}, needToken = true) {
        try {
            const cfg = {}
            if (needToken) this._addAuthToken(cfg)
            if (data instanceof FormData) {
                cfg.headers = { ...cfg.headers, 'Content-Type': undefined }
            }
            const r = await this.client.patch(endpoint, data, cfg)
            return this.handleResponse(r)
        } catch (e) {
            const errorInfo = this.handleError(e)
            // Пробрасываем ошибку дальше для обработки в composables
            throw e
        }
    }

    // Метод для DELETE-запросов
    async delete(endpoint, params = {}, needToken = true) {
        try {
            const config = { params };
            if (needToken) {
                this._addAuthToken(config);
            }
            const response = await this.client.delete(endpoint, config);
            return this.handleResponse(response);
        } catch (error) {
            const errorInfo = this.handleError(error);
            // Пробрасываем ошибку дальше для обработки в composables
            throw error;
        }
    }

    async upload(endpoint, formData, needToken = true, onUploadProgress) {
        try {
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            };
            if (needToken) {
                this._addAuthToken(config);
            }
            if (typeof onUploadProgress === 'function') {
                config.onUploadProgress = onUploadProgress;
            }
            const response = await this.client.post(endpoint, formData, config);
            return this.handleResponse(response);
        } catch (error) {
            return this.handleError(error);
        }
    }

    async getUploadedFiles(endpoint, needToken = true) {
        try {
            const config = {};
            if (needToken) {
                this._addAuthToken(config);
            }
            const response = await this.client.get(endpoint, config);
            return this.handleResponse(response);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // Метод для скачивания файлов (бинарные данные)
    async downloadFile(endpoint, params = {}, method = 'GET', needToken = true) {
        try {
            console.log('Скачивание файла:', endpoint, params, 'Method:', method);
            const config = { 
                responseType: 'blob' // Важно для бинарных данных
            };
            if (needToken) {
                this._addAuthToken(config);
            }
            
            let response;
            if (method.toUpperCase() === 'POST') {
                // Для POST запросов передаем параметры в теле запроса
                response = await this.client.post(endpoint, params, config);
            } else {
                // Для GET запросов передаем параметры как query parameters
                config.params = params;
                response = await this.client.get(endpoint, config);
            }
            
            console.log('Конфигурация запроса:', config);
            console.log('Ответ сервера:', response);
            console.log('Тип данных:', typeof response.data, 'Is Blob:', response.data instanceof Blob);
            console.log('Размер данных:', response.data?.size);
            
            // Проверяем, что получили blob
            if (response.data instanceof Blob) {
                return {
                    success: true,
                    data: response.data, // Это blob объект
                    message: 'Файл успешно загружен',
                    status: response.status,
                    headers: response.headers
                };
            } else {
                console.error('Получен не blob объект:', response.data);
                return {
                    success: false,
                    message: 'Получен некорректный формат файла',
                    data: null
                };
            }
        } catch (error) {
            console.error('Ошибка при скачивании файла:', error);
            console.error('Детали ошибки:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });
            
            // Возвращаем объект с ошибкой вместо throw
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Ошибка при скачивании файла',
                data: null,
                status: error.response?.status
            };
        }
    }

    // Вспомогательный метод для добавления токена авторизации в конфигурацию
    _addAuthToken(config) {
        const token = tokenService.getAccess();
        if (token) {
            if (!config.headers) {
                config.headers = {};
            }
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            console.warn('Токен не найден в cookies');
        }
        return config;
    }

    logout() {
        Cookies.remove('token');
        Cookies.remove('refresh');
        Cookies.remove('userId');
    }

    // Проверяем, есть ли токен и не истек ли он
    isTokenValid() {
        const token = Cookies.get('token');
        if (!token) {
            console.log('Токен отсутствует');
            return false;
        }
        
        // Простая проверка - если токен есть, считаем его валидным
        // В реальном приложении можно добавить проверку JWT payload
        console.log('Токен найден, длина:', token.length);
        return true;
    }

    // Получаем текущий токен
    getCurrentToken() {
        return Cookies.get('token');
    }
    // Обработчики ответов
    handleResponse(response) {
        // Успешные статусы: 200 OK, 201 Created, 204 No Content и т.д.
        if (response.status >= 200 && response.status < 300) {
            const data = response.data || {};

            // Для DELETE-запросов с кодом 204 (No Content) считаем успешным
            if (response.status === 204) {
                return {
                    success: true,
                    data: null,
                    message: 'Успешно удалено',
                    status: response.status
                };
            }

            // Если сервер вернул success: false, сохраняем это значение
            // Иначе считаем ответ успешным по умолчанию
            const success = data.success !== undefined ? data.success : true;

            return {
                success,
                data: data.data || data,
                message: data.message,
                status: response.status
            };
        }

        return {
            success: false,
            errors: response.data,
            status: response.status
        };
    }

    // Обработчик ошибок
    handleError(error) {
        const errorMessage = error.response?.data?.message ||
            error.response?.data?.detail ||
            error.response?.data ||
            error.message ||
            'Ошибка сервера';

        const status = error.response?.status;
        const statusText = error.response?.statusText;

        console.error(`API Error [${status || 'undefined'}${statusText ? ' ' + statusText : ''}]:`, errorMessage);

        return {
            success: false,
            message: errorMessage,
            status: status,
            errors: error.response?.data
        };
    }

    // Получить базовый URL
    getBaseUrl() {
        return this.baseUrl;
    }

    // Получить токен авторизации
    getAuthToken() {
        return tokenService.getAccess();
    }
}

// Создать и экспортировать синглтон-объект
export const apiClient = new ApiClient(); 