import { reactive, ref, watch } from 'vue'
import type { AppState } from '../types'
import { LLM_CONFIG, SDK_CONFIG } from '../constants'
import { validateConfig } from '../utils'
import { avatarService } from '../services/avatar'
import { llmService } from '../services/llm'
import { ActionManager } from '../services/action-manager'

export const appState = reactive<AppState>({
  avatar: {
    appId: '',
    appSecret: '',
    connected: false,
    instance: null
  },
  asr: {
    provider: 'tx',
    appId: '',
    secretId: '',
    secretKey: '',
    isListening: false
  },
  llm: {
    model: LLM_CONFIG.DEFAULT_MODEL,
    apiKey: '',
    botId: ''
  },
  ui: {
    text: '',
    subTitleText: '',
    mode: 'interactive' as 'interactive' | 'walk' | 'switch' | 'custom-event'
  }
})

const cnSplitSign = /[。？！；… ，：]/
const enSplitSign = /[.?!;:,]/

export const avatarState = ref('')
const avatarInstance = ref<any>(null)
let voiceEndResolver: (() => void) | null = null

// 回调注册表：支持不同页面注册自己的回调
const callbackRegistry = {
  onSubtitleOn: [] as Array<(text: string) => void>,
  onSubtitleOff: [] as Array<() => void>,
  onStateChange: [] as Array<(state: string) => void>,
  onVoiceStateChange: [] as Array<(status: string) => void>,
  onWalkStateChange: [] as Array<(state: string) => void>,
  onWidgetEvent: [] as Array<(event: any) => void>,
  onProxyWidgetEvent: [] as Array<(event: any) => void>,
}

const actionManager = new ActionManager({
  instanceRef: avatarInstance,
  onVoiceReady: () => {
    avatarState.value = 'speak'
  },
  onVoiceEnd: () => {
    avatarState.value = 'interactive_idle'
  }
})

export class AppStore {
  // 注册回调
  registerCallback(type: keyof typeof callbackRegistry, callback: any) {
    callbackRegistry[type].push(callback)
    return () => {
      const index = callbackRegistry[type].indexOf(callback)
      if (index > -1) callbackRegistry[type].splice(index, 1)
    }
  }

  // 创建数字人实例（用于多数字人场景，不管理状态）
  async createAvatarInstance(options: {
    containerId: string
    appId: string
    appSecret: string
    gatewayServer?: string
    config: any
    useInvisibleMode?: boolean
    onStatusChange?: (status: any) => void
    onRenderChange?: (state: any) => void
    onMessage?: (error: any) => void
    onVoiceStateChange?: (status: string, duration?: number) => void
    onWalkStateChange?: (state: string) => void
    onWidgetEvent?: (data: any) => void
    proxyWidget?: { [key: string]: (data: any) => void }
    onDownloadProgress?: (progress: number) => void
  }): Promise<any> {
    const {
      containerId,
      appId,
      appSecret,
      gatewayServer,
      config,
      useInvisibleMode = false,
      onStatusChange,
      onRenderChange,
      onMessage,
      onVoiceStateChange,
      onWalkStateChange,
      onWidgetEvent,
      proxyWidget,
      onDownloadProgress
    } = options

    if (!appId || !appSecret) {
      throw new Error('请先配置 AppId 和 AppSecret')
    }

    const url = new URL(gatewayServer || SDK_CONFIG.GATEWAY_URL)
    if (!gatewayServer) {
      url.searchParams.append('data_source', SDK_CONFIG.DATA_SOURCE)
      url.searchParams.append('custom_id', SDK_CONFIG.CUSTOM_ID)
    }

    // 禁用 ASR（多数字人场景不需要ASR）
    const finalConfig = { ...config, enable_asr: false, asr_enabled: false }

    const constructorOptions: any = {
      containerId: containerId.startsWith('#') ? containerId : `#${containerId}`,
      appId,
      appSecret,
      headers: { 'Authorization': '888jn' },
      enableDebugger: false,
      gatewayServer: url.toString(),
      config: finalConfig,
      onMessage: (error: any) => {
        if (error?.code && error.code !== 0) {
          console.error('SDK错误:', error)
        }
        onMessage?.(error)
      }
    }

    // 添加回调
    if (onStatusChange) {
      constructorOptions.onStatusChange = onStatusChange
    }
    if (onRenderChange) {
      constructorOptions.onRenderChange = onRenderChange
    }
    if (onVoiceStateChange) {
      constructorOptions.onVoiceStateChange = onVoiceStateChange
    }
    if (onWalkStateChange) {
      constructorOptions.onWalkStateChange = onWalkStateChange
    }
    if (onWidgetEvent) {
      constructorOptions.onWidgetEvent = onWidgetEvent
    }
    if (proxyWidget) {
      constructorOptions.proxyWidget = proxyWidget
    }

    const avatar = new window.XmovAvatar(constructorOptions)
    
    await avatar.init({
      onDownloadProgress: (progress: number) => {
        onDownloadProgress?.(progress)
      },
      initModel: useInvisibleMode ? 'invisible' : 'normal'
    })

    // 启动数字人
    await avatar.start()

    return avatar
  }

