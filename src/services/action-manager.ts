import type { Ref } from "vue";
import type { ActionQueueItem } from "../types";
import { generateSSML } from "../utils";

interface SpeakOptions {
  /** 是否为流式对话起始 */
  isStart?: boolean;
  /** 是否为流式对话结束 */
  isEnd?: boolean;
}

interface ActionManagerOptions {
  instanceRef: Ref<any | null>;
  onVoiceReady?: () => void;
  onVoiceEnd?: () => void;
}

export class ActionManager {
  private queue: ActionQueueItem[] = [];
  private isSpeaking = false;
  private instanceRef: Ref<any | null>;
  private onVoiceReady?: () => void;
  private onVoiceEnd?: () => void;

  constructor(options: ActionManagerOptions) {
    this.instanceRef = options.instanceRef;
    this.onVoiceReady = options.onVoiceReady;
    this.onVoiceEnd = options.onVoiceEnd;
  }

  speak(text: string, options: SpeakOptions = {}) {
    const ssml = generateSSML(text.replace(/\n+/g, "\n"));
    this.queue.push({
      ssml,
      isStart: options.isStart ?? false,
      isEnd: options.isEnd ?? false,
    });
    this.processQueue();
  }

  reset() {
    this.queue = [];
    this.isSpeaking = false;
  }

  private async processQueue() {
    if (this.isSpeaking) return;
    if (!this.queue.length) return;
    const instance = this.instanceRef.value;
    if (!instance) return;

    this.isSpeaking = true;

    console.log("ActionManager开始处理队列，当前队列长度:", this.queue.length);
    while (this.queue.length) {
      const item = this.queue.shift();
      if (!item) break;

      this.onVoiceReady?.();
      instance.speak(item.ssml, item.isStart, item.isEnd);

      // 如果是流式中间段，等待下一个片段
      if (!item.isEnd) {
        continue;
      }

      // 等待 speak 完成
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    this.isSpeaking = false;
    this.onVoiceEnd?.();
  }
}