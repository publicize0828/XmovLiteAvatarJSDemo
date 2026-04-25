/**
 * 插件系统类型定义
 */

// 插件配置接口
export interface IPluginConfig {
  [key: string]: any;
}

// 文本处理插件接口
export interface ITextProcessorPlugin {
  name: string;
  process: (text: string, config?: IPluginConfig) => string | Generator<string, void, unknown>;
}

// KA意图处理插件配置
export interface IKAIntentPluginConfig extends IPluginConfig {
  BUFFER_LEN?: number;
  KA_DISTANCE?: number;
  SSML_BUFFER_LEN?: number;
}

// 插件注册选项
export interface IPluginRegistrationOptions {
  name: string;
  plugin: ITextProcessorPlugin;
  config?: IPluginConfig;
  enabled?: boolean;
} 