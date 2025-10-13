export default {
  "Categories": {
    "path": "/categories",
    "component": "@/core/categories/ParentLayout.vue",
    "redirect": "PageCategories",
    "meta": {
      "requiresAuth": true
    }
  },
  "PageCategories": {
    "path": "/categories/page-categories",
    "component": "@/core/categories/PageCategories.vue",
    "meta": {
      "title": "Категории",
      "requiresAuth": true
    }
  },
  "PageCategoriesManager": {
    "path": "/categories/categories-list",
    "component": "@/core/categories/CategoriesManagerPage.vue",
    "meta": {
      "title": "Создание категорий",
      "requiresAuth": true
    }
  },
  "TagsManager": {
    "path": "/categories/tags-list",
    "component": "@/core/categories/TagsManagerPage.vue",
    "meta": {
      "title": "Создание тегов",
      "requiresAuth": true
    }
  }
}

