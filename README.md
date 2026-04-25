# 智能 Avatar 交互 Demo

[![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)](./CHANGELOG.md)

智能 Avatar 交互 Demo 基于 **Vue 3 + TypeScript + Vite**，整合虚拟人渲染、多服务商 ASR 语音识别以及多种大语言模型，实现"语音输入 → LLM 智能回复 → 虚拟人口播"的完整闭环体验。本项目同时封装了 SDK 初始化、鉴权签名、流式分句播报等能力，支持桌面端和移动端（含微信小程序），便于快速复用到其它业务场景。

> 📝 **最新更新**：v1.0.2 版本新增移动端适配、底部输入框交互、对话状态管理器，并优化了音频初始化和超时保护机制。详见 [CHANGELOG.md](./CHANGELOG.md)

## ✨ 核心特性

- **虚拟人实时渲染**：封装 `XmovAvatar` SDK，支持状态回调、字幕事件、断开重连。
- **多服务商语音识别**：支持腾讯云、讯飞、xmovASR 等多种 ASR 服务商，支持 VAD 静音检测、自定义终止。
- **多模型 LLM 支持**：支持豆包、通义千问、Coze 等多种大语言模型，采用智能缓存策略按句拆分流式推送至 Avatar，支持中英文混合文本的智能切分。
- **移动端完美适配**：响应式布局，桌面端横向布局，移动端纵向布局，输入框固定在底部，类似豆包/Grok 的交互体验。
- **底部输入区域**：数字人渲染区底部集成输入框，支持文字输入和语音输入，发送按钮一键操作。
- **字幕与动画反馈**：实时字幕、语音波形动画、连接占位等用户提示。
- **一体化配置面板**：同屏完成虚拟人、ASR、LLM 的接入配置及交互控制（桌面端可折叠）。
- **SDK 动态加载**：自动加载（本地/CDN）`cryptojs.js`、`speechrecognizer.js`、`xmovAvatar` 并检测状态。
- **状态管理优化**：对话状态管理器统一处理播报队列，超时保护机制确保状态正常恢复。
- **小程序兼容**：支持微信小程序 webview 环境，音频自动初始化，容器检查优化。

## 🏗️ 项目结构

```
apps/base/
├── src/
│   ├── App.vue                 # 根组件：提供全局状态，拼接虚拟人区+配置面板
│   ├── main.ts                 # 入口：初始化外部 SDK 后挂载 Vue
│   ├── style.css               # 全局样式与主题变量
│   ├── components/
│   │   ├── AvatarRender.vue    # 虚拟人渲染区，包含字幕/语音动画/底部输入框
│   │   ├── ConfigPanel.vue     # 配置与交互面板
│   │   └── FloatingButton.vue  # 悬浮按钮（控制配置面板显示/隐藏）
│   ├── views/
│   │   ├── Home.vue            # 首页（数字人交互主页面）
│   │   ├── AvatarSwitch.vue    # 实时换人功能页面
│   │   └── Walk.vue            # 行走功能页面
│   ├── stores/
│   │   └── app.ts              # 业务状态+核心逻辑（连接、播报、语音控制）
│   ├── services/
│   │   ├── avatar.ts           # XmovAvatar SDK 封装
│   │   ├── llm.ts              # LLM 服务管理器
│   │   ├── base-llm.ts         # LLM 基类
│   │   ├── openai-llm.ts       # OpenAI 兼容 LLM 服务
│   │   ├── coze-llm.ts         # Coze LLM 服务
│   │   └── action-manager.ts   # 对话状态管理器（播报队列管理）
│   ├── composables/
│   │   ├── useAsr.ts           # ASR Hook（生命周期 & 事件封装）
│   │   └── asr/                # 各服务商 ASR 实现
│   │       ├── index.ts        # ASR 工厂
│   │       ├── tencent.ts      # 腾讯云 ASR
│   │       ├── xunfei.ts       # 讯飞 ASR
│   │       ├── xmov.ts         # xmovASR
│   │       └── doubao.ts       # 豆包 ASR
│   ├── utils/
│   │   ├── index.ts            # 随机容器、Promise 状态、SSML 等工具
│   │   ├── sdk-loader.ts       # 外部 SDK 动态加载与可用性检查
│   │   ├── config-loader.ts    # 配置文件加载器
│   │   └── uni-communication.ts # 与 uniapp 通信工具
│   ├── lib/
│   │   ├── xmov-asr-signature.ts  # xmovASR 签名
│   │   ├── xmov-speech-recognizer.ts # xmov 语音识别器
│   │   └── asr.ts              # ASR 签名工具
│   ├── constants/index.ts      # 应用常量/默认配置
│   ├── types/index.ts          # 全量 TypeScript 类型声明
│   ├── router/
│   │   └── index.ts            # 路由配置
│   └── assets/                 # 静态资源（语音动画、图标等）
├── public/                     # 本地托管 SDK 资源
│   ├── cryptojs.js
│   ├── speechrecognizer.js
│   └── vite.svg
├── dist/                       # 构建输出目录
├── index.html                  # HTML 入口
├── vite.config.ts              # Vite 配置（已配置相对路径 base: './'）
├── package.json                # 依赖与脚本
├── README.md                   # 项目说明
├── 技术手册.md                 # 技术手册（极简易懂版）
└── CHANGELOG.md                # 版本更新记录
```

