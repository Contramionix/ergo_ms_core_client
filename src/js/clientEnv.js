/**
 * Настройки клиента из `.env` (подставляются при сборке через core/client/vite.config.js).
 * В `.env` — `CLIENT_*`, общие `API_*`, `DISABLED_MODULES`, `REALTIME_*`.
 * В коде используйте только этот модуль, не `import.meta.env` напрямую.
 */

function readEnv(name, fallback = '') {
  const value = import.meta.env[name]
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  return String(value)
}

function readBool(name, fallback = false) {
  const raw = readEnv(name, '')
  if (raw === '') {
    return fallback
  }
  return raw.toLowerCase() === 'true'
}

function readInt(name, fallback) {
  const parsed = Number.parseInt(readEnv(name, ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const clientEnv = {
  apiHost: readEnv('CLIENT_API_HOST', 'localhost'),
  apiPort: readEnv('CLIENT_API_PORT', '8000'),
  useRelativeApi: readBool('CLIENT_USE_RELATIVE_API', false),
  defaultTheme: readEnv('CLIENT_DEFAULT_THEME', 'light'),
  logLevel: readEnv('CLIENT_LOG_LEVEL', 'debug'),
  maintenancePollEnabled: readBool('CLIENT_MAINTENANCE_POLL_ENABLED', false),
  disabledModules: readEnv('CLIENT_DISABLED_MODULES', ''),
  passwordMinLength: readInt('CLIENT_PASSWORD_MIN_LENGTH', 8),
  passwordMaxLength: readInt('CLIENT_PASSWORD_MAX_LENGTH', 128),
  passwordRequireLowercase: readBool('CLIENT_PASSWORD_REQUIRE_LOWERCASE', true),
  passwordRequireUppercase: readBool('CLIENT_PASSWORD_REQUIRE_UPPERCASE', false),
  passwordRequireDigit: readBool('CLIENT_PASSWORD_REQUIRE_DIGIT', true),
  passwordRequireSpecial: readBool('CLIENT_PASSWORD_REQUIRE_SPECIAL', false),
  realtimeTransport: readEnv('CLIENT_REALTIME_TRANSPORT', 'websocket'),
  realtimePollPresenceMs: readInt('CLIENT_REALTIME_POLL_PRESENCE_INTERVAL', 45000),
  realtimePollNotificationsMs: readInt('CLIENT_REALTIME_POLL_NOTIFICATIONS_INTERVAL', 15000),
  realtimePollAdminPresenceMs: readInt('CLIENT_REALTIME_POLL_ADMIN_PRESENCE_INTERVAL', 10000),
  realtimePollMessengerMs: readInt('CLIENT_REALTIME_POLL_MESSENGER_INTERVAL', 5000),
  biPreviewItemsPerPage: readInt('CLIENT_BI_PREVIEW_ITEMS_PER_PAGE', 20),
  tasksMaxAttachmentSizeMb: readInt('CLIENT_TASKS_MAX_ATTACHMENT_SIZE_MB', 600),
}
