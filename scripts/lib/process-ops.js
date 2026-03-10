/**
 * Абстракция для поиска и остановки процессов (Windows/Linux).
 * Для тестов — setStrategy(mockStrategy).
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import process from 'process'

const execAsync = promisify(exec)

let _strategy = null

function getStrategy() {
  if (_strategy) return _strategy
  _strategy = process.platform === 'win32' ? createWindowsStrategy() : createUnixStrategy()
  return _strategy
}

export function setStrategy(strategy) {
  _strategy = strategy
}

export function resetStrategy() {
  _strategy = null
}

export async function findProcesses(command) {
  return getStrategy().findProcesses(command)
}

export async function killProcess(pid) {
  try {
    return await getStrategy().killProcess(pid)
  } catch (error) {
    console.error(`Ошибка при остановке процесса ${pid}:`, error.message)
    return false
  }
}

function createWindowsStrategy() {
  async function findViaWmic(command) {
    const cmd = `wmic process where "name='node.exe' or CommandLine like '%${command}%'" get ProcessId,CommandLine /format:csv`
    const { stdout } = await execAsync(cmd)
    const lines = stdout.trim().split('\n').filter(line => line.trim() && !line.startsWith('Node'))
    const processes = []
    for (const line of lines) {
      if (!line || line.startsWith('Node,')) continue
      const parts = line.split(',')
      if (parts.length >= 3) {
        const pid = parseInt(parts[1], 10)
        if (!isNaN(pid)) {
          const cmdline = parts.slice(2).join(',').replace(/"/g, '')
          processes.push({ name: 'node.exe', pid, cmdline })
        }
      }
    }
    return processes
  }

  async function findViaPowerShell(command) {
    const cmd = `powershell -Command "Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -like '*${command}*' } | Select-Object ProcessId, CommandLine | ConvertTo-Csv -NoTypeInformation"`
    const { stdout } = await execAsync(cmd)
    const lines = stdout.trim().split('\n').filter(line => line.trim() && !line.startsWith('"ProcessId"'))
    const processes = []
    for (const line of lines) {
      const match = line.match(/"(\d+)","([^"]*)"/)
      if (match) {
        processes.push({ name: 'node.exe', pid: parseInt(match[1], 10), cmdline: match[2] })
      }
    }
    return processes
  }

  return {
    async findProcesses(command) {
      try {
        return await findViaWmic(command)
      } catch (error) {
        if ((error.code === 1 || !error.stdout) && error.message.includes('wmic')) {
          return await findViaPowerShell(command)
        }
        if (error.code === 1 || (error.stdout && error.stdout.trim() === '')) {
          return []
        }
        throw error
      }
    },
    async killProcess(pid) {
      await execAsync(`taskkill /PID ${pid} /F`)
      return true
    }
  }
}

function createUnixStrategy() {
  return {
    async findProcesses(command) {
      try {
        const cmd = `ps aux | grep -i "${command}" | grep -v grep`
        const { stdout } = await execAsync(cmd)
        const lines = stdout.trim().split('\n').filter(line => line.trim())
        const processes = []
        for (const line of lines) {
          const parts = line.trim().split(/\s+/)
          if (parts.length >= 11) {
            const pid = parseInt(parts[1], 10)
            if (!isNaN(pid)) {
              const cmdline = parts.slice(10).join(' ')
              processes.push({ name: parts[10] || '', pid, cmdline })
            }
          }
        }
        return processes
      } catch (error) {
        if (error.code === 1 || (error.stdout && error.stdout.trim() === '')) {
          return []
        }
        throw error
      }
    },
    async killProcess(pid) {
      await execAsync(`kill ${pid}`)
      return true
    }
  }
}
