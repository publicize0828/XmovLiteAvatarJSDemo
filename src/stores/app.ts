import { reactive, ref, watch } from 'vue'
import type { AppState } from '../types'
import { LLM_CONFIG } from '../constants'
import { validateConfig } from '../utils'
import { avatarService } from '../services/avatar'
import { llmService } from '../services/llm'
import { ActionManager } from '../services/action-manager'

// 应用状态
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
    apiKey: ''
  },
  ui: {
    text: '',
    subTitleText: ''
  }
})

// 中文标点符号正则
const cnSplitSign = /[。？！；… ，：]/
// 英文标点符号正则
const enSplitSign = /[.?!;:,]/

// 虚拟人状态
export const avatarState = ref('')

const avatarInstance = ref<any>(null)

// 用于等待 onVoiceStateChange 'end' 状态的 Promise 解析器
let voiceEndResolver: (() => void) | null = null

const actionManager = new ActionManager({
  instanceRef: avatarInstance,
  onVoiceReady: () => {
    avatarState.value = 'speak'
  },
  onVoiceEnd: () => {
    avatarState.value = 'interactive_idle'
  }
})

// Store类 - 业务逻辑处理
export class AppStore {
  /**
   * 连接虚拟人
   * @returns {Promise<void>} - 返回连接结果的Promise
   * @throws {Error} - 当appId或appSecret为空或连接失败时抛出错误
   */
  async connectAvatar(): Promise<void> {
    const { appId, appSecret } = appState.avatar
    
    if (!validateConfig({ appId, appSecret }, ['appId', 'appSecret'])) {
      throw new Error('appId 或 appSecret 为空')
    }

    try {
      const avatar = await avatarService.connect({
        appId,
        appSecret
      }, {
        onSubtitleOn: (text: string) => {
          appState.ui.subTitleText = text
        },
        onSubtitleOff: () => {
          appState.ui.subTitleText = ''
        },
        onStateChange: (state: string) => {
          avatarState.value = state
        },
        onVoiceStateChange: (status: string) => {
          // 当 onVoiceStateChange 抛出 'end' 时，表示数字人停止说话
          if (status === 'end') {
            console.log('onVoiceStateChange: 数字人停止说话 (end)')
            avatarState.value = 'interactive_idle'
            // 如果有等待中的 Promise，解析它
            if (voiceEndResolver) {
              voiceEndResolver()
              voiceEndResolver = null
            }
          }
        }
      })

      appState.avatar.instance = avatar
      avatarInstance.value = avatar
      appState.avatar.connected = true
    } catch (error) {
      appState.avatar.connected = false
      throw error
    }
  }

  /**
   * 断开虚拟人连接
   * @returns {void}
   */
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

  /**
   * 等待虚拟人停止说话
   * 通过 onVoiceStateChange 抛出的 'end' 判断数字人停止说话
   * @param timeout - 超时时间（毫秒），默认 5000ms
   * @returns {Promise<void>} - 返回等待完成的Promise
   */
  private async waitForAvatarIdle(timeout: number = 5000): Promise<void> {
    // 如果已经是空闲状态，直接返回
    if (avatarState.value === 'interactive_idle' || avatarState.value === '') {
      return
    }

    return new Promise((resolve, reject) => {
      let resolved = false
      
      // 设置 Promise 解析器，等待 onVoiceStateChange 的 'end' 状态
      voiceEndResolver = () => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeoutId)
          resolve()
        }
      }

      // 同时使用 watch 监听状态变化作为备用方案
      const stopWatcher = watch(avatarState, (newState) => {
        if ((newState === 'interactive_idle' || newState === '') && !resolved) {
          resolved = true
          stopWatcher()
          voiceEndResolver = null
          clearTimeout(timeoutId)
          resolve()
        }
      }, { immediate: false })

