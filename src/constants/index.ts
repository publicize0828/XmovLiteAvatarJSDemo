// 应用常量
export const APP_CONFIG = {
  CONTAINER_PREFIX: 'CONTAINER_',
  DEFAULT_VAD_SILENCE_TIME: 300,
  AVATAR_INIT_TIMEOUT: 3000,
  SPEAK_INTERRUPT_DELAY: 2000
} as const

// LLM配置
export const LLM_CONFIG = {
  // 火山方舟
  BASE_URL: 'https://ark.cn-beijing.volces.com/api/v3',
  DEFAULT_MODEL: 'doubao-1-5-pro-32k-250115',
  SYSTEM_PROMPT: '你是人工智能助手',
  // Coze配置
  COZE_BASE_URL: 'https://api.coze.cn',
  // 通义千问配置 | 阿里云百炼
  QWEN_BASE_URL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  //硅基流动
  SILICONFLOW_BASE_URL: 'https://api.siliconflow.cn/v1',
} as const

// ASR配置
export const ASR_CONFIG = {
  ENGINE_MODEL_TYPE: '16k_zh',
  VOICE_FORMAT: 1,
  FILTER_DIRTY: 1,
  FILTER_MODAL: 1,
  FILTER_PUNC: 1,
  CONVERT_NUM_MODE: 1,
  WORD_INFO: 2,
  NEEDVAD: 1
} as const

// SDK配置
// 注意：APP_ID 和 APP_SECRET 从环境变量读取，本地开发时请在 .env.local 中配置
// 这些敏感信息不会提交到代码仓库
export const SDK_CONFIG = {
  GATEWAY_URL: 'https://nebula-agent.xingyun3d.com/user/v1/ttsa/session',
  DATA_SOURCE: '2',
  CUSTOM_ID: 'demo',
  // 从环境变量读取，如果未配置则使用空字符串
  APP_ID: '123',
  APP_SECRET: '123',
  AVATAR_CONFIG: {
    raw_audio: false,
    walk_version: 3,
    framedata_proto_version: 2,
    layout: {
      avatar: { h_align: 'right', offset_x: 0, offset_y: 0, scale: 0.3, v_align: 'bottom' },
      container: { size: [1125, 911] }
    },
    walk_config: {
      init_point: 600,
      labels: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"],
      max_x_offset: 1005,
      min_x_offset: 120,
      walk_points: { A: 120, B: 240, C: 360, D: 480, E: 600, F: 720, G: 840, H: 960, I: 1080, J: 1200, K: 1320 }
    },
  }
} as const
// 支持的LLM模型列表
export const SUPPORTED_LLM_MODELS = [
  {
    value: 'doubao-1-5-pro-32k-250115',
    label: 'openai',
    baseURL: LLM_CONFIG.BASE_URL,
  },
  {
    value: 'qwen-plus',
    label: 'openai',
    baseURL: LLM_CONFIG.QWEN_BASE_URL
  },
  {
    value: 'glm-4.7',
    label: 'openai',
    baseURL: LLM_CONFIG.QWEN_BASE_URL
  },
  {
    value: 'kimi-k2-thinking',
    label: 'openai',
    baseURL: LLM_CONFIG.QWEN_BASE_URL
  },
  {
    value: 'DeepSeek-V3.2',
    label: 'openai',
    baseURL: LLM_CONFIG.BASE_URL
  },
  {
    value: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
    label: 'openai',
    baseURL: LLM_CONFIG.SILICONFLOW_BASE_URL
  },
  {
    value: 'coze',
    label: 'coze',
    baseURL: LLM_CONFIG.COZE_BASE_URL
  },
] as const

// 支持的ASR提供商
export const SUPPORTED_ASR_PROVIDERS = [
  { value: 'xmov', label: 'xmovASR' },
  { value: 'doubao', label: '豆包ASR' },
  { value: 'xunfei', label: '讯飞ASR' },
  { value: 'tx', label: '腾讯云' }
] as const
