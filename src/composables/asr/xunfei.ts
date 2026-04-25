import type { AsrConfig, AsrCallbacks } from "../../types";
import type { AsrRecognizer } from "./types";
import { getDefaultMicStream } from "./types";
import CryptoJS from "crypto-js";

/**
 * 获取讯飞ASR WebSocket基础URL
 */
function getXunfeiAsrBaseUrl(): string {
  return import.meta.env.XUNFEI_ASR_URL || "wss://rtasr.xfyun.cn/v1/ws";
}

/**
 * 生成讯飞ASR WebSocket URL
 * 参考: apps/base/static_16934793610341218_js_raasr/example/rtasr/index.js
 */
function getWebSocketUrl(appId: string | number, secretKey: string): string {
  const url = getXunfeiAsrBaseUrl();
  const ts = Math.floor(new Date().getTime() / 1000);

  // 计算 signa = MD5(appId + ts)
  const signa = CryptoJS.MD5(String(appId) + ts).toString();

  // 计算 signature = Base64(HMAC-SHA1(signa, secretKey))
  const signatureSha = CryptoJS.HmacSHA1(signa, secretKey);
  const signature = CryptoJS.enc.Base64.stringify(signatureSha);

  return `${url}?appid=${appId}&ts=${ts}&signa=${encodeURIComponent(signature)}`;
}

/**
 * 将 Float32Array 音频数据转换为 Int8Array
 * 参考 demo 中的音频处理方式，RecorderManager 的 frameBuffer 是 ArrayBuffer，
 * demo 中直接使用 new Int8Array(frameBuffer) 发送
 * 这里将 Float32Array 转换为 Int8Array，保持与 demo 一致的数据格式
 */
function float32ToInt8(float32Array: Float32Array): Int8Array {
  const int8Array = new Int8Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    // 将 -1.0 到 1.0 的浮点数转换为 -128 到 127 的整数
    // 注意：这里使用 127 而不是 128，因为 Int8Array 的范围是 -128 到 127
    const value = Math.max(-1, Math.min(1, float32Array[i]));
    int8Array[i] = Math.round(value * 127);
  }
  return int8Array;
}

/**
 * 讯飞 ASR 识别器
 * 参考: apps/base/static_16934793610341218_js_raasr/example/rtasr/index.js
 */
export function createXunfeiRecognizer(
  config: AsrConfig,
  asrText: { value: string },
  isListening: { value: boolean }
): AsrRecognizer {
  let recognizer: any = null;
  let resultText = "";
  let resultTextTemp = "";

  return {
    async start(callbacks: AsrCallbacks) {
      try {
        // 讯飞ASR需要WebSocket连接和特定的认证方式
        if (!config.appId || !config.secretKey) {
          callbacks.onError("讯飞ASR配置不完整，请检查App ID和Secret Key");
          return;
        }
        const stream = await getDefaultMicStream();
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);

        // 使用 ScriptProcessorNode 处理音频（兼容性更好）
        // buffer size 必须是 2 的幂次方（256-16384 之间）或 0
        const processor = audioContext.createScriptProcessor(1024, 1, 1);

        // 生成 WebSocket URL（使用 rtasr API）
        const wsUrl = getWebSocketUrl(config.appId, config.secretKey);
        const ws = new WebSocket(wsUrl);

        // 重置结果文本
        resultText = "";
        resultTextTemp = "";

        ws.onopen = () => {
          console.log("讯飞ASR连接已建立");
          isListening.value = true;
          // 连接建立后开始录音，不需要发送初始参数（rtasr API 不需要）
        };

        ws.onmessage = (event) => {
          try {
            const jsonData = JSON.parse(event.data);

            if (jsonData.action === "started") {
              // 握手成功
              console.log("讯飞ASR握手成功");
            } else if (jsonData.action === "result") {
              // 转写结果
              const data = JSON.parse(jsonData.data);
              console.log("识别结果:", data);

              resultTextTemp = "";
              if (data.cn && data.cn.st && data.cn.st.rt) {
                data.cn.st.rt.forEach((j: any) => {
                  if (j.ws) {
                    j.ws.forEach((k: any) => {
                      if (k.cw) {
                        k.cw.forEach((l: any) => {
                          resultTextTemp += l.w || "";
                        });
                      }
                    });
                  }
                });
              }

              // type: 0 表示最终结果，1 表示中间结果
              if (data.cn && data.cn.st && data.cn.st.type === 0) {
                // 【最终】识别结果
                resultText += resultTextTemp;
                resultTextTemp = "";

                if (resultText) {
                  asrText.value = resultText;
                  callbacks.onFinished(resultText);
                }
              } else {
                // 中间结果，实时更新
                const currentText = resultText + resultTextTemp;
                if (currentText) {
                  asrText.value = currentText;
                }
              }
            } else if (jsonData.action === "error") {
              // 连接发生错误
              console.error("讯飞ASR错误:", jsonData);
              callbacks.onError(jsonData.message || "讯飞ASR识别错误");
            }
          } catch (e) {
            console.error("解析讯飞ASR响应失败:", e);
          }
        };

        ws.onerror = (error) => {
          console.error("讯飞ASR WebSocket错误:", error);
          callbacks.onError("讯飞ASR连接错误");
          isListening.value = false;
        };

        ws.onclose = () => {
          console.log("讯飞ASR连接已关闭");
          isListening.value = false;
        };

        // 处理音频数据
        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN && isListening.value) {
            const inputData = e.inputBuffer.getChannelData(0);

            // 将 Float32Array 转换为 Int8Array（参考 demo 中的 Int8Array 发送方式）
            const int8Array = float32ToInt8(inputData);

            // 直接发送 Int8Array（参考 demo: iatWS.send(new Int8Array(frameBuffer))）
            ws.send(int8Array);
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        recognizer = {
          ws,
          audioContext,
          source,
          processor,
          stream,
          stop: () => {
            try {
              // 发送结束标志（参考 demo: iatWS.send('{"end": true}')）
              if (ws.readyState === WebSocket.OPEN) {
                ws.send('{"end": true}');
                setTimeout(() => {
                  if (
                    ws.readyState === WebSocket.OPEN ||
                    ws.readyState === WebSocket.CONNECTING
                  ) {
                    ws.close();
                  }
                }, 100);
              }

              processor.disconnect();
              source.disconnect();
              stream.getTracks().forEach((track) => track.stop());
              audioContext.close();
            } catch (e) {
              console.error("停止讯飞ASR时出错:", e);
            }
          },
        };

        console.log("讯飞ASR已启动");
      } catch (error) {
        console.error("讯飞ASR启动失败:", error);
        callbacks.onError(
          error instanceof Error ? error.message : String(error)
        );
        isListening.value = false;
      }
    },

    stop() {
      if (recognizer && recognizer.stop) {
        recognizer.stop();
        recognizer = null;
      }
      isListening.value = false;
      console.log("已停止讯飞ASR");
    },
  };
}
