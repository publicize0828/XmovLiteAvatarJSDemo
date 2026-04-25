// 配置文件路径
const CONFIG_FILE_PATH = '../../xmov_config.json';
const GLOBAL_KEY = 'XMOV_CONFIG';

// 配置接口定义
export interface AvatarConfig {
  appId: string;
  appSecret: string;
}

export interface AsrProviderConfig {
  appId: string;
  secretId?: string;
  secretKey: string;
}

export interface AsrConfig {
  [provider: string]: AsrProviderConfig;
}

export interface LlmModelConfig {
  apiKey: string;
  botId?: string;
}

export interface LlmConfig {
  [model: string]: LlmModelConfig;
}

export interface AppConfig {
  avatar: AvatarConfig;
  asr: AsrConfig;
  llm: LlmConfig;
}

// 默认配置
const DEFAULT_CONFIG: AppConfig = {
  avatar: {
    appId: '',
    appSecret: ''
  },
  asr: {
    tx: {
      appId: '',
      secretId: '',
      secretKey: ''
    },
    xmov: {
      appId: '',
      secretKey: ''
    },
    xunfei: {
      appId: '',
      secretKey: ''
    }
  },
  llm: {
    default: {
      apiKey: '',
      botId: ''
    }
  }
};

/**
 * 读取配置文件
 * 优先读取本地注入的 window.XMOV_CONFIG（xmov_config.js），否则回退到 xmov_config.json。
 * @returns {Promise<AppConfig | null>} 配置对象
 */
export async function loadConfig(): Promise<AppConfig | null> {
  try {
    // 1) 优先读取 window.XMOV_CONFIG（用于本地开发，文件不提交）
    const globalConfig = (window as any)?.[GLOBAL_KEY];
    if (globalConfig) {
      return validateConfig(globalConfig as Partial<AppConfig>);
    }

    // 2) 回退读取 xmov_config.json（示例或静态配置）
    const response = await fetch(CONFIG_FILE_PATH);
    if (!response.ok) {
      throw new Error(`Failed to load config file: ${response.statusText}`);
    }

    const configText = await response.text();
    const config = JSON.parse(configText);
    return validateConfig(config as Partial<AppConfig>);
  } catch (error) {
    console.error('配置加载失败:', error);
    return null;
  }
}

/**
 * 验证配置结构
 * @param config 配置对象
 * @returns {AppConfig} 验证后的配置对象
 */
export function validateConfig(config: Partial<AppConfig>): AppConfig {
  // 合并默认配置和读取的配置
  const validatedConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    avatar: {
      ...DEFAULT_CONFIG.avatar,
      ...config.avatar
    },
    asr: {
      ...DEFAULT_CONFIG.asr,
      ...config.asr
    },
    llm: {
      ...DEFAULT_CONFIG.llm,
      ...config.llm
    }
  };

  // 确保每个ASR服务商都有配置
  Object.keys(DEFAULT_CONFIG.asr).forEach(provider => {
    if (!validatedConfig.asr[provider]) {
      validatedConfig.asr[provider] = DEFAULT_CONFIG.asr[provider as keyof typeof DEFAULT_CONFIG.asr];
    }
  });

  // 兜底：确保 tx 存在
  if (!validatedConfig.asr.tx) {
    validatedConfig.asr.tx = { ...DEFAULT_CONFIG.asr.tx };
  }

  // 确保至少有一个LLM配置
  if (!validatedConfig.llm.default) {
    validatedConfig.llm.default = DEFAULT_CONFIG.llm.default;
  }

  return validatedConfig;
}

/**
 * 获取指定ASR服务商的配置
 * @param config 完整配置对象
 * @param provider 服务商名称
 * @returns {AsrProviderConfig} ASR服务商配置
 */
export function getAsrConfig(config: AppConfig, provider: string): AsrProviderConfig {
  return config.asr[provider] || config.asr.tx; // 默认使用腾讯云配置
}

/**
 * 获取指定LLM模型的配置
 * @param config 完整配置对象
 * @param model 模型名称
 * @returns {LlmModelConfig} LLM模型配置
 */
export function getLlmConfig(config: AppConfig, model: string): LlmModelConfig {
  return config.llm[model] || config.llm.default; // 默认使用default配置
}
