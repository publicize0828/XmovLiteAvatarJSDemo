import { CozeAPI } from '@coze/api'
import type { LlmConfig, ChatMessage } from '../types'
import { LLM_CONFIG } from '../constants'
import { BaseLlmService } from './base-llm'

/**
 * Coze大语言模型服务
 * 提供与Coze平台的对接功能，支持同步和流式消息发送
 */
export class CozeLlmService extends BaseLlmService {
  private coze: CozeAPI | null = null
  private currentApiKey: string = ''
  private currentBaseUrl: string = ''

  /**
   * 初始化Coze客户端
   * @param config - Coze配置对象
   * @returns void
   */
  protected initClient(config: LlmConfig): void {
    if (this.currentApiKey === config.apiKey && this.currentBaseUrl === (config.baseURL || LLM_CONFIG.COZE_BASE_URL) && this.coze) {
      // 已经初始化过相同配置的客户端
      return
    }

    console.log('初始化Coze客户端', { model: config.model })

    const baseURL = config.baseURL || LLM_CONFIG.COZE_BASE_URL
    this.coze = new CozeAPI({
      token: config.apiKey,
      baseURL: baseURL,
      // 浏览器环境配置
      allowPersonalAccessTokenInBrowser: true,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.currentApiKey = config.apiKey
    this.currentBaseUrl = baseURL
  }

  /**
   * 发送消息到Coze平台
   * @param config - LLM配置对象
   * @param userMessage - 用户输入的消息内容
   * @returns Promise<string | null> - 返回模型的回复内容，失败时返回null
   * @throws {Error} - 当客户端未初始化或请求失败时抛出错误
   */
  async sendMessage(config: LlmConfig, userMessage: string): Promise<string | null> {
    this.initClient(config)

    if (!this.coze) {
      throw new Error('Coze客户端未初始化')
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: LLM_CONFIG.SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
    ]

    try {
      console.log('发送Coze请求', { model: config.model, message: userMessage })

      // 验证bot_id是否有效
      if (!config.botId || config.botId.trim() === '') {
        throw new Error('无效的bot_id，请检查模型配置')
      }

      // 使用Coze API正确的参数名和格式
      const chatParams = {
        bot_id: config.botId,
        user_id: 'default-user',
        additional_messages: messages.map(msg => ({
          content: msg.content,
          content_type: 'text',
          role: msg.role,
          type: msg.role === 'user' ? 'question' : 'answer'
        })),
        stream: false
      }

      const completion = await this.coze.chat.create(chatParams)

      const response = completion.content
      console.log('Coze响应', { response: response?.substring(0, 100) + (response?.length > 100 ? '...' : '') })

      return response || null
    } catch (error) {
      console.error('Coze请求失败', error as Error, { model: config.model })
      if (error instanceof Error) {
        if ('status' in (error as any) && 'message' in (error as any)) {
          const apiError = error as any
          throw new Error(`Coze API错误 [${apiError.status}]: ${apiError.message}`)
        }
        throw new Error(`Coze请求失败: ${error.message}`)
      }
      throw new Error('Coze请求失败: 未知错误')
    }
  }

  /**
   * 流式发送消息到Coze平台
   * @param config - LLM配置对象
   * @param userMessage - 用户输入的消息内容
   * @returns Promise<AsyncIterable<string>> - 返回异步可迭代的字符串流
   * @throws {Error} - 当客户端未初始化或请求失败时抛出错误
   */
  async sendMessageWithStream(config: LlmConfig, userMessage: string): Promise<AsyncIterable<string>> {
    this.initClient(config)

    if (!this.coze) {
      throw new Error('Coze客户端未初始化')
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: LLM_CONFIG.SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
    ]

    try {
      console.log('发送Coze流式请求', {
        model: config.model,
        stream: true,
        message: userMessage
      })

      // 使用Coze API正确的参数名和格式
      const chatParams = {
        bot_id: config.botId,
        user_id: 'default-user',
        additional_messages: messages.map(msg => ({
          content: msg.content,
          content_type: 'text',
          role: msg.role,
          type: msg.role === 'user' ? 'question' : 'answer'
        })),
        stream: true
      }

      const stream = await this.coze.chat.stream(chatParams)

      console.log('Coze流式请求已创建，开始接收数据')

      return (async function* () {
        try {
          for await (const part of stream) {
            // 定义期望的消息类型
            const EXPECTED_TYPE = 'conversation.message.delta'
            
            // 检查part.type是否为期望类型
            const partType = part.event
            
            // 边界情况处理：part.type为null、undefined或非字符串
            if (typeof partType !== 'string') {
              continue
            }
            
            // 仅处理期望类型的数据
            if (partType !== EXPECTED_TYPE) {
              continue
            }
            
            // 确保part和part.data存在
            if (!part || !part.data) {
              console.warn(`Coze流式数据格式异常，缺少data字段`, part)
              continue
            }
            
            let content = part.data.content
            
            // 检查content是否为字符串
            if (content && typeof content === 'string') {
              // 过滤掉空字符串和特殊结束信号
              if (content.trim()) {
                yield content
              }
            } 
            // 处理JSON格式的content
            else if (typeof content === 'object' && content !== null) {
              console.warn(`Coze流式数据返回了对象格式，非预期`, content)
            } 
          }
        } catch (streamError) {
          console.error('Coze流式请求数据接收失败', streamError as Error)
          if (streamError instanceof Error) {
            throw new Error(`Coze流式数据接收失败: ${streamError.message}`)
          }
          throw new Error('Coze流式数据接收失败: 未知错误')
        }
      })()
    } catch (error) {
      console.error('Coze流式请求失败', error as Error, { model: config.model })
      if (error instanceof Error) {
        if ('status' in (error as any) && 'message' in (error as any)) {
          const apiError = error as any
          throw new Error(`Coze API错误 [${apiError.status}]: ${apiError.message}`)
        }
        throw new Error(`Coze流式请求失败: ${error.message}`)
      }
      throw new Error('Coze流式请求失败: 未知错误')
    }
  }

  /**
   * 测试LLM连接是否正常
   * @param config - LLM配置对象
   * @returns Promise<boolean> - 返回连接是否成功
   */
  async testConnection(config: LlmConfig): Promise<boolean> {
    this.initClient(config)
    
    if (!this.coze) {
      throw new Error('Coze客户端未初始化')
    }

    // 发送一个简单的测试请求
    const messages: ChatMessage[] = [
      { role: 'system', content: '你是一个测试助手，只需要返回"success"即可。' },
      { role: 'user', content: '测试连接' }
    ]

    console.log('测试Coze连接', { 
      baseURL: config.baseURL || LLM_CONFIG.COZE_BASE_URL,
      model: config.model 
    })

    try {
      // 验证bot_id是否有效
      if (!config.botId || config.botId.trim() === '') {
        throw new Error('无效的bot_id，请检查模型配置')
      }

      const chatParams = {
        bot_id: config.botId,
        user_id: 'default-user',
        additional_messages: messages.map(msg => ({
          content: msg.content,
          content_type: 'text',
          role: msg.role,
          type: msg.role === 'user' ? 'question' : 'answer'
        })),
        stream: false,
        max_tokens: 10
      }

      const completion = await this.coze.chat.create(chatParams)
      console.log('Coze连接测试响应', { response: completion.content })
      return true
    } catch (error) {
      console.error('Coze连接测试失败', error as Error, { model: config.model })
      throw error
    }
  }

  /**
   * 断开LLM连接
   * @returns void
   */
  disconnect(): void {
    this.coze = null
    this.currentApiKey = ''
    this.currentBaseUrl = ''
    console.log('Coze连接已断开')
  }
}

/**
 * Coze服务单例实例
 */
export const cozeLlmService = new CozeLlmService()
