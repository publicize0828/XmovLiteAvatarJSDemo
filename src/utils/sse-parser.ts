export interface EventStreamMessage {
  /** 事件名称 */
  event: string
  /** 事件负载 */
  data: string
}

/** Event Stream 返回解析器 */
export class SSEParser {
  /**
   * 将多行文本解码为事件数组
   * @link https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
   **/
  parse = (text: string) => {
    const lines = text.trim().split('\n')
    const events: EventStreamMessage[] = []
    let currentEvent: EventStreamMessage | null = null
    for (const line of lines) {
      if (!line)
        // 跳过空行
        continue
      // 匹配非注释行（包含冒号且不以冒号开头）
      const match = line.match(/^(?<field>\w+)\s*:\s*(?<value>\S[\s\S]*)$/)
      // 如果未匹配到冒号，则整行都是字段名
      if (!match) {
        currentEvent = { event: line, data: '' }
        events.push(currentEvent)
        continue
      }
      const { field, value } = match.groups as { field: string; value: string }
      // 如果匹配到 field 为 event，则表示声明字段
      if (field === 'event') {
        currentEvent = { event: value, data: '' }
        events.push(currentEvent)
        continue
      }
      // 如果匹配到 field 为 data，则表示赋值字段
      if (field === 'data') {
        // 如果此前没有声明字段，则隐式声明 data 字段并赋值
        if (!currentEvent) events.push({ event: 'data', data: value })
        // 如果此前有声明字段，则对其进行赋值
        else currentEvent.data = value
        currentEvent = null
        continue
      }
    }
    return events
  }

  /** 将 Response 转换为异步可迭代对象，每项为一个消息事件 */
  createChunkIterator = (res: Response) => {
    if (!res.body) throw new Error('body is empty')

    const { parse } = this
    const decoder = new TextDecoder('utf-8')

    return {
      async *[Symbol.asyncIterator]() {
        const reader = res.body!.getReader()
        try {
          for (;;) {
            const { done, value } = await reader.read()
            if (done || !value) break
            const str = decoder.decode(value, { stream: true })
            const messages = parse(str)
            for (let i = 0; i < messages.length; i++) {
              yield messages[i]
            }
          }
        } finally {
          reader.releaseLock()
        }
      }
    }
  }
}

