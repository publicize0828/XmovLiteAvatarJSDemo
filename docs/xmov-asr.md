# XMOV ASR 实时语音识别对接文档

## 1. 服务概述

XMOV ASR 是基于 WebSocket 的流式中文语音识别服务，支持边录音边返回识别结果，包含中间结果（partial）和一句话最终结果（final）。

本仓库内的接入位置：

- 协议核心：`src/shared/lib/modules/xmov-speech-recognizer.ts`
- 独立麦克风接入：`src/shared/lib/hooks/use-xmov-asr.ts`
- 瓦力（Walle）数字人模式接入：`src/shared/lib/modules/walle.ts`

## 2. 对接流程总览

1. 向服务方申请 `app_id` 和 `secret_key`。
2. 生成带签名的 WebSocket 地址。
3. 建立 WebSocket 连接，等待服务端返回鉴权成功消息（`code = 10020000`）。
4. 发送 `signal: start` 开始识别。
5. 持续发送 16kHz / 16bit 单声道 PCM 音频帧（二进制）。
6. 接收 `partial_result` / `final_result` 识别结果。
7. 发送 `signal: end` 结束识别，然后关闭连接。

## 3. 鉴权与连接地址

### 3.1 鉴权参数

请求地址格式：

```text
wss://test-asr-api.xmov.ai/ws/asr/?app_id=xxx&timestamp=xxx&signature=xxx
```

签名算法：

1. 取当前 Unix 秒级时间戳：`timestamp = floor(Date.now() / 1000)`。
2. 将参数 `app_id`、`timestamp` 按键名升序排列后拼接成待签名字符串：

   ```text
   app_id=xxx&timestamp=xxx
   ```

3. 用 `secret_key` 对待签名字符串做 HMAC-SHA1，再对结果做 Base64 编码：

   ```text
   signature = Base64(HMAC-SHA1(secret_key, "app_id=xxx&timestamp=xxx"))
   ```

4. 将 `signature` 拼到 URL 上，并对签名值做 URL 编码（`+`、`/`、`=` 等字符需要编码）。

若 `app_id` 包含特殊字符，待签名字符串和最终 URL 都应使用 URL 编码后的值；当前默认 `app_id` 为纯数字，不涉及该问题。

### 3.2 代码示例

TypeScript / Node.js：

```ts
import { createHmac } from 'node:crypto'

function buildAsrUrl(origin: string, appId: string, secretKey: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signStr = `app_id=${appId}&timestamp=${timestamp}`
  const signature = createHmac('sha1', secretKey).update(signStr).digest('base64')
  return `${origin}?app_id=${encodeURIComponent(appId)}&timestamp=${timestamp}&signature=${encodeURIComponent(signature)}`
}
```

Python：

```python
import base64
import hashlib
import hmac
import time
import urllib.parse

def build_asr_url(origin: str, app_id: str, secret_key: str) -> str:
    timestamp = str(int(time.time()))
    sign_str = f"app_id={app_id}&timestamp={timestamp}"
    signature = base64.b64encode(
        hmac.new(secret_key.encode(), sign_str.encode(), hashlib.sha1).digest()
    ).decode()
    return (
        f"{origin}?app_id={app_id}&timestamp={timestamp}"
        f"&signature={urllib.parse.quote(signature, safe='')}"
    )
```

## 4. WebSocket 消息协议

### 4.1 服务端 -> 客户端

文本消息，JSON 格式。

| 消息 | 说明 |
| --- | --- |
| `{"code": 10020000, "session_id": "xxx"}` | 鉴权成功，`session_id` 为本次识别会话 ID |
| `{"code": <其他值>, "message": "..."}` | 鉴权或业务错误，应关闭连接 |
| `{"type": "partial_result", "text": "..."}` | 中间识别结果，实时变化 |
| `{"type": "final_result", "text": "..."}` | 一句话最终结果 |

鉴权成功消息是连接建立后服务端返回的第一条消息。客户端必须在收到该消息后才能发送 `start` 和音频数据。