## 🚀 快速开始

### 环境要求

- Node.js ≥ 16（推荐 18/20）
- `pnpm`（推荐，亦可使用 `npm` / `yarn`）

### 安装依赖

```bash
pnpm install
```

### 启动开发环境

```bash
pnpm run dev
```

默认开发端口由 Vite 指定（一般为 `5173`）。首次加载会自动注入所需 SDK，如加载失败请根据控制台提示检查网络或 CDN 可用性。

### 构建与预览

```bash
pnpm run build     # 生成生产包
pnpm run preview   # 本地预览 dist 内容
```

## ⚙️ 接入配置

启动页面前需准备以下三类密钥参数，并在配置面板中填写：

1. **虚拟人 SDK**
   - `APP ID`、`APP Secret`（由 XmovAvatar 平台提供）

2. **语音识别（ASR）**
   - 支持服务商：腾讯云、讯飞、xmovASR
   - `ASR App ID`
   - `Secret ID`（部分服务商需要）
   - `Secret Key`

3. **大语言模型（LLM）**
   - 支持模型：豆包、通义千问、Coze 等
   - 默认模型：`doubao-1-5-pro-32k-250115`
   - `API Key`：对应平台的密钥
   - `Bot ID`：Coze 模型需要

> **提示**：
> - 密钥仅保存在浏览器内存中，不会持久化；刷新页面后需重新填写
> - 生产环境请安排服务端代理并妥善保密
> - 移动端配置面板可折叠，底部输入框始终可见，方便快速操作

## 🔄 交互流程速览

1. **SDK 初始化**：`src/main.ts` 调用 `initSDKs()`，依次加载 CryptoJS、SpeechRecognizer、XmovAvatar 并检测就绪。
2. **连接虚拟人**：点击“连接”调用 `appStore.connectAvatar()`，生成随机容器 ID，初始化 SDK 并监听字幕/状态事件。
3. **输入消息**：
   - **文字输入**：在底部输入框直接输入文字
   - **语音输入**：点击语音按钮，说话自动转换为文字并填充到输入框
4. **发送消息**：点击发送按钮，`appStore.sendMessage()` 以流式方式获取 LLM 文本，通过 `ActionManager` 逐句生成 SSML 并推送到 Avatar 实例连贯播报。
5. **字幕与动画**：Avatar 事件触发字幕展示；ASR 状态控制语音动画；连接空闲时显示占位提示。

### 移动端交互
- **桌面端**：数字人在左，配置面板在右（可折叠）
- **移动端**：数字人在上，输入框固定在底部，配置面板可展开查看详细配置

## 🧩 关键模块详解

