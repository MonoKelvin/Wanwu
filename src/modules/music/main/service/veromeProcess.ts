import { spawn, type ChildProcess } from 'child_process'

let localProcess: ChildProcess | null = null

export function getLocalVeromeBaseUrl(port: number): string {
  return `http://127.0.0.1:${port}`
}

export async function probeLocalVerome(port: number): Promise<boolean> {
  try {
    const res = await fetch(`${getLocalVeromeBaseUrl(port)}/api/moods`, {
      signal: AbortSignal.timeout(3000)
    })
    return res.ok
  } catch {
    return false
  }
}

/** 可选：用户已自行启动 Deno 服务时仅探测，不自动 spawn 仓库 */
export async function ensureLocalVerome(port: number): Promise<{ ok: boolean; message?: string }> {
  const ok = await probeLocalVerome(port)
  if (ok) return { ok: true }
  return {
    ok: false,
    message: '本地 Verome 未响应。请安装 Deno 并在 Verome-API 目录执行 deno task start。'
  }
}

export function stopLocalVeromeProcess(): void {
  if (localProcess) {
    localProcess.kill()
    localProcess = null
  }
}

/** 实验性：若系统有 deno 且设置了 repo 路径，可扩展 spawn；当前仅保留接口 */
export function trySpawnLocalVerome(_repoPath: string, port: number): void {
  if (localProcess) return
  localProcess = spawn('deno', ['task', 'start'], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore',
    detached: false
  })
  localProcess.on('exit', () => {
    localProcess = null
  })
}
