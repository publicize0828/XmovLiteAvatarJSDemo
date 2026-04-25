// 虚拟人相关类型定义
export interface AvatarConfig {
  appId: string;
  appSecret: string;
}

export interface AvatarState {
  connected: boolean;
  speaking: boolean;
  thinking: boolean;
}

// ASR相关类型定义
export type AsrProvider = "xmov" | "doubao" | "xunfei" | "tx";

export interface AsrConfig {
  provider: AsrProvider;
  appId: string | number;
  secretId: string;
  secretKey: string;
  vadSilenceTime?: number;
}

export interface AsrCallbacks {
  onFinished: (text: string) => void;
  onError: (error: any) => void;
}

// LLM相关类型定义
export interface LlmConfig {
  provider: "openai" | "coze";
  model: string;
  apiKey: string;
  botId?: string;
  baseURL?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Store类型定义
export interface AppStore {
  connectAvatar(containerId?: string, customConfig?: any): Promise<void>;
  disconnectAvatar(): void;
  sendMessage(): Promise<string | undefined>;
  startVoiceInput(callbacks: AsrCallbacks): void;
  stopVoiceInput(): void;
  interrupt(): void;
  registerCallback(type: string, callback: any): () => void;
  switchContainer(containerId: string, config?: any): Promise<void>;
  createAvatarInstance(options: {
    containerId: string
    appId: string
    appSecret: string
    gatewayServer?: string
    config: any
    useInvisibleMode?: boolean
    onStatusChange?: (status: any) => void
    onRenderChange?: (state: any) => void
    onMessage?: (error: any) => void
    onVoiceStateChange?: (status: string, duration?: number) => void
    onWalkStateChange?: (state: string) => void
    onWidgetEvent?: (data: any) => void
    proxyWidget?: { [key: string]: (data: any) => void }
    onDownloadProgress?: (progress: number) => void
  }): Promise<any>;
}

// Store状态类型定义
export interface AppState {
  // 虚拟人配置
  avatar: {
    appId: string;
    appSecret: string;
    connected: boolean;
    instance: any; // XmovAvatar SDK 实例（通过 window.XmovAvatar 创建）
  };

  // ASR配置
  asr: {
    provider: string;
    appId: string | number;
    secretId: string;
    secretKey: string;
    isListening: boolean;
  };

  // LLM配置
  llm: {
    model: string;
    apiKey: string;
    botId: string;
  };

  // UI状态
  ui: {
    text: string;
    subTitleText: string;
    mode: "interactive" | "walk" | "switch" | "custom-event";
  };
}

export interface ActionQueueItem {
  ssml: string;
  isStart: boolean;
  isEnd: boolean;
}

// SDK事件类型定义
export interface SdkEvent {
  type: "subtitle_on" | "subtitle_off" | string;
  text?: string;
  [key: string]: any;
}

// 全局窗口类型扩展
declare global {
  interface Window {
    XmovAvatar: any;
    CryptoJSTest: any;
    CryptoJS: any;
    WebAudioSpeechRecognizer: any;
    WebRecorder: any;
    DoubaoRecognizer?: any;
    hex_md5?: (s: string) => string;
    RecorderManager?: any;
  }
}
