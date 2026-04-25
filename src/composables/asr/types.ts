import type { AsrConfig, AsrCallbacks } from "../../types";

/**
 * ASR 识别器接口
 */
export interface AsrRecognizer {
  /**
   * 启动识别
   * @param callbacks - 回调函数
   * @param vadSilenceTime - 可选的静音检测时间
   */
  start(callbacks: AsrCallbacks, vadSilenceTime?: number): void | Promise<void>;

  /**
   * 停止识别
   */
  stop(): void;
}

/**
 * ASR 识别器工厂函数类型
 */
export type AsrRecognizerFactory = (
  config: AsrConfig,
  asrText: { value: string },
  isListening: { value: boolean }
) => AsrRecognizer;

/**
 * 获取默认麦克风流
 */
export async function getDefaultMicStream(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      sampleRate: 16000,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  return stream;
}

