<template>
  <div class="config-panel">
    <!-- 虚拟人配置 -->
    <section class="config-section">
      <h3 class="section-title">虚拟人 SDK 配置</h3>

      <div class="form-group">
        <label>应用 APP ID：</label>
        <input
          v-model="appState.avatar.appId"
          type="text"
          placeholder="请输入 APP ID"
        />
      </div>

      <div class="form-group">
        <label>应用 APP Secret</label>
        <input
          v-model="appState.avatar.appSecret"
          type="text"
          placeholder="请输入 APP Secret"
        />
      </div>
    </section>

    <!-- ASR配置 -->
    <section class="config-section">
      <div class="section-title">
        <h3>语音识别配置</h3>
        <button
          @click="handleTestAsrConnection"
          :disabled="isTestingAsr"
          class="btn btn-interrupt"
        >
          {{ isTestingAsr ? "测试中..." : "测试连通性" }}
        </button>
      </div>

      <div class="form-group">
        <label>ASR 服务商</label>
        <select v-model="appState.asr.provider" @change="handleProviderChange">
          <option value="tx">腾讯云</option>
          <option value="xmov">xmovASR</option>
          <!-- <option value="doubao">豆包ASR</option> -->
          <option value="xunfei">讯飞ASR</option>
        </select>
      </div>

      <div class="form-group">
        <label>ASR App ID</label>
        <input
          v-model="appState.asr.appId"
          type="text"
          placeholder="请输入 ASR App ID"
        />
      </div>

      <div class="form-group" v-if="needsSecretId">
        <label>ASR Secret ID</label>
        <input
          v-model="appState.asr.secretId"
          type="text"
          placeholder="请输入 Secret ID"
        />
      </div>

      <div class="form-group">
        <label>ASR Secret Key</label>
        <input
          v-model="appState.asr.secretKey"
          type="text"
          placeholder="请输入 Secret Key"
        />
      </div>
    </section>

    <!-- LLM配置 -->
    <section class="config-section">
      <div class="section-title">
        <h3 class="">大语言模型配置</h3>
        <button
          @click="handleTestLlmConnection"
          :disabled="isTesting"
          class="btn btn-interrupt"
        >
          {{ isTesting ? "测试中..." : "测试连通性" }}
        </button>
      </div>

      <div class="form-group">
        <label>模型选择</label>
        <select v-model="appState.llm.model" @change="handleModelChange">
          <option
            v-for="model in supportedModels"
            :key="model.value"
            :value="model.value"
          >
            {{ model.value }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>API Key</label>
        <input
          v-model="appState.llm.apiKey"
          type="password"
          placeholder="请输入 API Key"
        />
      </div>

      <!-- 当模型为coze时显示bot_id输入 -->
      <div v-if="appState.llm.model === 'coze'" class="form-group">
        <label>Bot ID</label>
        <input
          v-model="appState.llm.botId"
          type="text"
          placeholder="请输入 Bot ID"
          required
        />
      </div>
    </section>

    <!-- 控制按钮 -->
    <section class="control-section">
      <div class="button-group">
        <button
          @click="handleConnect"
          :disabled="isConnecting || appState.avatar.connected"
          class="btn btn-primary"
        >
          {{
            isConnecting
              ? "连接中..."
              : appState.avatar.connected
                ? "已连接"
                : "连接"
          }}
        </button>

        <button
          @click="handleDisconnect"
          :disabled="!appState.avatar.connected"
          class="btn btn-secondary"
        >
          断开
        </button>
      </div>
    </section>

    <!-- 消息交互 -->
    <section class="message-section">
      <h3 class="section-title">消息交互</h3>

      <div class="form-group">
        <label>输入消息</label>
        <textarea
          v-model="appState.ui.text"
          rows="4"
          placeholder="请输入您的消息..."
        />
      </div>

      <div class="button-group">
        <button
          @click="handleVoiceInput"
          :disabled="!appState.avatar.connected || appState.asr.isListening"
          class="btn btn-voice"
        >
          {{ appState.asr.isListening ? "正在听..." : "语音输入" }}
        </button>

        <button
          @click="handleSendMessage"
          :disabled="
            !appState.avatar.connected || !appState.ui.text.trim() || isSending
          "
          class="btn btn-primary"
        >
          {{ isSending ? "发送中..." : "发送" }}
        </button>

        <button
          @click="handleInterrupt"
          :disabled="!appState.avatar.connected"
          class="btn btn-interrupt"
        >
          打断
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, computed, onMounted, shallowRef } from "vue";
import { useAsr } from "../composables/useAsr";
import { SUPPORTED_LLM_MODELS ,LLM_CONFIG} from "../constants";
import { avatarState } from "../stores/app";
import { llmService } from "../services/llm";
import { loadConfig, getAsrConfig, getLlmConfig } from "../utils/config-loader";
import type { AppState, AppStore, AsrProvider } from "../types";