- **入口与状态提供 (`App.vue`, `main.ts`)**
  - 使用 `provide/inject` 将 `appState`、`appStore` 暴露给子组件。
  - 应用初始化成功后再挂载，确保外部 SDK 可用。

- **业务状态与逻辑 (`src/stores/app.ts`)**
  - 管理 Avatar/ASR/LLM/UI 四类状态字段。
  - `connectAvatar()`：封装连接流程及回调同步，支持容器检查和等待机制（小程序环境优化）。
  - `sendMessage()`：支持流式 LLM，采用智能缓存策略（最小字符数阈值、中英文标点识别）进行文本切分，提升播报自然度。
  - 优化后的流式处理：首句需达到最小字符数且遇到标点符号，后续句子遇到标点即可发送，响应更快。
  - 添加超时保护机制，确保状态正常恢复，避免一直显示"发送中"。

- **对话状态管理器 (`src/services/action-manager.ts`)**
  - 统一管理 speak 队列，支持多段内容连续播报。
  - 自动处理首帧/末帧标记，确保播报流畅连贯。
  - 断开连接时自动重置队列，防止悬挂任务。

- **LLM 服务 (`src/services/llm.ts`)**
  - 惰性初始化 OpenAI 客户端（浏览器态需开启 `dangerouslyAllowBrowser`）。
  - `sendMessageWithStream()` 返回 `AsyncIterable<string>`，供 Store 逐段消费。

- **Avatar 服务 (`src/services/avatar.ts`)**
  - 负责生成容器 ID、拼装 `gatewayServer`、注册事件处理。
  - 使用 `Promise.allSettled` 结合进度回调确保成功加载，否则抛出错误。

- **语音识别 Hook (`src/composables/useAsr.ts`)**
  - 封装启动/停止/事件回调逻辑，并将识别文本写入响应式 `asrText`。
  - 支持多服务商：腾讯云、讯飞、xmovASR、豆包 ASR。
  - 通过各服务商的签名实现生成所需的鉴权信息。

- **数字人渲染组件 (`src/components/AvatarRender.vue`)**
  - 集成底部输入区域，支持文字和语音输入。
  - 移动端适配：输入框固定在底部，适配安全区域。
  - 音频初始化：小程序环境下自动在用户交互时初始化音频上下文。

- **外部 SDK Loader (`src/utils/sdk-loader.ts`)**
  - 优先加载本地 `public` 目录脚本。
  - 若本地加载失败则回退至 CDN（如 CryptoJS）。
  - `waitForSDK()` 轮询全局对象，保障初始化顺序。

## 🧪 调试辅助

- `public/cryptojs.js`、`public/speechrecognizer.js`：如需替换 SDK 版本，可直接覆盖本地文件。
- `test-asr.html`：独立测试腾讯云 ASR 签名流程，便于确认密钥是否正确。
- `src/stores/sdk-test.html`：原始 Xmov TTSA 调试页，可用于排查底层连接。
- 打包后的 `dist/` 下生成 `cryptojs.js`、`speechrecognizer.js` 方便离线部署。

## 📱 移动端与小程序支持

### 响应式布局
- **桌面端**（>768px）：横向布局，数字人在左，配置面板在右
- **移动端**（≤768px）：纵向布局，数字人在上，输入框固定在底部

### 小程序环境
- 支持微信小程序 webview
- 容器自动检查和等待机制
- 音频在用户交互时自动初始化
- 适配安全区域（safe-area-inset）

### 构建配置
- 使用相对路径（`base: './'`），方便部署到任意路径
- 资源使用相对路径引用，不依赖外部 CDN

## 🛠️ 开发建议

- 建议在开发模式下打开浏览器控制台，观察 `SDK加载状态`、`LLM请求`、`ASR配置` 等日志。
- 若遇到 `WebAudioSpeechRecognizer 未加载`，请确认 HTTPS 环境及麦克风权限已授予。
- **移动端调试**：使用 Chrome DevTools 的设备模拟器或真机调试，检查音频初始化和状态管理。
- **小程序调试**：使用微信开发者工具的真机调试功能，查看容器和音频相关问题。
- 生产环境应将 LLM/ASR 调用迁移到服务端代理，避免暴露密钥。
- 若需要支持更多模型或 ASR 提供商，可扩展 `SUPPORTED_LLM_MODELS`、`SUPPORTED_ASR_PROVIDERS`。