  // 切换容器（用于不同页面）
  async switchContainer(containerId: string, config?: any): Promise<void> {
    if (!appState.avatar.instance) {
      await this.connectAvatar(containerId, config)
      return
    }

    // 如果已连接，需要重新初始化到新容器
    const instance = appState.avatar.instance
    try {
      await instance.stop()
      // 注意：SDK可能不支持动态切换容器，可能需要重新创建实例
      // 这里先尝试，如果不行则需要断开重连
      await this.disconnectAvatar()
      await this.connectAvatar(containerId, config)
    } catch (e) {
      console.error('切换容器失败，重新连接:', e)
      await this.disconnectAvatar()
      await this.connectAvatar(containerId, config)
    }
  }

  async connectAvatar(containerId?: string, customConfig?: any): Promise<void> {
    const { appId, appSecret } = appState.avatar
    if (!appId || !appSecret) {
      throw new Error('请先配置 AppId 和 AppSecret')
    }

    // 如果已连接，先断开
    if (appState.avatar.instance) {
      await this.disconnectAvatar()
    }

    const container = containerId || avatarService.getContainerId()
    const url = new URL(SDK_CONFIG.GATEWAY_URL)
    url.searchParams.append('data_source', SDK_CONFIG.DATA_SOURCE)
    url.searchParams.append('custom_id', SDK_CONFIG.CUSTOM_ID)

    // 合并配置
    const finalConfig = customConfig ? { ...SDK_CONFIG.AVATAR_CONFIG, ...customConfig } : SDK_CONFIG.AVATAR_CONFIG

    // 在 walk 和 custom-event 模式下禁用 ASR
    if (appState.ui.mode === 'walk' || appState.ui.mode === 'custom-event') {
      finalConfig.enable_asr = false
      finalConfig.asr_enabled = false
    }

    const constructorOptions: any = {
      containerId: `#${container}`,
      appId,
      appSecret,
      headers: { 'Authorization': '888jn' },
      enableDebugger: false,
      gatewayServer: url.toString(),
      config: finalConfig,
      onProxyWidgetEvent: (event: any) => {
        if (event.type === 'subtitle_on') {
          appState.ui.subTitleText = event.text
          callbackRegistry.onSubtitleOn.forEach(cb => cb(event.text))
        } else if (event.type === 'subtitle_off') {
          appState.ui.subTitleText = ''
          callbackRegistry.onSubtitleOff.forEach(cb => cb())
        }
        callbackRegistry.onProxyWidgetEvent.forEach(cb => cb(event))
      },
      onStateChange: (state: string) => {
        avatarState.value = state
        callbackRegistry.onStateChange.forEach(cb => cb(state))
      },
      onVoiceStateChange: (status: string) => {
        if (status.includes('end')) {
          avatarState.value = 'interactive_idle'
          voiceEndResolver?.()
          voiceEndResolver = null
        }
        callbackRegistry.onVoiceStateChange.forEach(cb => cb(status))
      },
      onMessage: (error: any) => {
        if (error?.code && error.code !== 0) {
          console.error('SDK错误:', error)
        }
      }
    }

    // 根据模式添加特定回调
    if (appState.ui.mode === 'walk' && callbackRegistry.onWalkStateChange.length > 0) {
      constructorOptions.onWalkStateChange = (state: string) => {
        callbackRegistry.onWalkStateChange.forEach(cb => cb(state))
      }
    }

    if (appState.ui.mode === 'custom-event' && callbackRegistry.onWidgetEvent.length > 0) {
      constructorOptions.onWidgetEvent = (data: any) => {
        callbackRegistry.onWidgetEvent.forEach(cb => cb(data))
      }
    }

    const avatar = new window.XmovAvatar(constructorOptions)
    
    await avatar.init({
      onDownloadProgress: (progress: number) => {
        console.log(`初始化进度: ${progress}%`)
      },
      onClose: () => {
        avatarState.value = ''
        callbackRegistry.onStateChange.forEach(cb => cb(''))
      }
    })

    appState.avatar.instance = avatar
    avatarInstance.value = avatar
    appState.avatar.connected = true
  }