// 注入全局状态和方法
const appState = inject<AppState>("appState")!;
const appStore = inject<AppStore>("appStore")!;

// 组件状态
const isConnecting = ref(false);
const isSending = ref(false);
const isTesting = ref(false);
const isTestingAsr = ref(false);
const supportedModels = SUPPORTED_LLM_MODELS;
// 配置缓存 - 使用 shallowRef 优化性能
const configCache = shallowRef<any>(null);

// 计算属性：虚拟人是否正在说话
const isSpeaking = computed(() => avatarState.value === "speak");

// 计算属性：是否需要显示 Secret ID 字段
const needsSecretId = computed(() => {
  return !["xmov", "xunfei"].includes(appState.asr.provider);
});

// ASR Hook - 使用computed确保配置更新时重新创建
const asrConfig = computed(() => ({
  provider: appState.asr.provider as AsrProvider,
  appId: appState.asr.appId,
  secretId: appState.asr.secretId,
  secretKey: appState.asr.secretKey,
}));

// 初始化ASR hook（用于停止功能）
const { stop: stopAsr } = useAsr(asrConfig.value);

// 组件挂载时加载配置
onMounted(() => {
  initConfig();
});

async function initConfig() {
  // 加载配置文件
  const config = await loadConfig();
  if (!config) return;
  
  configCache.value = config;
  console.log("配置加载成功:", config);
  
  // 虚拟人配置
  appState.avatar.appId = config.avatar.appId;
  appState.avatar.appSecret = config.avatar.appSecret;

  // ASR配置 - 默认使用腾讯云
  const defaultAsrConfig = config.asr.tx;
  appState.asr.appId = defaultAsrConfig.appId;
  appState.asr.secretId = defaultAsrConfig.secretId || "";
  appState.asr.secretKey = defaultAsrConfig.secretKey;

  // LLM配置 - 默认使用豆包配置
  const defaultLlmConfig = config.llm[LLM_CONFIG.DEFAULT_MODEL];
  appState.llm.apiKey = defaultLlmConfig.apiKey;
  // 只有coze模型需要botId
  appState.llm.botId = appState.llm.model === "coze" ? (defaultLlmConfig.botId || "") : "";
}

// 事件处理函数
async function handleConnect() {
  if (isConnecting.value) return;

  isConnecting.value = true;
  try {
    await appStore.connectAvatar();
  } catch (error) {
    console.error("连接失败:", error);
    alert("连接失败，请检查配置信息");
  } finally {
    isConnecting.value = false;
  }
}

function handleDisconnect() {
  console.log("开始断开所有连接...");
  // 1. 断开虚拟人连接
  appStore.disconnectAvatar();
  // 2. 断开ASR连接
  if (appState.asr.isListening) {
    stopAsr();
    appStore.stopVoiceInput();
  }
  // 3. 断开LLM连接
  llmService.disconnect();
  console.log("所有连接已断开");
}

function handleVoiceInput() {
  if (appState.asr.isListening) {
    stopAsr();
    // stopAsrWithConfig();
    appStore.stopVoiceInput();
    return;
  }

  // 验证ASR配置
  const { appId, secretId, secretKey, provider } = appState.asr;
  if (!appId || !secretKey) {
    alert("请先配置ASR信息（App ID、Secret ID、Secret Key）");
    return;
  }

  // 创建新的ASR实例（使用当前配置）
  const { start: startAsrWithConfig, stop: stopAsrWithConfig } = useAsr({
    provider: provider as AsrProvider,
    appId: appState.asr.appId,
    secretId: appState.asr.secretId,
    secretKey: appState.asr.secretKey,
  });

  // 用于防止重复发送的标志
  const hasAutoSent = ref(false);

  const handleAsrFinished = async (text: string) => {
    appState.ui.text = text;
    stopAsrWithConfig();
    appStore.stopVoiceInput();

    // 自动发送给大模型（防止重复发送）
    if (text.trim() && !hasAutoSent.value) {
      hasAutoSent.value = true;
      try {
        isSending.value = true;
        await appStore.sendMessage();
      } catch (error) {
        console.error("自动发送消息失败:", error);
        alert("自动发送消息失败");
      } finally {
        isSending.value = false;
        hasAutoSent.value = false;
      }
    }
  };

  const handleAsrError = (error: any) => {
    console.error("语音识别错误:", error);
    stopAsrWithConfig();
    appStore.stopVoiceInput();
    hasAutoSent.value = false;
  };

  appStore.startVoiceInput({
    onFinished: (text: string) => {
      appState.ui.text = text;
      stopAsrWithConfig();
      appStore.stopVoiceInput();
    },
    onError: handleAsrError,
  });

  startAsrWithConfig({
    onFinished: handleAsrFinished,
    onError: handleAsrError,
  });
}

