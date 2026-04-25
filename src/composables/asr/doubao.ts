import type { AsrConfig, AsrCallbacks } from "../../types";
import type { AsrRecognizer } from "./types";
import { getDefaultMicStream } from "./types";

/**
 * 豆包 ASR 识别器
 */
export function createDoubaoRecognizer(
  config: AsrConfig,
  asrText: { value: string },
  isListening: { value: boolean }
): AsrRecognizer {
  let recognizer: any = null;

  return {
    async start(callbacks: AsrCallbacks) {
      try {
        // 动态导入豆包ASR
        let DoubaoRecognizer: any;
        try {
          // const doubaoModule = await import("@xmov/doubao-asr");
          // DoubaoRecognizer = doubaoModule.DoubaoRecognizer;
        } catch (importError) {
          console.error("导入豆包ASR模块失败:", importError);
          callbacks.onError(
            "豆包ASR模块未安装，请运行: npm install @xmov/doubao-asr"
          );
          return;
        }

        if (!config.appId || !config.secretId) {
          callbacks.onError("豆包ASR配置不完整，请检查App ID和Secret ID");
          return;
        }

        const stream = await getDefaultMicStream();

        const asrConfig = {
          wsUrl:
            "wss://nebula-agent.xingyun3d.com/hsw/api/v3/sauc/bigmodel_async",
          appKey: String(config.appId),
          accessKey: String(config.secretId),
          engineModel: "16k_zh",
          sampleRate: 16000,
          disableInProduction: false,
          mediaStream: stream,
        };

        const asrCallbacks = {
          onRecognitionStart: () => {
            asrText.value = "";
          },
          onSentenceBegin: (event: any) => {
            const t = event?.result?.voice_text_str || "";
            if (t) asrText.value = t;
          },
          onRecognitionResultChange: (event: any) => {
            const t = event?.result?.voice_text_str || "";
            if (t) asrText.value = t;
          },
          onSentenceEnd: (event: any) => {
            const t = event?.result?.voice_text_str || "";
            if (t) {
              asrText.value = t;
              callbacks.onFinished(t);
            }
          },
          onRecognitionComplete: () => {
            isListening.value = false;
          },
          onError: (event: any) => {
            console.error("豆包ASR错误:", event);
            callbacks.onError(event?.error || event);
            isListening.value = false;
          },
        };

        recognizer = new DoubaoRecognizer(asrConfig, asrCallbacks as any);
        await recognizer.start();
        isListening.value = true;
        console.log("豆包ASR已启动");
      } catch (err: any) {
        console.error("豆包ASR启动失败", err);
        if (err?.name === "NotFoundError") {
          callbacks.onError(
            "未找到麦克风，请检查设备/权限（需 https 或 localhost）"
          );
        } else if (err?.name === "NotAllowedError") {
          callbacks.onError("麦克风权限被拒绝，请在浏览器地址栏重新授权");
        } else {
          callbacks.onError(err?.message || String(err));
        }
        isListening.value = false;
      }
    },

    stop() {
      if (recognizer) {
        try {
          recognizer.stop?.();
        } catch (e) {
          console.error("停止豆包ASR时出错:", e);
        }
        recognizer = null;
      }
      isListening.value = false;
      console.log("已停止豆包ASR");
    },
  };
}