  disconnectAvatar(): void {
    if (appState.avatar.instance) {
      avatarService.disconnect(appState.avatar.instance)
      appState.avatar.instance = null
      avatarInstance.value = null
      actionManager.reset()
      appState.avatar.connected = false
      avatarState.value = ''
    }
  }

  private async waitForAvatarIdle(timeout: number = 5000): Promise<void> {
    if (avatarState.value === 'interactive_idle' || avatarState.value === '') {
      return
    }

    return new Promise((resolve) => {
      voiceEndResolver = () => resolve()
      
      const stopWatcher = watch(avatarState, (newState) => {
        if (newState === 'interactive_idle' || newState === '') {
          stopWatcher()
          voiceEndResolver = null
          resolve()
        }
      })

      setTimeout(() => {
        stopWatcher()
        voiceEndResolver = null
        resolve()
      }, timeout)
    })
  }

  async sendMessage(): Promise<string | undefined> {
    const { llm, ui, avatar } = appState
    if (!validateConfig(llm, ['apiKey']) || !ui.text || !avatar.instance) {
      return
    }

    await this.interrupt()
    if (avatarState.value === 'speak') {
      await this.waitForAvatarIdle()
    }

    actionManager.reset()
    const stream = await llmService.sendMessageWithStream({
      provider: llm.model.startsWith('coze') ? 'coze' : 'openai',
      model: llm.model,
      apiKey: llm.apiKey,
      botId: llm.botId
    }, ui.text)

    if (!stream) return

    const minimum = 20
    const context = {
      cache: '',
      chars: 0,
      firstSpeakSend: false,
      spaceCount: 0
    }

    let firstSentenceResolved = false
    const firstSentencePromise = new Promise<void>((resolve) => {
      ;(async () => {
        for await (const content of stream) {
          context.cache += content

          if (content.startsWith(' ')) {
            context.spaceCount += 1
          }
          
          const chars = content.match(/[\u4e00-\u9fa5a-zA-Z0-9]/g)?.length ?? 0
          const isFirst = !context.firstSpeakSend
          const shouldSend = isFirst
            ? (context.spaceCount ? context.spaceCount > minimum - 1 && enSplitSign.test(content) : context.chars > minimum && cnSplitSign.test(content))
            : (context.spaceCount ? enSplitSign.test(content) : cnSplitSign.test(content))
          
          if (!shouldSend) {
            context.chars += chars
            continue
          }
          
          actionManager.speak(context.cache, {
            isStart: isFirst,
            isEnd: false
          })
          
          if (isFirst && !firstSentenceResolved) {
            firstSentenceResolved = true
            context.firstSpeakSend = true
            resolve()
          } else {
            context.firstSpeakSend = true
          }
          
          context.cache = ''
          context.chars = 0
          context.spaceCount = 0
        }

        if (context.cache.length > 0) {
          actionManager.speak(context.cache, {
            isStart: !context.firstSpeakSend,
            isEnd: true
          })
        } else if (context.firstSpeakSend) {
          actionManager.speak('', {
            isStart: false,
            isEnd: true
          })
        }

        if (!firstSentenceResolved) {
          resolve()
        }
      })()
    })

    await Promise.race([
      firstSentencePromise,
      new Promise<void>((resolve) => setTimeout(resolve, 5000))
    ])

    return 'success'
  }

  startVoiceInput(_callbacks: {
    onFinished: (text: string) => void
    onError: (error: any) => void
  }): void {
    appState.asr.isListening = true
  }

  stopVoiceInput(): void {
    appState.asr.isListening = false
  }

  interrupt(): void {
    if (!appState.avatar.instance) return

    actionManager.reset()
    appState.avatar.instance.interactiveidle?.()
    avatarState.value = 'interactive_idle'
  }
}

export const appStore = new AppStore()
