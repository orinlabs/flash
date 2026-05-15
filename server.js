/**
 * Minimal HTTP shell for Render Blueprint (lowest-cost web service).
 * Replace with real API (Fastify/Hono/etc.) as the app grows.
 */
const http = require('http')

const port = Number(process.env.PORT) || 3000

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'icp-prospector-api' }))
    return
  }
  res.writeHead(404)
  res.end()
})

server.listen(port, () => {
  console.log(`listening on ${port}`)
})
