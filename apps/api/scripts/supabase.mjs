import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)

const homeDir = path.resolve(process.cwd(), '.home')
fs.mkdirSync(homeDir, { recursive: true })

const env = {
  ...process.env,
  HOME: homeDir,
  USERPROFILE: homeDir,
  XDG_CONFIG_HOME: path.join(homeDir, '.config'),
}

const result = spawnSync('supabase', args, {
  stdio: 'inherit',
  env,
  shell: true,
})

process.exit(result.status ?? 1)
