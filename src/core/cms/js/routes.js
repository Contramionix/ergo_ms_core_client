export default {
  "AppHome": {
    "path": "/home",
    "name": "AppHome",
    "component": "@/pages/AppHomePage.vue",
    "meta": {
      "title": "Главная",
      "requiresAuth": true,
      "flushContent": true,
      "shellBackdrop": true
    }
  },
  "User": {
    "path": "/user",
    "component": "@/core/cms/adp/user/ParentLayout.vue",
    "redirect": "Account",
    "meta": {
      "requiresAuth": true
    },
    "children": [
      {
        "path": "",
        "name": "Account",
        "component": "@/core/cms/adp/user/account/component/UserProfileView.vue",
        "meta": {
          "title": "Личный кабинет",
          "requiresAuth": true
        }
      },
      {
        "path": "notifications",
        "name": "UserNotifications",
        "component": "@/core/cms/adp/user/notifications/ParentLayout.vue",
        "meta": {
          "title": "Уведомления",
          "requiresAuth": true
        }
      }
    ]
  },
  "Settings": {
    "path": "/settings",
    "component": "@/core/cms/adp/settings/ParentLayout.vue",
    "redirect": "AdminPanel",
    "meta": {
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "AdminPanel": {
    "path": "/admin-panel",
    "component": "@/core/cms/adp/admin/ParentLayout.vue",
    "redirect": "UsersPanel",
    "meta": {
      "title": "Админ-панель",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "UsersPanel": {
    "path": "/admin-panel/users",
    "component": "@/core/cms/adp/admin/Users.vue",
    "meta": {
      "title": "Панель пользователей",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "ImportUsersPanel": {
    "path": "/admin-panel/users/import",
    "component": "@/core/cms/adp/admin/ImportUsers.vue",
    "meta": {
      "title": "Загрузка пользователей",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "InvitationsPanel": {
    "path": "/admin-panel/invitations",
    "component": "@/core/cms/adp/admin/Invitations.vue",
    "meta": {
      "title": "Управление приглашениями",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "ProfileChangeRequestsPanel": {
    "path": "/admin-panel/profile-change-requests",
    "component": "@/core/cms/adp/admin/ProfileChangeRequests.vue",
    "meta": {
      "title": "Заявки на изменение данных профиля",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "CategoriesPanel": {
    "path": "/admin-panel/categories",
    "component": "@/core/cms/adp/admin/Categories.vue",
    "meta": {
      "title": "Панель ролей",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "GroupsPanel": {
    "path": "/admin-panel/groups",
    "component": "@/core/cms/adp/admin/Groups.vue",
    "meta": {
      "title": "Панель ролевых групп",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "AccessControlPanel": {
    "path": "/admin-panel/access",
    "component": "@/core/cms/adp/admin/AccessControl.vue",
    "meta": {
      "title": "Доступ и права",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "PermissionsPanel": {
    "path": "/admin-panel/permissions",
    "redirect": {
      "path": "/admin-panel/access",
      "query": { "tab": "policies" }
    },
    "meta": {
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "ModulePagePermissionsPanel": {
    "path": "/admin-panel/module-page-permissions",
    "redirect": {
      "path": "/admin-panel/access",
      "query": { "tab": "pages" }
    },
    "meta": {
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "LiminationPanel": {
    "path": "/admin-panel/limitations",
    "redirect": {
      "path": "/admin-panel/access",
      "query": { "tab": "pages" }
    },
    "meta": {
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "MenuPanel": {
    "path": "/admin-panel/menu",
    "component": "@/core/cms/adp/admin/MenuPanel.vue",
    "meta": {
      "title": "Управление меню",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "AuditLogPanel": {
    "path": "/admin-panel/audit-log",
    "component": "@/core/cms/adp/admin/AuditLog.vue",
    "meta": {
      "title": "Журнал действий",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "ThemeEditor": {
    "path": "/settings/themes",
    "component": "@/core/cms/adp/settings/themeEditor/ParentLayout.vue",
    "meta": {
      "title": "Темы оформления",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "AccessDenied": {
    "path": "/access-denied",
    "component": "@/components/AccessDenied.vue",
    "meta": {
      "title": "Ошибка доступа",
      "requiresAuth": true,
      "shellBackdrop": true
    }
  }
}

