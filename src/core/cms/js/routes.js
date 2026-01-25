export default {
  "User": {
    "path": "/user",
    "component": "@/core/cms/adp/user/ParentLayout.vue",
    "redirect": "/user/account",
    "meta": {
      "requiresAuth": true
    },
    "children": [
      {
        "path": "account",
        "name": "Account",
        "component": "@/core/cms/adp/user/account/ParentLayout.vue",
        "meta": {
          "requiresAuth": true
        }
      }
    ]
  },
  "SecuritySettings": {
    "path": "/user/security",
    "component": "@/core/cms/adp/settings/security/ParentLayout.vue",
    "meta": {
      "requiresAuth": true
    }
  },
  "Settings": {
    "path": "/settings",
    "component": "@/core/cms/adp/settings/ParentLayout.vue",
    "redirect": "SiteSettings",
    "meta": {
      "requiresAuth": true
    }
  },
  "AdminPanel": {
    "path": "/admin-panel",
    "component": "@/core/cms/adp/admin/ParentLayout.vue",
    "redirect": "UsersPanel",
    "meta": {
      "title": "Админ-панель",
      "requiresAuth": true
    }
  },
  "UsersPanel": {
    "path": "/admin-panel/users",
    "component": "@/core/cms/adp/admin/Users.vue",
    "meta": {
      "title": "Панель пользователей",
      "requiresAuth": true
    }
  },
  "ImportUsersPanel": {
    "path": "/admin-panel/users/import",
    "component": "@/core/cms/adp/admin/ImportUsers.vue",
    "meta": {
      "title": "Импорт пользователей",
      "requiresAuth": true
    }
  },
  "CategoriesPanel": {
    "path": "/admin-panel/categories",
    "component": "@/core/cms/adp/admin/Categories.vue",
    "meta": {
      "title": "Панель ролей",
      "requiresAuth": true
    }
  },
  "GroupsPanel": {
    "path": "/admin-panel/groups",
    "component": "@/core/cms/adp/admin/Groups.vue",
    "meta": {
      "title": "Панель ролевых групп",
      "requiresAuth": true
    }
  },
  "PermissionsPanel": {
    "path": "/admin-panel/permissions",
    "component": "@/core/cms/adp/admin/Permissions.vue",
    "meta": {
      "title": "Политики и модульные права",
      "requiresAuth": true
    }
  },
  "ModulePagePermissionsPanel": {
    "path": "/admin-panel/module-page-permissions",
    "component": "@/core/cms/adp/admin/ModulePagePermissions.vue",
    "meta": {
      "title": "Права по страницам модулей",
      "requiresAuth": true
    }
  },
  "LiminationPanel": {
    "path": "/admin-panel/limitations",
    "component": "@/core/cms/adp/admin/limitationSettings.vue",
    "meta": {
      "title": "Панель Ограничений",
      "requiresAuth": true
    }
  },
  "MenuPanel": {
    "path": "/admin-panel/menu",
    "component": "@/core/cms/adp/admin/MenuPanel.vue",
    "meta": {
      "title": "Управление меню",
      "requiresAuth": true
    }
  },
  "SiteSettings": {
    "path": "/settings/site-settings",
    "component": "@/core/cms/adp/settings/siteSettings/ParentLayout.vue",
    "meta": {
      "requiresAuth": true
    }
  },
  "FileManager": {
    "path": "/filemanager",
    "component": "@/core/cms/filemanager/FileManager.vue",
    "meta": {
      "title": "Файлы",
      "requiresAuth": true
    }
  },
  "AccessDenied": {
    "path": "/access-denied",
    "component": "@/components/AccessDenied.vue",
    "meta": {
      "title": "Ошибка доступа",
      "requiresAuth": true
    }
  }
}

