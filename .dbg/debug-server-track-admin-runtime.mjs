import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const sessionId = 'track-admin-runtime'
const outdir = path.resolve('.dbg')
const host = '127.0.0.1'
const startPort = 7777

fs.mkdirSync(outdir, { recursive: true })

const logFile = path.join(outdir, `trae-debug-log-${sessionId}.ndjson`)
const envFile = path.join(outdir, `${sessionId}.env`)
fs.writeFileSync(logFile, '')

const writeEnvFile = (port) => {
  const apiUrl = `http://${host}:${port}/event`
  fs.writeFileSync(envFile, `DEBUG_SERVER_URL=${apiUrl}\nDEBUG_SESSION_ID=${sessionId}\n`)
  return apiUrl
}

const createServer = () =>
  http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET, DELETE')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }

    if (req.method === 'DELETE' && req.url === '/logs') {
      fs.writeFileSync(logFile, '')
      res.statusCode = 200
      res.end('ok')
      return
    }

    if (req.method === 'GET' && req.url?.startsWith('/logs')) {
      res.statusCode = 200
      res.end(fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '')
      return
    }

    if (req.method === 'GET' && req.url === '/health') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: true, sessionId, logFile }))
      return
    }

    if (req.method === 'POST' && req.url === '/event') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', () => {
        try {
          const event = JSON.parse(body || '{}')
          if (!event.ts) event.ts = Date.now()
          fs.appendFileSync(logFile, `${JSON.stringify(event)}\n`)
          res.statusCode = 200
          res.end('ok')
        } catch (error) {
          res.statusCode = 400
          res.end(error instanceof Error ? error.message : String(error))
        }
      })
      return
    }

    res.statusCode = 404
    res.end('not found')
  })

const listen = (port, retries = 0) => {
  const server = createServer()
  server.on('error', (error) => {
    const errorCode = typeof error === 'object' && error !== null ? error.code : undefined
    if (errorCode === 'EADDRINUSE' && retries < 10) {
      listen(port + 1, retries + 1)
      return
    }

    process.stderr.write(`${error}\n`)
    process.exit(1)
  })

  server.listen(port, host, () => {
    const apiUrl = writeEnvFile(port)
    process.stdout.write('@@DEBUG_SERVER_INFO\n')
    process.stdout.write(
      `${JSON.stringify(
        {
          api_url: apiUrl,
          session_id: sessionId,
          log_dir: outdir,
          log_file: logFile,
          env_file: envFile,
        },
        null,
        2,
      )}\n`,
    )
    process.stdout.write('@@END_DEBUG_SERVER_INFO\n')
  })
}

listen(startPort)
