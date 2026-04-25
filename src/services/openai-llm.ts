import OpenAI from 'openai'
import type { LlmConfig, ChatMessage } from '../types'
import { LLM_CONFIG } from '../constants'
import { BaseLlmService } from './base-llm'

/**
 * OpenAI大语言模型服务
 * 提供与OpenAI平台的对接功能，支持同步和流式消息发送
 */
export class OpenaiLlmService extends BaseLlmService {
  private openai: OpenAI | null = null
  private currentApiKey: string = ''

  /**
   * 初始化OpenAI客户端
   * @param config - LLM配置对象
   * @returns void
   */
  protected initClient(config: LlmConfig): void {
    if (this.currentApiKey === config.apiKey && this.openai) {
      return
    }

    const baseURL = config.baseURL || LLM_CONFIG.BASE_URL
    console.log('初始化OpenAI客户端', { baseURL, model: config.model })

    this.openai = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true,
      baseURL: baseURL,
      // 确保使用 fetch API 支持流式
      fetch: (url, init) => {
        return fetch(url, init)
      }
    })
    
    this.currentApiKey = config.apiKey
  }

  /**
   * 发送消息到OpenAI
   * @param config - LLM配置对象
   * @param userMessage - 用户输入的消息内容
   * @returns Promise<string | null> - 返回模型的回复内容，失败时返回null
   * @throws {Error} - 当LLM客户端未初始化或请求失败时抛出错误
   */
  async sendMessage(config: LlmConfig, userMessage: string): Promise<string | null> {
    this.initClient(config)
    
    if (!this.openai) {
      throw new Error('OpenAI客户端未初始化')
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: LLM_CONFIG.SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
    ]

    try {
      console.log('发送OpenAI请求', { model: config.model, message: userMessage })
      
      const completion = await this.openai.chat.completions.create({
        messages,
        model: config.model
      })

      const response = completion.choices[0]?.message?.content
      console.log('OpenAI响应', { response: response?.substring(0, 100) + (response?.length > 100 ? '...' : '') })
      
      return response || null
    } catch (error) {
      console.error('OpenAI请求失败', error as Error, { model: config.model })
      throw error
    }
  }

  /**
   * 流式发送消息到OpenAI
   * @param config - LLM配置对象
   * @param userMessage - 用户输入的消息内容
   * @returns Promise<AsyncIterable<string>> - 返回异步可迭代的字符串流
   * @throws {Error} - 当LLM客户端未初始化或请求失败时抛出错误
   */
  async sendMessageWithStream(config: LlmConfig, userMessage: string): Promise<AsyncIterable<string>> {
    this.initClient(config)
    
    if (!this.openai) {
      throw new Error('OpenAI客户端未初始化')
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: LLM_CONFIG.SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
    ]

    console.log('发送OpenAI流式请求', { 
      baseURL: config.baseURL || LLM_CONFIG.BASE_URL,
      model: config.model, 
      stream: true,
      message: userMessage 
    })

    try {
      const stream = await this.openai.chat.completions.create({
        messages,
        model: config.model,
        stream: true
      })

      console.log('OpenAI流式请求已创建，开始接收数据')

      return (async function* () {
        try {
          for await (const part of stream) {
            const content = part.choices[0]?.delta?.content
            if (content) {
              yield content
            }
          }
        } catch (streamError) {
          console.error('OpenAI流式数据接收失败', streamError as Error)
          throw streamError
        }
      })()
    } catch (error) {
      console.error('OpenAI流式请求失败', error as Error, { model: config.model })
      throw error
    }
  }

  /**
   * 测试OpenAI连接是否正常
   * @param config - LLM配置对象
   * @returns Promise<boolean> - 返回连接是否成功
   * @throws {Error} - 当LLM客户端未初始化或请求失败时抛出错误
   */
  async testConnection(config: LlmConfig): Promise<boolean> {
    this.initClient(config)
    
    if (!this.openai) {
      throw new Error('OpenAI客户端未初始化')
    }

    // 发送一个简单的测试请求
    const messages: ChatMessage[] = [
      { role: 'system', content: '你是一个测试助手，只需要返回"success"即可。' },
      { role: 'user', content: '测试连接' }
    ]

    console.log('测试OpenAI连接', { 
      baseURL: config.baseURL || LLM_CONFIG.BASE_URL,
      model: config.model 
    })

    try {
      const completion = await this.openai.chat.completions.create({
        messages,
        model: config.model,
        max_tokens: 10
      })

      const response = completion.choices[0]?.message?.content
      console.log('OpenAI连接测试响应', { response })
      return true
    } catch (error) {
      console.error('OpenAI连接测试失败', error as Error, { model: config.model })
      throw error
    }
  }

  /**
   * 断开OpenAI连接
   * @returns void
   */
  disconnect(): void {
    this.openai = null
    this.currentApiKey = ''
    console.log('OpenAI连接已断开')
  }
}

/**
 * OpenAI服务单例实例
 */
export const openaiLlmService = new OpenaiLlmService()