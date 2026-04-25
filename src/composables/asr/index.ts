import type { AsrConfig } from "../../types";
import type { AsrRecognizerFactory } from "./types";
import { createTencentRecognizer } from "./tencent";
import { createDoubaoRecognizer } from "./doubao";
import { createXmovRecognizer } from "./xmov";
import { createXunfeiRecognizer } from "./xunfei";

/**
 * ASR 识别器工厂映射
 */
const recognizerFactories: Record<AsrConfig["provider"], AsrRecognizerFactory> =
  {
    tx: createTencentRecognizer,
    doubao: createDoubaoRecognizer,
    xmov: createXmovRecognizer,
    xunfei: createXunfeiRecognizer,
  };

/**
 * 根据配置创建对应的 ASR 识别器
 * @param config - ASR配置
 * @param asrText - 识别文本的响应式引用
 * @param isListening - 监听状态的响应式引用
 * @returns ASR识别器实例
 */
export function createAsrRecognizer(
  config: AsrConfig,
  asrText: { value: string },
  isListening: { value: boolean }
) {
  const factory = recognizerFactories[config.provider];
  if (!factory) {
    throw new Error(`不支持的ASR提供商: ${config.provider}`);
  }
  return factory(config, asrText, isListening);
}

// 导出所有类型和工具函数
export * from "./types";
export { createTencentRecognizer } from "./tencent";
export { createDoubaoRecognizer } from "./doubao";
export { createXmovRecognizer } from "./xmov";
export { createXunfeiRecognizer } from "./xunfei";
