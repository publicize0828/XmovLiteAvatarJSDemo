import type { AsrConfig, AsrCallbacks } from "../../types";
import type { AsrRecognizer } from "./types";
import { makeXmovAsrUrl } from "../../lib/xmov-asr-signature";
import { XmovSpeechRecognizer } from "../../lib/xmov-speech-recognizer";

/**
 * 生成唯一请求ID
 */
function generateRequestId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * xmovASR 3.0 识别器
 * 使用 WebAudioSpeechRecognizer 的音频采集能力，但适配 xmovASR 协议
 */
export function createXmovRecognizer(
  config: AsrConfig,
  asrText: { value: string },
  isListening: { value: boolean }
): AsrRecognizer {
  let recorder: any = null;
  let speechRecognizer: XmovSpeechRecognizer | null = null;
  let isCanSendData = false;
  let isNormalEndStop = false;
  let requestId: string | null = null;

  return {
    start(callbacks: AsrCallbacks) {
      if (!window.WebAudioSpeechRecognizer) {
        callbacks.onError("WebAudioSpeechRecognizer 未加载");
        return;
      }

      if (!config.appId || !config.secretKey) {
        callbacks.onError("xmovASR配置不完整，请检查App ID和Secret Key");
        return;
      }

      // 检查 CryptoJS 是否可用（用于签名）
      if (!window.CryptoJSTest && !window.CryptoJS) {
        callbacks.onError("CryptoJS 未加载，无法生成签名");
        return;
      }

      try {
        requestId = generateRequestId();
        const isLog = true;

        // 生成 WebSocket URL（带签名）
        const wsBaseUrl = import.meta.env.XMOV_ASR_URL;
        const wsUrl = makeXmovAsrUrl(config.appId, config.secretKey, wsBaseUrl);

        console.log("xmovASR WebSocket URL:", wsUrl);

        // 创建 xmovASR 专用的 SpeechRecognizer
        speechRecognizer = new XmovSpeechRecognizer({}, requestId, isLog);

        // 设置回调函数
        speechRecognizer.OnRecognitionStart = (res: any) => {
          console.log("xmovASR识别开始", res);
          asrText.value = "";
        };

        speechRecognizer.OnSentenceBegin = (res: any) => {
          asrText.value = "";
        };

        speechRecognizer.OnRecognitionResultChange = (res: any) => {
          if (res.text) {
            asrText.value = res.text;
            console.log("xmovASR识别中:", res.text);
          }
        };

        speechRecognizer.OnSentenceEnd = (res: any) => {
          const resultText = res.text;
          console.log("xmovASR句子结束:", resultText);
          if (resultText) {
            asrText.value = resultText;
            callbacks.onFinished(resultText);
          }
        };

        speechRecognizer.OnRecognitionComplete = (res: any) => {
          console.log("xmovASR识别完成", res);
          isListening.value = false;
          isCanSendData = false;
          isNormalEndStop = true;
        };

        speechRecognizer.OnError = (res: any) => {
          console.error("xmovASR识别错误:", res);
          if (!isNormalEndStop) {
            callbacks.onError(res);
          }
          speechRecognizer = null;
          if (recorder) {
            recorder.stop();
          }
          isCanSendData = false;
          isListening.value = false;
        };
        const params = {
          // 使用一个占位符配置，因为 xmovASR 不需要这些参数
          appid: config.appId,
          secretkey: config.secretKey,
        };

        // 创建 recorder（使用 WebRecorder 的逻辑）
        recorder = new (window as any).WebRecorder(requestId, params, isLog);

        // 设置音频数据接收回调
        recorder.OnReceivedData = (audioData: Int8Array) => {
          if (isCanSendData && speechRecognizer) {
            speechRecognizer.write(audioData);
          }
        };

        recorder.OnError = (error: any) => {
          if (speechRecognizer) {
            speechRecognizer.close();
          }
          recorder.stop();
          callbacks.onError(error);
          isListening.value = false;
        };

        recorder.OnStop = () => {
          if (speechRecognizer) {
            speechRecognizer.stop();
          }
        };

        // 设置连接成功回调（在收到 code=10020000 后执行）
        speechRecognizer.onConnected = () => {
          // 发送 start 信号
          const socket = speechRecognizer?.socket;
          if (socket && socket.readyState === WebSocket.OPEN) {
            const startMessage = {
              signal: "start",
              hotword_list: [],
            };
            socket.send(JSON.stringify(startMessage));
            console.log("xmovASR已发送start信号");
          }

          // 启动音频采集
          if (recorder) {
            recorder.start();
            isCanSendData = true;
            isListening.value = true;
            console.log("xmovASR已启动，开始发送音频数据");
          } else {
            if (speechRecognizer) {
              speechRecognizer.close();
            }
          }
        };

        // 设置识别开始回调
        speechRecognizer.OnRecognitionStart = (res: any) => {
          console.log("xmovASR识别开始", res);
          asrText.value = "";
        };

        // 启动 WebSocket 连接
        speechRecognizer.start(wsUrl);

        console.log("xmovASR初始化完成");
      } catch (error) {
        console.error("xmovASR启动失败:", error);
        callbacks.onError(
          error instanceof Error ? error.message : String(error)
        );
        isListening.value = false;
      }
    },

    stop() {
      isCanSendData = false;

      if (recorder) {
        recorder.stop();
        recorder = null;
      }

      if (speechRecognizer) {
        speechRecognizer.stop();
        speechRecognizer = null;
      }

      isListening.value = false;
      console.log("已停止xmovASR");
    },
  };
}
