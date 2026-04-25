import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { initSDKs, checkSDKStatus } from './utils/sdk-loader'

// 初始化应用
async function initApp() {
  // 初始化SDK
  const sdkLoaded = await initSDKs()
  
  if (sdkLoaded) {
    checkSDKStatus()
  }
  // 创建Vue应用
  const app = createApp(App)
  app.mount('#app')
}

// 启动应用
initApp().catch(error => {
  console.error('应用初始化失败:', error)
})