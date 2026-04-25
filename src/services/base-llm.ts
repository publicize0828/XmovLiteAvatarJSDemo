import type { LlmConfig } from '../types'

/**
 * LLM服务抽象基类
 * 定义所有LLM服务必须实现的接口，确保不同LLM服务具有统一的调用方式
 */
export abstract class BaseLlmService {

  /**
   * 初始化LLM客户端
   * @param config - LLM配置对象
   * @returns void
   */
  protected abstract initClient(config: LlmConfig): void

  /**
   * 发送消息到LLM服务
   * @param config - LLM配置对象
   * @param userMessage - 用户输入的消息内容
   * @returns Promise<string | null> - 返回模型的回复内容，失败时返回null
   */
  abstract sendMessage(config: LlmConfig, userMessage: string): Promise<string | null>

  /**
   * 流式发送消息到LLM服务
   * @param config - LLM配置对象
   * @param userMessage - 用户输入的消息内容
   * @returns Promise<AsyncIterable<string>> - 返回异步可迭代的字符串流
   */
  abstract sendMessageWithStream(config: LlmConfig, userMessage: string): Promise<AsyncIterable<string>>

  /**
   * 测试LLM连接是否正常
   * @param config - LLM配置对象
   * @returns Promise<boolean> - 返回连接是否成功
   */
  abstract testConnection(config: LlmConfig): Promise<boolean>

  /**
   * 断开LLM连接
   * @returns void
   */
  abstract disconnect(): void
}