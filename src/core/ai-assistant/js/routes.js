export default {
  "AIAssistantHub": {
    "path": "/ai-assistant",
    "component": "@/core/ai-assistant/pages/AIAssistantHub.vue",
    "meta": {
      "title": "AI Hub",
      "requiresAuth": true
    }
  },
  "AIAssistantChat": {
    "path": "/ai-assistant/chat",
    "component": "@/core/ai-assistant/pages/AIAssistantPage.vue",
    "meta": {
      "title": "AI Ассистент - Чат",
      "requiresAuth": true
    }
  },
  "AIAssistantBI": {
    "path": "/ai-assistant/bi",
    "component": "@/core/ai-assistant/pages/AIAssistantBIPage.vue",
    "meta": {
      "title": "AI Ассистент - BI Анализ",
      "requiresAuth": true
    }
  }
}
