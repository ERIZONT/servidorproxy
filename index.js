// Servidor proxy para ERIZONT
import express from "express"
import { createProxyMiddleware } from "http-proxy-middleware"
import cors from "cors"
import rateLimit from "express-rate-limit"

const app = express()

// Configurar CORS para permitir requisições do seu domínio
app.use(
  cors({
    origin: ["https://erizont.site", "http://localhost:3000"],
    credentials: true,
  }),
)

// Configurar limite de taxa para evitar abuso
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por janela
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(limiter)

// Variável para controlar o estado do proxy
let proxyEnabled = false

// Rota para verificar status do proxy
app.get("/api/proxy/status", (req, res) => {
  res.json({ enabled: proxyEnabled })
})

// Rota para ativar/desativar o proxy
app.post("/api/proxy/toggle", (req, res) => {
  proxyEnabled = !proxyEnabled
  res.json({ enabled: proxyEnabled, message: proxyEnabled ? "Proxy ativado" : "Proxy desativado" })
})

// Middleware para verificar se o proxy está ativo
const checkProxyEnabled = (req, res, next) => {
  if (!proxyEnabled) {
    return res.status(403).json({ error: "Proxy não está ativo. Ative o VPN ERIZONT primeiro." })
  }
  next()
}

// Configurar o proxy
app.use(
  "/proxy",
  checkProxyEnabled,
  createProxyMiddleware({
    router: (req) => {
      // Extrair a URL de destino do parâmetro de consulta
      const targetUrl = req.query.url
      if (!targetUrl) {
        throw new Error("URL de destino não especificada")
      }
      return decodeURIComponent(targetUrl.toString())
    },
    changeOrigin: true,
    pathRewrite: (path, req) => {
      // Remover o prefixo '/proxy' e o parâmetro de consulta 'url'
      return ""
    },
    onProxyRes: (proxyRes, req, res) => {
      // Adicionar cabeçalhos CORS
      proxyRes.headers["Access-Control-Allow-Origin"] = "*"
      proxyRes.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
      proxyRes.headers["Access-Control-Allow-Headers"] = "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    },
    logLevel: "silent", // Definir como 'debug' para solução de problemas
  }),
)

// Rota para obter o IP do usuário
app.get("/api/ip", (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress
  res.json({ ip })
})

// Rota de teste para verificar se o servidor está funcionando
app.get("/", (req, res) => {
  res.send("Servidor proxy ERIZONT está funcionando!")
})

// Definir porta
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Servidor proxy rodando na porta ${PORT}`)
})

// Exportar para uso com serverless
export default app
