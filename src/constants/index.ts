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
  GATEWAY_URL: 'https://test-ttsa-gateway-lite.xmov.ai/api/session',
  DATA_SOURCE: '2',
  CUSTOM_ID: 'demo',
  // 从环境变量读取，如果未配置则使用空字符串
  APP_ID:  '123',
  APP_SECRET:'123',
  AVATAR_CONFIG: {
    "look_name": "FF008_6530_new",
    "tts_vcn_id": "XMOV_HN_TTS__4",
    "is_large_model": false,
    "sta_face_id": "F_CN02_yuxuan",
    "mp_service_id": "F_CN02_show52_walk_test",
    "figure_name": "SCF25_001",
    "lite_drive_style": "lively",
    "background_img": "https://media.youyan.xyz/youyan/images/shot_layer_library/2D_background/ppt_train_02__2D_background.png",
    "frame_rate": 24,
    "optional_emotion": "",
    "init_events": [
      {
        "data": {
          "axis_id": 1,
          "height": 1,
          "image": "https://media.xingyun3d.com/xingyun3d/general/litehuman/background_2D/jushen_v1_black_and_gold_style_office_02.png",
          "width": 1,
          "x_location": 0,
          "y_location": 0
        },
        "type": "widget_pic"
      }
    ],
    "auto_ka": true,
    "render_preset": "1080x1920_fullbody",
    "layout": {
      "container": {
        "size": [
          1440,
          810
        ]
      },
      "avatar": {
        "v_align": "center",
        "h_align": "middle",
        "scale": 0.3,
        "offset_x": 0,
        "offset_y": 0
      }
    },
    "walk_config": {
      "min_x_offset": -500,
      "max_x_offset": 500,
      "walk_points": {
        "A": -500,
        "B": -400,
        "C": -300,
        "D": -200,
        "E": -100,
        "F": 0,
        "G": 100,
        "H": 200,
        "I": 300,
        "J": 400,
        "K": 500
      },
      "init_point": 0
    }
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