async function handleSendMessage() {
  if (isSending.value || !appState.ui.text.trim()) return;

  isSending.value = true;
  try {
    await appStore.sendMessage();
  } catch (error) {
    console.error("发送消息失败:", error);
    alert("发送消息失败");
  } finally {
    isSending.value = false;
  }
}

function handleInterrupt() {
  if (!appState.avatar.connected) return;

  appStore.interrupt();
}

// 测试LLM连接
async function handleTestLlmConnection() {
  if (isTesting.value) return;

  const { apiKey, model } = appState.llm;
  if (!apiKey) {
    alert("请先输入API Key");
    return;
  }

  isTesting.value = true;
  try {
    const findConfig = SUPPORTED_LLM_MODELS.find((item) => item.value === model) || {label:'openai',baseURL:''};
    await llmService.testConnection({
      provider: findConfig?.label,
      model,
      apiKey,
      baseURL: findConfig?.baseURL,
      botId: appState.llm.botId,
    });
    alert("LLM连接成功");
  } catch (error) {
    console.error("LLM连接测试失败:", error);
    alert("请检测LLM连接信息是否正确");
  } finally {
    isTesting.value = false;
  }
}

// 测试ASR连接
async function handleTestAsrConnection() {
  if (isTestingAsr.value) return;

  const { appId, secretId, secretKey, provider } = appState.asr;
  if (!appId || !secretKey) {
    alert("请先填写完整的ASR配置信息");
    return;
  }

  isTestingAsr.value = true;
  try {
    // 创建新的ASR实例进行测试
    const { testConnection } = useAsr({
      provider: provider as AsrProvider,
      appId,
      secretId,
      secretKey,
    });

    await testConnection();
    alert("ASR服务连接测试成功");
  } catch (error) {
    console.error("ASR连接测试失败:", error);
    alert("请检测ASR连接信息是否正确");
  } finally {
    isTestingAsr.value = false;
  }
}
// 重置ASR配置 - 从配置文件加载对应服务商的密钥
function handleProviderChange() {
  const config = configCache.value;
  if (!config) {
    appState.asr.appId = "";
    appState.asr.secretId = "";
    appState.asr.secretKey = "";
    return;
  }

  const provider = appState.asr.provider;
  // 从配置中获取对应服务商的密钥
  const asrConfig = getAsrConfig(config, provider);

  // 更新到全局状态
  appState.asr.appId = asrConfig.appId;
  appState.asr.secretId = asrConfig.secretId || "";
  appState.asr.secretKey = asrConfig.secretKey;
}

// 重置LLM配置 - 从配置文件加载对应模型的密钥
function handleModelChange() {
  const config = configCache.value;
  if (!config) {
    appState.llm.apiKey = "";
    appState.llm.botId = "";
    return;
  }
  
  const model = appState.llm.model;
  // 从配置中获取对应模型的密钥
  const llmConfig = getLlmConfig(config, model);

  // 更新到全局状态
  appState.llm.apiKey = llmConfig.apiKey;
  // 只有coze模型需要botId
  appState.llm.botId = model === "coze" ? (llmConfig.botId || "") : "";
}
</script>

<style scoped>
.config-panel {
  width: 420px;
  max-height: 100vh;
  overflow-y: auto;
  padding: 24px;
  background: #ffffff;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  z-index: 999;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}

.config-section,
.control-section,
.message-section {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.section-title h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #555;
}

input,
select,
textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
}

textarea {
  resize: vertical;
  min-height: 80px;
}

.button-group {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  flex: 1;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
}

.btn-voice {
  background: #28a745;
  color: white;
}

.btn-voice:hover:not(:disabled) {
  background: #1e7e34;
}

.btn-interrupt {
  background: #dc3545;
  color: white;
}

.btn-interrupt:hover:not(:disabled) {
  background: #c82333;
}

/* 滚动条美化 */
.config-panel::-webkit-scrollbar {
  width: 6px;
}

.config-panel::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.config-panel::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.config-panel::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
