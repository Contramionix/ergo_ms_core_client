export default {
  "Shortcodes": {
    "path": "/shortcodes",
    "component": "@/core/shortcodes/ParentLayout.vue",
    "redirect": "MainShortcodePage",
    "meta": {
      "title": "Конструктор сайта",
      "requiresAuth": true
    }
  },
  "MainShortcodePage": {
    "path": "/shortcodes/editor",
    "component": "@/core/shortcodes/editor/MainPage.vue",
    "meta": {
      "title": "Главная",
      "requiresAuth": true
    }
  },
  "ShortcodeEditor": {
    "path": "/shortcodes/editor/:id?",
    "component": "@/core/shortcodes/editor/ShortcodeEditor.vue",
    "meta": {
      "title": "Редактор страниц",
      "requiresAuth": true
    }
  },
  "Templates": {
    "path": "/shortcodes/templates",
    "component": "@/core/shortcodes/editor/TemplateManager.vue",
    "meta": {
      "title": "Компоненты",
      "requiresAuth": true
    }
  },
  "Layouts": {
    "path": "/shortcodes/site-layouts",
    "component": "@/core/shortcodes/SiteLayout.vue",
    "meta": {
      "title": "Разметка сайта",
      "requiresAuth": true
    }
  },
  "PageShortcodeCategories": {
    "path": "/shortcodes/categories-page",
    "component": "@/core/shortcodes/editor/PageCategories.vue",
    "meta": {
      "title": "Категории страниц",
      "requiresAuth": true
    }
  },
  "CreatePage": {
    "path": "/shortcodes/create-page",
    "component": "@/core/shortcodes/editor/CreatePage.vue",
    "meta": {
      "title": "Создание страниц",
      "requiresAuth": true
    }
  },
  "Pages": {
    "path": "/shortcodes/pages",
    "component": "@/core/shortcodes/AllPages.vue",
    "meta": {
      "title": "Страницы",
      "requiresAuth": true
    }
  },
  "TemplateEditor": {
    "path": "/shortcodes/templates/:id?",
    "component": "@/core/shortcodes/editor/TemplateEditor.vue",
    "meta": {
      "title": "Редактор компонентов",
      "requiresAuth": true
    }
  },
  "CmsAnyDepthPage": {
    "path": "/shortcodes/:parts(.*)+",
    "component": "@/core/shortcodes/CmsPage.vue",
    "meta": {
      "public": true
    }
  }
}

