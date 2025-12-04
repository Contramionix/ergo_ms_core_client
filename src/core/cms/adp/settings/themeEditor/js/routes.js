export default {
  "ThemeSettings": {
    "path": "/settings/themes",
    "component": "@/core/cms/adp/settings/themeEditor/ParentLayout.vue",
    "redirect": "ThemeEditor",
    "meta": {
      "title": "Темы оформления",
      "requiresAuth": true
    }
  },
  "ThemeEditor": {
    "path": "/settings/themes/editor",
    "component": "@/core/cms/adp/settings/themeEditor/ParentLayout.vue",
    "meta": {
      "title": "Редактор тем",
      "requiresAuth": true
    }
  }
}