### 4.2 客户端 -> 服务端

| 方向消息 | 格式 | 说明 |
| --- | --- | --- |
| 开始识别 | `{"signal": "start", "hotword_list": []}` | `hotword_list` 为热词数组，可为空数组 |
| 音频数据 | 二进制 `ArrayBuffer` | 16kHz / 16bit / 单声道 PCM 帧 |
| 结束识别 | `{"signal": "end"}` | 服务端返回最终结果后发送，随后关闭连接 |

### 4.3 时序示例

```text
Client                              Server
  |--- wss URL（带签名）-------------->|
  |<--- {code: 10020000, session_id} --|
  |--- {signal: "start"} ------------->|
  |--- [PCM binary frame] ------------>|
  |--- [PCM binary frame] ------------>|
  |<--- {type: "partial_result"} ------|
  |<--- {type: "final_result"} --------|
  |--- {signal: "end"} --------------->|
  |<--- close -------------------------|
```

## 5. 音频格式

| 项目 | 要求 |
| --- | --- |
| 采样率 | 16000 Hz |
| 位深 | 16 bit PCM |
| 声道 | 单声道 |
| 帧间隔 | 约 250ms 一帧（`@xmov/web-recorder` 默认 `interval: 0.25`） |
| 发送方式 | WebSocket `send(ArrayBuffer)` 直接发送二进制 |

本仓库通过 `@xmov/web-recorder` 采集麦克风音频，并在 AudioWorklet 内完成 16kHz 降采样和 16bit PCM 转换后回调 `audioCallback(audioData, ...)`。

## 6. SDK 事件说明

`xmov-speech-recognizer.ts` 提供以下回调，接入方可直接复用这套事件模型：

| 事件 | 触发时机 | 回调数据 |
| --- | --- | --- |
| `OnSocketOpen` | WebSocket 打开 | 原始 open 事件 |
| `OnRecognitionStart` | 收到鉴权成功并发送 `start` 后 | 鉴权响应（含 `session_id`） |
| `OnSentenceBegin` | 预留的一句话开始事件 | 响应对象 |
| `OnRecognitionResultChange` | 收到 `partial_result` | `{ sentence, type: "partial_result" }` |
| `OnSentenceEnd` | 收到 `final_result` | `{ sentence, session_id }` |
| `OnRecognitionComplete` | `stop()` 发送 `end` 后 | `{ code: 0, reason: "end" }` |
| `OnError` | 任意错误 | `{ code, message }` 或异常信息 |
| `OnClose` | 正常关闭 | close 事件 |

注意：SDK 在中间结果展示时会把已收到的 partial 文本拼接在前面，避免界面文字跳动；收到 `final_result` 后清空缓存。该拼接属于客户端展示行为，服务端文本以 `type` 字段区分。

## 7. 配置项

本仓库通过 `getMetaEnv` 读取配置，优先级为 Electron 的 `xmov_config.json` > `public/env.config.js` > `import.meta.env`。

| 配置项 | 说明 | 默认值 |
| --- | --- | --- |
| `XMOV_WALLE_ASR_MODE` | 瓦力模式下 ASR 来源：`xmov` 使用本协议，`walle` 使用瓦力内置 ASR | 空（内置） |
| `XMOV_WALLE_ASR_BASE_URL` | 瓦力模式下 XMOV ASR 服务地址 | `wss://test-asr-api.xmov.ai/ws/asr/` |
| `XMOV_WALLE_ASR_APP_ID` | 瓦力模式下应用 ID | `2` |
| `XMOV_WALLE_ASR_SECRET_KEY` | 瓦力模式下密钥 | `123456789` |
| `XMOV_WALLE_ASR_HOT_WORD_LIST` | 瓦力模式下热词列表 | `[]` |
| `XMOV_ASR_BASE_URL` | 独立接入时服务地址 | 同上 |
| `XMOV_ASR_APP_ID` | 独立接入时应用 ID | 同上 |
| `XMOV_ASR_SECRET_KEY` | 独立接入时密钥 | 同上 |
| `XMOV_ASR_HOT_WORD_LIST` | 独立接入时热词列表 | `[]` |
| `XMOV_ASR_KEYWORD_MAP` | 客户端结果关键词替换映射（JSON 对象） | `{}` |

