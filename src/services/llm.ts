import type { LlmConfig } from '../types'
import { openaiLlmService } from './openai-llm'
import { cozeLlmService } from './coze-llm'
import { BaseLlmService } from './base-llm'

/**
 * LLM服务映射表
 * 根据provider名称映射到对应的服务实例
 */
const llmServices: Record<string, BaseLlmService> = {
  openai: openaiLlmService,
  coze: cozeLlmService,
}

/**
 * LLM服务工厂类
 * 提供统一的LLM服务调用入口，根据配置选择不同的LLM服务实现
 */
export class LlmService {
  /**
   * 根据配置获取对应的LLM服务实例
   * @param config - LLM配置对象
   * @returns BaseLlmService - 返回对应的LLM服务实例
   * @throws {Error} - 当provider不支持时抛出错误
   */
  private getService(config: LlmConfig): BaseLlmService {
    const service = llmServices[config.provider]
    if (!service) {
      console.error(`不支持的LLM服务提供商: ${config.provider}`)
      throw new Error(`不支持的LLM服务提供商: ${config.provider}`)
    }
    console.log(`选择LLM服务提供商: ${config.provider}`)
    return service
  }

  /**
   * 发送消息到大语言模型
   * @param config - LLM配置对象
   * @param userMessage - 用户输入的消息内容
   * @returns Promise<string | null> - 返回模型的回复内容，失败时返回null
   * @throws {Error} - 当LLM客户端未初始化或请求失败时抛出错误
   */
  async sendMessage(config: LlmConfig, userMessage: string): Promise<string | null> {
    try {
      console.log('调用LLM服务发送消息', {
        provider: config.provider,
        model: config.model,
        messageLength: userMessage.length
      })
      
      const service = this.getService(config)
      const result = await service.sendMessage(config, userMessage)
      
      return result
    } catch (error) {
      console.error('LLM服务发送消息失败', error as Error, {
        provider: config.provider,
        model: config.model
      })
      throw error
    }
  }

  /**
   * 流式发送消息到大语言模型
   * @param config - LLM配置对象
   * @param userMessage - 用户输入的消息内容
   * @returns Promise<AsyncIterable<string>> - 返回异步可迭代的字符串流
   * @throws {Error} - 当LLM客户端未初始化或请求失败时抛出错误
   */
  async sendMessageWithStream(config: LlmConfig, userMessage: string): Promise<AsyncIterable<string>> {
    try {
      console.log('调用LLM服务发送流式消息', {
        provider: config.provider,
        model: config.model,
        messageLength: userMessage.length
      })
      
      const service = this.getService(config)
      const stream = await service.sendMessageWithStream(config, userMessage)
      
      return stream
    } catch (error) {
      console.error('LLM服务发送流式消息失败', error as Error, {
        provider: config.provider,
        model: config.model
      })
      throw error
    }
  }

  /**
   * 测试LLM连接是否正常
   * @param config - LLM配置对象
   * @returns Promise<boolean> - 返回连接是否成功
   * @throws {Error} - 当LLM客户端未初始化或请求失败时抛出错误
   */
  async testConnection(config: LlmConfig): Promise<boolean> {
    try {
      console.log('测试LLM服务连接', {
        provider: config.provider,
        model: config.model
      })
      
      const service = this.getService(config)
      const result = await service.testConnection(config)
      
      return result
    } catch (error) {
      console.error('LLM服务连接测试失败', error as Error, {
        provider: config.provider,
        model: config.model
      })
      throw error
    }
  }

  /**
   * 断开LLM连接
   * @param config - LLM配置对象（可选，用于指定要断开的服务）
   * @returns void
   */
  disconnect(config?: LlmConfig): void {
    if (config) {
      // 断开指定服务的连接
      console.log('断开指定LLM服务连接', {
        provider: config.provider
      })
      const service = this.getService(config)
      service.disconnect()
    } else {
      // 断开所有服务的连接
      console.log('断开所有LLM服务连接')
      Object.values(llmServices).forEach(service => service.disconnect())
    }
  }
}

/**
 * LLM服务单例实例
 * 提供统一的LLM服务调用入口
 */
export const llmService = new LlmService()