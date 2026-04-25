import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    base: env.VITE_PUBLIC_PATH || "/",
    plugins: [vue()],
    server: {
      proxy: {
        // 代理 TTSA 会话请求，解决 CORS 问题
        '/api/ttsa': {
          target: 'http://58.250.117.203:32004',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ttsa/, '/user/v1/ttsa'),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('代理错误:', err)
            })
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('代理请求:', req.method, req.url)
            })
          },
        },
        // 代理其他可能的网关请求
        '/user/v1/ttsa': {
          target: 'http://58.250.117.203:32004',
          changeOrigin: true,
        },
      },
    },
  }
})