示例（`public/env.config.js` 或 `xmov_config.json`）：

```json
{
  "XMOV_WALLE_ASR_MODE": "xmov",
  "XMOV_WALLE_ASR_BASE_URL": "wss://test-asr-api.xmov.ai/ws/asr/",
  "XMOV_WALLE_ASR_APP_ID": "2",
  "XMOV_WALLE_ASR_SECRET_KEY": "123456789",
  "XMOV_WALLE_ASR_HOT_WORD_LIST": ["小明", "灯"]
}
```

关键词替换示例：

```json
{
  "XMOV_ASR_KEYWORD_MAP": {
    "灯开": "开灯",
    "关灯了": "关灯"
  }
}
```

## 8. 错误码

| 错误码 | 含义 |
| --- | --- |
| `10020000` | 鉴权成功（非错误码） |
| `10400` | 当前环境不支持 WebSocket |
| `10401` | 缺少 `app_id` / `secret_key`，或连接未建立就发送数据 |
| `10403` | 识别未结束，连接被关闭 |
| `10500` | 服务端返回数据 JSON 解析失败 |
| `10501` | 服务端返回非 `10020000` 的业务错误，`message` 为服务端错误描述 |

## 9. 最小接入示例（TypeScript）

```ts
import { createHmac } from 'node:crypto'

interface AsrOptions {
  origin: string
  appId: string
  secretKey: string
  hotwordList?: string[]
  onResultChange?: (text: string) => void
  onResultEnd?: (text: string) => void
  onError?: (error: any) => void
}

export class XmovAsrClient {
  private socket: WebSocket | null = null
  private sessionId = ''
  private authed = false

  constructor(private options: AsrOptions) {}

  start() {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const signStr = `app_id=${this.options.appId}&timestamp=${timestamp}`
    const signature = createHmac('sha1', this.options.secretKey)
      .update(signStr)
      .digest('base64')
    const url =
      `${this.options.origin}?app_id=${encodeURIComponent(this.options.appId)}` +
      `&timestamp=${timestamp}&signature=${encodeURIComponent(signature)}`

    this.socket = new WebSocket(url)
    this.socket.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.code && msg.code !== 10020000) {
        this.options.onError?.(msg)
        this.socket?.close()
        return
      }
      if (!this.authed) {
        this.authed = true
        // 记录会话 ID，可用于日志和问题排查
        this.sessionId = msg.session_id
        this.socket?.send(
          JSON.stringify({
            signal: 'start',
            hotword_list: this.options.hotwordList || []
          })
        )
        return
      }
      if (msg.type === 'partial_result') {
        this.options.onResultChange?.(msg.text)
      } else if (msg.type === 'final_result') {
        this.options.onResultEnd?.(msg.text)
      }
    }
    this.socket.onerror = () => {
      this.options.onError?.({ code: -1, message: 'websocket error' })
    }
  }

  write(audio: ArrayBuffer) {
    if (this.socket && this.authed && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(audio)
    }
  }

  stop() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ signal: 'end' }))
      setTimeout(() => this.socket?.close(), 300)
    }
  }
}
```

## 10. 对接注意事项

1. 必须在收到 `code = 10020000` 后才能发送 `start` 和音频。
2. `end` 发送后客户端延迟约 300ms 关闭连接，给服务端留出处理时间。
3. 识别未结束时连接断开，客户端会触发 `10403` 错误。
4. 一次连接对应一次识别会话；如需连续识别，可重新建立连接。
5. 服务地址末尾的 `/` 需要保留：`wss://test-asr-api.xmov.ai/ws/asr/`。
6. 测试环境的 `app_id = 2`、`secret_key = 123456789` 仅用于联调，正式环境请使用服务方分配的正式凭证。
