import { ref } from "vue";
import type { AsrConfig, AsrCallbacks } from "../types";
import { createAsrRecognizer } from "./asr";

/**
 * 语音识别Composable
 * @param config - ASR配置对象
 * @param config.provider - ASR服务提供商（'xmov' | 'doubao' | 'xunfei' | 'tx'）
 * @param config.appId - ASR应用ID
 * @param config.secretId - ASR密钥ID
 * @param config.secretKey - ASR密钥
 * @param config.vadSilenceTime - 可选的静音检测时间
 * @returns {object} - 返回包含asrText, isListening, start, stop的对象
 */
export function useAsr(config: AsrConfig) {
  const asrText = ref("");
  const isListening = ref(false);
  let recognizer: ReturnType<typeof createAsrRecognizer> | null = null;

  /**
   * 开始语音识别
   * @param callbacks - 回调函数集合
   * @param callbacks.onFinished - 识别完成回调
   * @param callbacks.onError - 识别错误回调
   * @param vadSilenceTime - 可选的静音检测时间（仅对腾讯云和xmovASR有效）
   * @returns {void}
   */
  const start = (callbacks: AsrCallbacks, vadSilenceTime?: number) => {
    if (isListening.value) {
      console.warn("语音识别已在进行中");
      return;
    }

    try {
      // 创建对应的识别器实例
      recognizer = createAsrRecognizer(config, asrText, isListening);

      // 启动识别
      recognizer.start(callbacks, vadSilenceTime);
    } catch (error) {
      console.error("创建ASR识别器失败:", error);
      callbacks.onError(error instanceof Error ? error.message : String(error));
    }
  };

  /**
   * 停止语音识别
   * @returns {void}
   */
  const stop = () => {
    if (!recognizer) return;

    try {
      recognizer.stop();
      recognizer = null;
    } catch (error) {
      console.error("停止ASR时出错:", error);
    }

    isListening.value = false;
    console.log("已停止语音识别");
  };

  /**
   * 测试ASR服务连接
   * @returns {Promise<boolean>} - 返回Promise，成功时resolve(true)，失败时reject(error)
   */
  const testConnection = async (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      try {
        // 设置超时
        const TEST_TIMEOUT = 5000;
        let timeoutId: number | undefined;

        // 测试成功后停止识别的处理
        const handleSuccess = () => {
          console.log("ASR服务连接测试成功：识别完成");
          clearTimeout(timeoutId);
          stop();
          resolve(true);
        };

        // 测试失败的处理
        const handleError = () => {
          console.error("ASR服务连接测试失败");
          clearTimeout(timeoutId);
          stop();
          reject(new Error("请检测ASR连接信息是否正确"));
        };

        // 设置超时
        timeoutId = window.setTimeout(() => {
          console.error("ASR服务连接测试超时");
          stop();
          reject(new Error("请检测ASR连接信息是否正确"));
        }, TEST_TIMEOUT);

        // 调用start方法进行测试
        console.log("开始ASR服务连接测试...");
        start({
          onFinished: handleSuccess,
          onError: handleError,
        });
      } catch (error) {
        console.error("ASR连接测试发生未知错误:", error);
        stop();
        reject(new Error("请检测ASR连接信息是否正确"));
      }
    });
  };

  return {
    asrText,
    isListening,
    start,
    stop,
    testConnection,
  };
}
