/**
 * XmovASR SpeechRecognizer 类
 * 适配 xmovASR 3.0 协议的 WebSocket 连接和消息处理
 */

/**
 * XmovASR SpeechRecognizer
 * 用于处理 xmovASR 的 WebSocket 连接和消息
 */
export class XmovSpeechRecognizer {
  public socket: WebSocket | null = null;
  private isSignSuccess = false;
  private isSentenceBegin = false;
  private requestId: string;
  private isLog: boolean;
  private isRecognizeComplete = false;
  private sendCount = 0;
  private getMessageList: string[] = [];

  // 回调函数
  public OnRecognitionStart: (res: any) => void = () => {};
  public OnSentenceBegin: (res: any) => void = () => {};
  public OnRecognitionResultChange: (res: any) => void = () => {};
  public OnSentenceEnd: (res: any) => void = () => {};
  public OnRecognitionComplete: (res: any) => void = () => {};
  public OnError: (res: any) => void = () => {};

  // 连接成功后的回调（用于发送 start 信号）
  public onConnected?: () => void;

  constructor(_query: any, requestId: string, isLog: boolean = false) {
    this.requestId = requestId;
    this.isLog = isLog;
  }

  /**
   * 停止识别
   */
  stop() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      // 发送停止信号
      const stopMessage = {
        signal: "stop",
      };
      this.socket.send(JSON.stringify(stopMessage));
      this.isRecognizeComplete = true;
    } else if (this.socket) {
      this.socket.close();
    }
  }

  /**
   * 启动识别
   */
  async start(wsUrl: string) {
    this.socket = null;
    this.getMessageList = [];

    if ("WebSocket" in window) {
      this.socket = new WebSocket(wsUrl);
    } else {
      if (!("MozWebSocket" in window)) {
        if (this.isLog) {
          console.log(
            this.requestId,
            "浏览器不支持WebSocket",
            "XmovSpeechRecognizer"
          );
        }
        this.OnError("浏览器不支持WebSocket");
        return;
      }
      this.socket = new (window as any).MozWebSocket(wsUrl);
    }

    if (!this.socket) {
      this.OnError("无法创建WebSocket连接");
      return;
    }

    this.socket.onopen = (event) => {
      if (this.isLog) {
        console.log(this.requestId, "连接建立", event, "XmovSpeechRecognizer");
      }
    };

    this.socket.onmessage = async (event) => {
      try {
        this.getMessageList.push(JSON.stringify(event));
        const data = JSON.parse(event.data);

        // 处理连接响应消息（带 code 字段）
        if (data.code !== undefined) {
          // 成功创建 session
          if (data.code === 10020000) {
            if (!this.isSignSuccess) {
              this.OnRecognitionStart(data);
              this.isSignSuccess = true;
              // 触发连接成功回调
              if (this.onConnected) {
                this.onConnected();
              }
            }
            if (this.isLog) {
              console.log(
                this.requestId,
                "连接成功，session_id:",
                data.session_id,
                "XmovSpeechRecognizer"
              );
            }
          } else {
            // 错误消息
            if (this.socket?.readyState === WebSocket.OPEN) {
              this.socket.close();
            }
            if (this.isLog) {
              console.log(
                this.requestId,
                JSON.stringify(data),
                "XmovSpeechRecognizer"
              );
            }
            this.OnError(data);
          }
          return;
        }

        // 处理识别结果消息（带 type 字段）
        if (data.type === "partial_result" || data.type === "final_result") {
          if (data.type === "partial_result") {
            // 部分结果
            this.OnRecognitionResultChange(data);
          } else if (data.type === "final_result") {
            // 最终结果
            if (!this.isSentenceBegin) {
              this.OnSentenceBegin(data);
              this.isSentenceBegin = true;
            }
            this.OnSentenceEnd(data);
            this.OnRecognitionComplete(data);
            this.isRecognizeComplete = true;
          }
          if (this.isLog) {
            console.log(this.requestId, data, "XmovSpeechRecognizer");
          }
          return;
        }

        // 其他消息
        if (this.isLog) {
          console.log(
            this.requestId,
            "其他消息:",
            data,
            "XmovSpeechRecognizer"
          );
        }
      } catch (error) {
        if (this.isLog) {
          console.log(
            this.requestId,
            "socket.onmessage catch error",
            JSON.stringify(error),
            "XmovSpeechRecognizer"
          );
        }
      }
    };

    this.socket.onerror = (error) => {
      if (this.isLog) {
        console.log(
          this.requestId,
          "socket error callback",
          error,
          "XmovSpeechRecognizer"
        );
      }
      const socket = this.socket;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.close();
      }
      this.OnError(error);
    };

    this.socket.onclose = (event) => {
      try {
        if (!this.isRecognizeComplete) {
          if (this.isLog) {
            console.log(
              this.requestId,
              "socket is close and error",
              JSON.stringify(event),
              "XmovSpeechRecognizer"
            );
          }
          this.OnError(event);
        }
      } catch (error) {
        if (this.isLog) {
          console.log(
            this.requestId,
            "socket is onclose catch" + this.sendCount,
            JSON.stringify(error),
            "XmovSpeechRecognizer"
          );
        }
      }
    };
  }

  /**
   * 关闭连接
   */
  close() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close(1000);
    }
  }

  /**
   * 写入音频数据
   */
  write(audioData: Int8Array | ArrayBuffer) {
    try {
      if (!this.socket || String(this.socket.readyState) !== "1") {
        // WebSocket 未打开，延迟发送
        setTimeout(() => {
          if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(audioData);
          }
        }, 40);
        return false;
      }
      this.sendCount += 1;
      this.socket.send(audioData);
      return true;
    } catch (error) {
      if (this.isLog) {
        console.log(
          this.requestId,
          "发送数据 error catch",
          error,
          "XmovSpeechRecognizer"
        );
      }
      return false;
    }
  }
}
