import type { AsrConfig, AsrCallbacks } from "../../types";
import { ASR_CONFIG } from "../../constants";
import { signCallback } from "../../lib/asr";
import type { AsrRecognizer } from "./types";

/**
 * 腾讯云 ASR 识别器
 */
export function createTencentRecognizer(
  config: AsrConfig,
  asrText: { value: string },
  isListening: { value: boolean }
): AsrRecognizer {
  let recognizer: any = null;

  /**
   * 构建腾讯云ASR配置
   */
  const buildAsrConfig = (vadSilenceTime?: number) => ({
    signCallback: signCallback.bind(null, config.secretKey),
    appid: config.appId,
    secretid: config.secretId,
    secretkey: config.secretKey,
    engine_model_type: ASR_CONFIG.ENGINE_MODEL_TYPE,
    voice_format: ASR_CONFIG.VOICE_FORMAT,
    filter_dirty: ASR_CONFIG.FILTER_DIRTY,
    filter_modal: ASR_CONFIG.FILTER_MODAL,
    filter_punc: ASR_CONFIG.FILTER_PUNC,
    convert_num_mode: ASR_CONFIG.CONVERT_NUM_MODE,
    word_info: ASR_CONFIG.WORD_INFO,
    needvad: ASR_CONFIG.NEEDVAD,
    vad_silence_time: vadSilenceTime || config.vadSilenceTime || 300,
  });

  return {
    start(callbacks: AsrCallbacks, vadSilenceTime?: number) {
      if (!window.WebAudioSpeechRecognizer) {
        console.error("WebAudioSpeechRecognizer 未加载");
        callbacks.onError("WebAudioSpeechRecognizer 未加载");
        return;
      }

      if (!config.appId || !config.secretId || !config.secretKey) {
        console.error("ASR配置不完整");
        callbacks.onError("ASR配置不完整，请检查App ID、Secret ID和Secret Key");
        return;
      }

      const asrConfig = buildAsrConfig(vadSilenceTime);
      console.log("腾讯云ASR配置:", asrConfig);

      try {
        recognizer = new window.WebAudioSpeechRecognizer(asrConfig);

        recognizer.OnRecognitionStart = () => {
          console.log("识别开始");
        };

        recognizer.OnSentenceBegin = (res: any) => {
          console.log("句子开始:", res);
          asrText.value = "";
        };

        recognizer.OnRecognitionResultChange = (res: any) => {
          const currentText = res.result?.voice_text_str;
          if (currentText) {
            asrText.value = currentText;
            console.log("识别中:", currentText);
          }
        };

        recognizer.OnSentenceEnd = (res: any) => {
          const resultText = res.result?.voice_text_str;
          console.log("句子结束:", resultText);
          if (resultText) {
            asrText.value = resultText;
            callbacks.onFinished(resultText);
          }
        };

        recognizer.OnRecognitionComplete = () => {
          console.log("识别完成");
          isListening.value = false;
        };

        recognizer.OnError = (res: any) => {
          console.error("识别错误:", res);
          callbacks.onError(res);
          isListening.value = false;
        };

        recognizer.start();
        isListening.value = true;
        console.log("腾讯云ASR已启动");
      } catch (error) {
        console.error("创建WebAudioSpeechRecognizer失败:", error);
        callbacks.onError(error);
      }
    },

    stop() {
      if (recognizer) {
        recognizer.stop();
        recognizer = null;
      }
      isListening.value = false;
      console.log("已停止腾讯云ASR");
    },
  };
}

