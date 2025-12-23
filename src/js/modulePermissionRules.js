/**
 * Конфигурация проверки прав модулей.
 * 
 * Каждое правило содержит:
 * - match: функция проверки соответствия маршрута
 * - module: имя модуля для проверки разрешений
 * - permissions: массив разрешений (достаточно одного)
 * - title: заголовок сообщения об ограничении доступа
 * - message: текст сообщения об ограничении доступа
 */
export const MODULE_PERMISSION_RULES = [
  {
    match: (to) => 
      to.name?.toString().startsWith('CRMRemasteredProjects') ||
      to.path?.startsWith('/crm-remastered/projects'),
    module: 'projects',
    permissions: ['project_view'],
    title: 'Доступ к проектам ограничен',
    message: 'У вас нет прав для просмотра проектов. Обратитесь к администратору.',
  },
  {
    match: (to) => 
      to.name?.toString().startsWith('OrganizationSettings') ||
      to.path?.startsWith('/settings/organization'),
    module: 'organizations',
    permissions: ['org_settings', 'org_manage'],
    title: 'Доступ к настройкам организаций ограничен',
    message: 'У вас нет прав для просмотра настроек организаций. Обратитесь к администратору.',
  },
  {
    match: (to) => 
      to.name?.toString().startsWith('CRMRemasteredTasks') ||
      to.path?.startsWith('/crm-remastered/tasks'),
    module: 'tasks',
    permissions: ['task_view'],
    title: 'Доступ к задачам ограничен',
    message: 'У вас нет прав для просмотра задач. Обратитесь к администратору.',
  },
  {
    match: (to) => to.meta?.requiresAdmin === true,
    module: 'project_ed',
    permissions: ['project_ed_admin'],
    title: 'Доступ ограничен',
    message: 'Доступ к этой странице ограничен настройками вашей организации. При необходимости обратитесь к администратору.',
  },
]

