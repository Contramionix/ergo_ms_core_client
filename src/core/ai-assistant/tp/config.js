/**
 * Модуль: Техпроцессы
 * AI ассистент для работы с техпроцессами
 */
import { Wrench } from 'lucide-vue-next'
import { markRaw } from 'vue'

export default {
  id: 'tp',
  name: 'Техпроцессы',
  description: 'Работа с документами техпроцессов',
  icon: markRaw(Wrench),
  color: '#f59e0b', // Amber/Orange
  colorLight: 'rgba(245, 158, 11, 0.15)',
  enabled: true,
  comingSoon: false,

  settings: {
    welcomeMessage: 'Помогу с анализом техпроцессов. Загрузите документы для начала работы.',
    placeholder: 'Задайте вопрос по техпроцессам...',
    maxTokens: 131072,
    supportedFormats: ['docx'],
  },

  ollama_config: {
    num_gpu: 999,
    temperature: 0.3,
    max_tokens: 131072,
    top_p: 0.9,
    top_k: 40,
    seed: 42,
    repeat_penalty: 1.1,
  },

  suggestions: [
    'Найди значения трудоемкости работ',
    'Какие профессии указаны в документах?',
    'Покажи все операции по объему ТР-1',
    'Найди информацию о проверке уровня масла',
  ],
}