      // 设置超时
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true
          stopWatcher()
          voiceEndResolver = null
          reject(new Error('等待虚拟人停止说话超时'))
        }
      }, timeout)

      // 立即检查一次状态（可能在 watch 设置之前状态已经变化）
      if (avatarState.value === 'interactive_idle' || avatarState.value === '') {
        if (!resolved) {
          resolved = true
          stopWatcher()
          voiceEndResolver = null
          clearTimeout(timeoutId)
          resolve()
        }
      }
    })
  }

  /**
   * 发送消息到LLM并让虚拟人播报
   * @returns {Promise<string | undefined>} - 返回大语言模型的回复内容，失败时返回undefined
   * @throws {Error} - 当发送消息失败时抛出错误
   */
  async sendMessage(): Promise<string | undefined> {
    const { llm, ui, avatar } = appState
    if (!validateConfig(llm, ['apiKey']) || !ui.text || !avatar.instance) {
      return
    }

    try {
      // 如果数字人正在说话，先打断并等待停止
      console.log('数字人正在说话，先打断...')
      await this.interrupt()
      if (avatarState.value === 'speak') {
        
        // 等待数字人停止说话（通过 onStateChange 抛出的 end 判断）
        try {
          await this.waitForAvatarIdle()
          console.log('数字人已停止说话，继续发送消息')
        } catch (error) {
          console.warn('等待数字人停止说话超时，继续发送:', error)
          // 即使超时也继续发送，避免阻塞
        }
      }

      actionManager.reset()
      // 发送到LLM获取回复
      const stream = await llmService.sendMessageWithStream({
        provider: 'openai',
        model: llm.model,
        apiKey: llm.apiKey
      }, ui.text)

      if (!stream) return

      // 移除 think 调用以提升响应速度
      // await this.waitForAvatarReady()

      // 缓存一定数量文本再进行 speak 调用，采用如下策略：
      // 1. 持续缓存字符直到遇到任意标点符号，检查【缓存的可读字符是否 >= minimum】
      //   1.1 如果是，将缓存组装为 ssml 并调用 speak
      //   1.2 如果否，继续缓存
      // 2. 将【汉字、英文字母、阿拉伯数字】视为【可读字符】进行匹配
      const minimum = 20
      const context = {
        /** 缓存文本 */
        cache: '',
        /** 缓存的可读字符数 */
        chars: 0,
        /** 是否已经发送过首句 */
        firstSpeakSend: false,
        /** 缓存的空格数 */
        spaceCount: 0
      }

      // 创建一个 Promise，在第一句发送后立即 resolve
      let firstSentenceResolved = false
      const firstSentencePromise = new Promise<void>((resolve) => {
        // 在后台继续处理流式数据
        ;(async () => {
          try {
            // 流式播报响应内容
            for await (const content of stream) {
              if (typeof content !== 'string') continue // 防御编程
              
              context.cache += content // 将该段文本加入缓存

              // 英文以空格开头加一个计数器做分割推送
              if (content.startsWith(' ')) {
                context.spaceCount += 1
              }
              
              const chars = content.match(/[\u4e00-\u9fa5a-zA-Z0-9]/g)?.length ?? 0 // 统计段内可读字符数
              let shouldSend = false
              
              if (!context.firstSpeakSend) {
                // 首句：需要达到最小字符数且遇到标点符号
                shouldSend = context.spaceCount
                  ? context.spaceCount > minimum - 1 && enSplitSign.test(content)
                  : context.chars > minimum && cnSplitSign.test(content)
              } else {
                // 后续句子：遇到标点符号即可发送
                shouldSend = context.spaceCount ? enSplitSign.test(content) : cnSplitSign.test(content)
              }
              
              if (!shouldSend) {
                context.chars += chars
                continue
              }
              
              // 发送缓存的文本
              actionManager.speak(context.cache, {
                isStart: !context.firstSpeakSend,
                isEnd: false
              })
              
              // 如果是第一句，立即 resolve Promise，让 sendMessage 返回
              if (!context.firstSpeakSend && !firstSentenceResolved) {
                firstSentenceResolved = true
                context.firstSpeakSend = true
                resolve() // 第一句发送后立即返回成功信号
              } else if (context.firstSpeakSend) {
                context.firstSpeakSend = true
              }
              
              context.cache = ''
              context.chars = 0
              context.spaceCount = 0
            }

            // 处理剩余的缓存文本
            if (context.cache.length > 0) {
              actionManager.speak(context.cache, {
                isStart: !context.firstSpeakSend,
                isEnd: true
              })
            } else if (context.firstSpeakSend) {
              // 如果已经发送过内容但没有剩余文本，发送结束标记
              actionManager.speak('', {
                isStart: false,
                isEnd: true
              })
            }
          } catch (error) {
            console.error('流式处理错误:', error)
            // 如果第一句还没发送就出错了，也要 resolve
            if (!firstSentenceResolved) {
              firstSentenceResolved = true
              resolve()
            }
          }
        })()
      })

      // 等待第一句发送完成，然后立即返回
      await firstSentencePromise
      return 'success'
    } catch (error) {
      console.error('发送消息失败:', error)
      throw error
    }
  }

  /**
   * 开始语音输入
   * @param _callbacks - 回调函数集合（ASR逻辑由组件处理，此参数保留用于接口兼容性）
   * @param _callbacks.onFinished - 语音识别完成回调
   * @param _callbacks.onError - 语音识别错误回调
   * @returns {void}
   */
  startVoiceInput(_callbacks: {
    onFinished: (text: string) => void
    onError: (error: any) => void
  }): void {
    appState.asr.isListening = true
    // ASR逻辑由组件处理
  }

  /**
   * 停止语音输入
   * @returns {void}
   */
  stopVoiceInput(): void {
    appState.asr.isListening = false
  }

  /**
   * 打断虚拟人说话
   * @returns {void}
   */
  interrupt(): void {
    if (!appState.avatar.instance) {
      return
    }

    try {
      // 重置动作管理器队列
      actionManager.reset()
      
      // 调用虚拟人实例的打断方法
      // SDK 的 interactive_idle() 方法用于打断当前说话
      // SDK 会通过 onStateChange 回调通知状态变化为 'interactive_idle'
      if (typeof appState.avatar.instance.interactiveidle === 'function') {
        appState.avatar.instance.interactiveidle()
        console.log('已调用 interactive_idle() 打断方法，等待 SDK 通过 onStateChange 回调更新状态')
      } else {
        console.warn('interactive_idle() 方法不存在，尝试其他打断方法')
        // 备用方案：尝试其他可能的打断方法
        if (typeof appState.avatar.instance.interrupt === 'function') {
          appState.avatar.instance.interrupt()
        }
      }
    } catch (error) {
      console.error('打断失败:', error)
      // 如果打断失败，直接设置状态为交互空闲，确保逻辑继续执行
      avatarState.value = 'interactive_idle'
    }
  }
}

// 导出单例
export const appStore = new AppStore()
