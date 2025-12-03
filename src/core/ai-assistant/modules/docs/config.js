/**
 * Модуль: Работа с документами
 * AI ассистент для анализа и генерации документов
 */
import { FileText } from 'lucide-vue-next'
import { markRaw } from 'vue'

export default {
  id: 'docs',
  name: 'Документы',
  description: 'Работа с документами',
  icon: markRaw(FileText),
  color: '#f59e0b', // Orange
  colorLight: 'rgba(245, 158, 11, 0.15)',
  enabled: true,
  comingSoon: true, // Модуль в разработке
  
  // Настройки модуля
  settings: {
    welcomeMessage: 'Помогу с анализом и созданием документов.',
    placeholder: 'Опишите задачу...',
    maxTokens: 8192,
    supportedFormats: ['pdf', 'docx', 'txt', 'md'],
  },
  
  // Подсказки для пользователя
  suggestions: [
    'Проанализируй документ',
    'Создай отчёт',
    'Суммируй текст',
    'Извлеки данные',
  ],
}