## 📦 依赖信息

`apps/base/package.json` 当前定义的核心依赖：

- 运行时：`vue@3.5.18`
- 构建链：`vite@7.1.2`、`@vitejs/plugin-vue@6.0.1`
- 类型工具：`typescript@~5.8.3`、`vue-tsc@3.0.5`
- LLM SDK：`openai@5.12.2`

> 注意：`openai` 目前位于 `devDependencies`，但在浏览器端也会被使用。如需严格区分运行时依赖，可视情况挪至 `dependencies`。

## 📋 版本历史

详细的版本更新记录请查看 [CHANGELOG.md](./CHANGELOG.md)。

### 当前版本：v1.0.2

**主要改进：**
- ✨ 新增对话状态管理器（ActionManager），统一处理播报队列，确保流畅连贯
- 📱 新增移动端完美适配，响应式布局，输入框固定在底部
- 🎨 新增底部输入区域，集成在数字人渲染区，支持文字和语音输入
- 🔊 优化音频初始化，小程序环境下在用户交互时自动初始化
- ⏱️ 添加超时保护机制，避免状态一直卡住（发送中、连接中等）
- 🐛 修复小程序环境下容器检查和初始化时序问题
- 🐛 修复移动端输入框被挤出视口的问题
- 🐛 修复状态不返回和音频播放问题

## ❓ 常见问题

### 连接与初始化
- **虚拟人连接失败**：
  - 确认 APP ID/Secret 正确
  - 查看控制台 `SDK连接失败` 详细错误
  - 小程序环境：确认容器已渲染且有尺寸（不为 0x0）

- **SDK 初始化失败**：
  - 检查网络连接，确保能访问 CDN
  - 查看控制台 `SDK加载状态`
  - 确认 `cryptojs.js`、`speechrecognizer.js` 已加载

### 语音识别
- **ASR 无法启动**：
  - 确保 HTTPS 环境、麦克风权限已授予
  - 密钥填写完整（App ID、Secret Key 必须）
  - 检查签名函数是否加载
  - 小程序环境：确认 webview 已授权麦克风权限

### 对话与播报
- **LLM 无响应**：
  - 核对 API Key、账户调用额度
  - 若需自建代理，请同步修改 `baseURL`
  - 检查网络连接，查看控制台网络请求

- **状态一直显示"发送中"**：
  - 已添加超时保护（30秒），会自动恢复
  - 检查 LLM 服务是否正常响应
  - 查看控制台错误日志

- **没有声音**：
  - 检查浏览器音量是否被静音
  - 小程序环境：确保在用户交互后初始化音频
  - 查看控制台是否有音频相关错误
  - 确认数字人 SDK 的音频通道正常

### 移动端
- **输入框被挤出视口**：
  - 已优化定位方式，使用绝对定位 + safe-area-inset
  - 确认容器高度设置正确

- **配置面板遮挡数字人**：
  - 移动端默认折叠配置面板
  - 点击悬浮按钮可展开/收起
  - 底部输入框始终可见，方便操作

### 小程序环境
- **renderScheduler 未定义错误**：
  - 已添加容器检查和等待机制
  - 确认容器元素已渲染到 DOM
  - 等待容器有有效尺寸后再初始化 SDK

- **音频无法播放**：
  - 在用户交互（点击按钮）时自动初始化
  - 确认小程序已授权音频权限
  - 检查是否在小程序 webview 环境

---

## 📚 相关文档

- [技术手册.md](./技术手册.md) - 极简易懂的技术手册
- [CHANGELOG.md](./CHANGELOG.md) - 详细的版本更新记录
- [COMPATIBILITY_ANALYSIS.md](./COMPATIBILITY_ANALYSIS.md) - 兼容性分析报告