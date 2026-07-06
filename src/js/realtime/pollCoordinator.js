/**
 * Единый координатор polling-задач: один таймер, пауза в фоне, немедленный poll при focus.
 */

const TICK_MS = 1000
const jobs = new Map()
let tickTimer = null
let visibilityBound = false

function ensureTicking() {
  if (tickTimer) {
    return
  }
  tickTimer = setInterval(() => {
    if (document.visibilityState === 'hidden') {
      return
    }
    const now = Date.now()
    for (const job of jobs.values()) {
      if (!job.enabled) {
        continue
      }
      if (now - job.lastRun >= job.intervalMs) {
        job.lastRun = now
        void job.run()
      }
    }
  }, TICK_MS)
}

function bindVisibility() {
  if (visibilityBound) {
    return
  }
  visibilityBound = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') {
      return
    }
    const now = Date.now()
    for (const job of jobs.values()) {
      if (!job.enabled) {
        continue
      }
      job.lastRun = now
      void job.run()
    }
  })
}

/**
 * @param {string} id уникальный id задачи
 * @param {() => void | Promise<void>} run
 * @param {number} intervalMs
 */
export function registerPollJob(id, run, intervalMs) {
  bindVisibility()
  jobs.set(id, {
    enabled: true,
    intervalMs: Math.max(1000, intervalMs),
    lastRun: 0,
    run,
  })
  ensureTicking()
  if (document.visibilityState === 'visible') {
    void run()
  }

  return () => {
    jobs.delete(id)
    if (jobs.size === 0 && tickTimer) {
      clearInterval(tickTimer)
      tickTimer = null
    }
  }
}

export function setPollJobInterval(id, intervalMs) {
  const job = jobs.get(id)
  if (job) {
    job.intervalMs = Math.max(1000, intervalMs)
  }
}

export function pausePollJob(id) {
  const job = jobs.get(id)
  if (job) {
    job.enabled = false
  }
}

export function resumePollJob(id) {
  const job = jobs.get(id)
  if (job) {
    job.enabled = true
    job.lastRun = 0
  }
}
