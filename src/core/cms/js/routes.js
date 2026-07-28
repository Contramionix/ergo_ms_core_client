export default {
  "AppHome": {
    "path": "/home",
    "name": "AppHome",
    "component": "@/pages/AppHomePage.vue",
    "meta": {
      "title": "Главная",
      "titleKey": "routes.home",
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
          "titleKey": "routes.account",
          "requiresAuth": true
        }
      },
      {
        "path": "notifications",
        "name": "UserNotifications",
        "component": "@/core/cms/adp/user/notifications/ParentLayout.vue",
        "meta": {
          "title": "Уведомления",
          "titleKey": "routes.notifications",
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
      "title": "Настройки системы",
      "titleKey": "routes.systemSettings",
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
      "titleKey": "routes.adminPanel",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "UsersPanel": {
    "path": "/admin-panel/users",
    "component": "@/core/cms/adp/admin/Users.vue",
    "meta": {
      "title": "Пользователи",
      "titleKey": "routes.users",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "ImportUsersPanel": {
    "path": "/admin-panel/users/import",
    "component": "@/core/cms/adp/admin/ImportUsers.vue",
    "meta": {
      "title": "Загрузка пользователей",
      "titleKey": "routes.importUsers",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "InvitationsPanel": {
    "path": "/admin-panel/invitations",
    "component": "@/core/cms/adp/admin/Invitations.vue",
    "meta": {
      "title": "Управление приглашениями",
      "titleKey": "routes.invitations",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "ProfileChangeRequestsPanel": {
    "path": "/admin-panel/profile-change-requests",
    "component": "@/core/cms/adp/admin/ProfileChangeRequests.vue",
    "meta": {
      "title": "Заявки на изменение данных профиля",
      "titleKey": "routes.profileChangeRequests",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "CategoriesPanel": {
    "path": "/admin-panel/categories",
    "component": "@/core/cms/adp/admin/Categories.vue",
    "meta": {
      "title": "Панель ролей",
      "titleKey": "routes.roles",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "GroupsPanel": {
    "path": "/admin-panel/groups",
    "component": "@/core/cms/adp/admin/Groups.vue",
    "meta": {
      "title": "Панель ролевых групп",
      "titleKey": "routes.roleGroups",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "AccessControlPanel": {
    "path": "/admin-panel/access",
    "component": "@/core/cms/adp/admin/AccessControl.vue",
    "meta": {
      "title": "Доступ и права",
      "titleKey": "routes.accessControl",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "MenuPanel": {
    "path": "/admin-panel/menu",
    "component": "@/core/cms/adp/admin/MenuPanel.vue",
    "meta": {
      "title": "Управление меню",
      "titleKey": "routes.menu",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "AuditLogPanel": {
    "path": "/admin-panel/audit-log",
    "component": "@/core/cms/adp/admin/AuditLog.vue",
    "meta": {
      "title": "Журнал действий",
      "titleKey": "routes.audit",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "ClientMonitorPanel": {
    "path": "/admin-panel/client-monitor",
    "redirect": { "name": "AuditLogPanel", "query": { "tab": "client" } },
    "meta": {
      "title": "Журнал действий",
      "titleKey": "routes.audit",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },

  "ThemeEditor": {
    "path": "/settings/themes",
    "component": "@/core/cms/adp/settings/themeEditor/ParentLayout.vue",
    "meta": {
      "title": "Темы оформления",
      "titleKey": "routes.themes",
      "requiresAuth": true,
      "requiresGlobalAdmin": true
    }
  },
  "AccessDenied": {
    "path": "/access-denied",
    "component": "@/components/AccessDenied.vue",
    "meta": {
      "title": "Ошибка доступа",
      "titleKey": "components.accessDenied.deniedTitle",
      "requiresAuth": true,
      "shellBackdrop": true
    }
  }
}
