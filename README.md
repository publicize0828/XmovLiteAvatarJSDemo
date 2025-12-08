# 智能 Avatar 交互 Demo

[![Version](https://img.shields.io/badge/version-1.0.1-blue.svg)](./CHANGELOG.md)

智能 Avatar 交互 Demo 基于 **Vue 3 + TypeScript + Vite**，整合虚拟人渲染、腾讯云 ASR 语音识别以及豆包系大语言模型，实现"语音输入 → LLM 智能回复 → 虚拟人口播"的完整闭环体验。本项目同时封装了 SDK 初始化、鉴权签名、流式分句播报等能力，便于快速复用到其它业务场景。

> 📝 **最新更新**：v1.0.1 版本优化了流式对话处理逻辑，采用更智能的文本缓存和切分策略，提升了语音播报的自然度和响应速度。详见 [CHANGELOG.md](./CHANGELOG.md)

## ✨ 核心特性

- **虚拟人实时渲染**：封装 `XmovAvatar` SDK，支持状态回调、字幕事件、断开重连。
- **语音识别链路**：集成腾讯云 WebAudio 识别器，支持 VAD 静音检测、自定义终止。
- **LLM 流式播报**：对接豆包 `doubao-1-5-pro-32k-250115`，采用智能缓存策略按句拆分流式推送至 Avatar，支持中英文混合文本的智能切分。
- **字幕与动画反馈**：实时字幕、语音波形动画、连接占位等用户提示。
- **一体化配置面板**：同屏完成虚拟人、ASR、LLM 的接入配置及交互控制。
- **SDK 动态加载**：自动加载（本地/CDN）`cryptojs.js`、`speechrecognizer.js`、`xmovAvatar` 并检测状态。

## 🏗️ 项目结构

```
apps/base/
├── src/
│   ├── App.vue                 # 根组件：提供全局状态，拼接虚拟人区+配置面板
│   ├── main.ts                 # 入口：初始化外部 SDK 后挂载 Vue
│   ├── style.css               # 全局样式与主题变量
│   ├── components/
│   │   ├── AvatarRender.vue    # 虚拟人渲染区，包含字幕/语音动画/占位提示
│   │   └── ConfigPanel.vue     # 配置与交互面板
│   ├── stores/
│   │   ├── app.ts              # 业务状态+核心逻辑（连接、播报、语音控制）
│   │   └── sdk-test.html       # Xmov TTSA 原生调试页（保留参考）
│   ├── services/
│   │   ├── avatar.ts           # XmovAvatar SDK 封装
│   │   └── llm.ts              # OpenAI 兼容 LLM 客户端封装
│   ├── composables/useAsr.ts   # 腾讯云 ASR Hook（生命周期 & 事件封装）
│   ├── utils/
│   │   ├── index.ts            # 随机容器、Promise 状态、SSML 等工具
│   │   ├── sdk-loader.ts       # 外部 SDK 动态加载与可用性检查
│   │   └── sse-parser.ts       # SSE 流式响应解析器
│   ├── lib/asr.ts              # 腾讯云 ASR HMAC-SHA1 签名实现
│   ├── constants/index.ts      # 应用常量/默认配置
│   ├── types/index.ts          # 全量 TypeScript 类型声明
│   └── assets/                 # 静态资源（语音动画、图标等）
├── public/                     # 本地托管 SDK 资源
│   ├── cryptojs.js
│   ├── speechrecognizer.js
│   └── vite.svg
├── test-asr.html               # 独立的 ASR 签名链路测试页
├── package.json                # 依赖与脚本
└── vite.config.ts              # Vite 配置
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

启动页面前需准备以下三类密钥参数，并在右侧面板中填写：

1. **虚拟人 SDK**
   - `APP ID`、`APP Secret`（由 XmovAvatar 平台提供）

2. **腾讯云 ASR**
   - `ASR App ID`
   - `Secret ID`
   - `Secret Key`

3. **大语言模型**
   - 模型列表：默认为 `doubao-1-5-pro-32k-250115`
   - `API Key`：豆包开放平台或兼容 OpenAI 的密钥
   - 如需自定义接口域名，可在 `src/constants/index.ts` 中修改 `LLM_CONFIG.BASE_URL`

> **提示**：密钥仅保存在浏览器内存中，不会持久化；刷新页面后需重新填写。生产环境请安排服务端代理并妥善保密。

## 🔄 交互流程速览

1. **SDK 初始化**：`src/main.ts` 调用 `initSDKs()`，依次加载 CryptoJS、SpeechRecognizer、XmovAvatar 并检测就绪。
2. **连接虚拟人**：点击“连接”调用 `appStore.connectAvatar()`，生成随机容器 ID，初始化 SDK 并监听字幕/状态事件。
3. **语音识别**：点击“语音输入”拉起 `useAsr()`，创建 `WebAudioSpeechRecognizer` 实例，回调写入文案。
4. **LLM 流式播报**：`appStore.sendMessage()` 以流式方式获取 LLM 文本，`splitSentence()` 逐句生成 SSML，推送到 Avatar 实例连贯播报。
5. **字幕与动画**：Avatar 事件触发字幕展示；ASR 状态控制语音动画；连接空闲时显示占位提示。

## 🧩 关键模块详解

- **入口与状态提供 (`App.vue`, `main.ts`)**
  - 使用 `provide/inject` 将 `appState`、`appStore` 暴露给子组件。
  - 应用初始化成功后再挂载，确保外部 SDK 可用。

- **业务状态与逻辑 (`src/stores/app.ts`)**
  - 管理 Avatar/ASR/LLM/UI 四类状态字段。
  - `connectAvatar()`：封装连接流程及回调同步。
  - `sendMessage()`：支持流式 LLM，采用智能缓存策略（最小字符数阈值、中英文标点识别）进行文本切分，提升播报自然度。
  - 优化后的流式处理：首句需达到最小字符数且遇到标点符号，后续句子遇到标点即可发送，响应更快。

- **LLM 服务 (`src/services/llm.ts`)**
  - 惰性初始化 OpenAI 客户端（浏览器态需开启 `dangerouslyAllowBrowser`）。
  - `sendMessageWithStream()` 返回 `AsyncIterable<string>`，供 Store 逐段消费。

- **Avatar 服务 (`src/services/avatar.ts`)**
  - 负责生成容器 ID、拼装 `gatewayServer`、注册事件处理。
  - 使用 `Promise.allSettled` 结合进度回调确保成功加载，否则抛出错误。

- **语音识别 Hook (`src/composables/useAsr.ts`)**
  - 封装启动/停止/事件回调逻辑，并将识别文本写入响应式 `asrText`。
  - 通过 `lib/asr.ts` 的 `signCallback` 生成腾讯云所需 HMAC-SHA1 签名。

- **外部 SDK Loader (`src/utils/sdk-loader.ts`)**
  - 优先加载本地 `public` 目录脚本。
  - 若本地加载失败则回退至 CDN（如 CryptoJS）。
  - `waitForSDK()` 轮询全局对象，保障初始化顺序。

## 🧪 调试辅助

- `public/cryptojs.js`、`public/speechrecognizer.js`：如需替换 SDK 版本，可直接覆盖本地文件。
- `test-asr.html`：独立测试腾讯云 ASR 签名流程，便于确认密钥是否正确。
- `src/stores/sdk-test.html`：原始 Xmov TTSA 调试页，可用于排查底层连接。
- 打包后的 `dist/` 下生成 `cryptojs.js`、`speechrecognizer.js` 方便离线部署。

## 🛠️ 开发建议

- 建议在开发模式下打开浏览器控制台，观察 `SDK加载状态`、`LLM请求`、`ASR配置` 等日志。
- 若遇到 `WebAudioSpeechRecognizer 未加载`，请确认 HTTPS 环境及麦克风权限已授予。
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

### 当前版本：v1.0.1

**主要改进：**
- ✨ 新增 SSE 流式解析器，支持更稳定的流式响应处理
- 🚀 优化流式对话处理逻辑，采用智能缓存策略提升播报自然度
- 🔧 优化 SSML 生成，自动转义特殊字符，提升兼容性
- ⚡ 移除不必要的 `think()` 调用，提升响应速度
- 🐛 修复 SSE 解析器在部分浏览器环境下的兼容性问题

## ❓ 常见问题

- **虚拟人连接失败**：确认 APP ID/Secret 正确；查看控制台 `SDK连接失败` 详细错误。
- **ASR 无法启动**：确保 HTTPS 环境、麦克风权限、密钥填写完整；检查签名函数是否加载。
- **LLM 无响应**：核对 API Key、账户调用额度；若需自建代理，请同步修改 `baseURL`。
- **字幕不更新**：确认 Avatar SDK 已触发 `subtitle_on` 事件；必要时重连虚拟人实例。



# 数字人全链路标准化服务系统及核心应用介绍
本系统旨在通过标准化服务模式，为终端场景提供数字人领域的全栈能力支持，涵盖3D数字人模型资产、动作表情库、实时驱动引擎、语音交互模块及创新AI能力。为实现“高质量、高效率、高稳定性”的服务输出目标，需以**全流程自动化、生产标准统一化、数据格式规范化**为核心抓手，构建从资产生产到终端交付的端到端闭环。基于此诉求，我们自研五大核心应用，落地数字人标准化服务方案，具体功能如下：


## 1. 枢合：资产需求与标准化初始化平台
作为数字人资产生产的“源头管理中枢”，主要服务于项目经理与产线产品经理，核心功能包括：
- **需求与任务管理**：集中收集公司内部各业务线的数字人资产需求，形成需求池并完成任务拆解与下发；
- **标准化数据定标**：联合研发团队明确资产标准化数据规范（如模型拓扑、贴图格式、骨骼绑定标准等）；
- **自动化初始化**：基于既定标准，自动完成资产数据的标准化创建，避免后续生产环节的基础格式偏差。


## 2. 灵犀：产线标准化高效生产与交付平台
聚焦数字人资产生产全流程的效率与标准落地，以“最佳实践”为导向，覆盖“生产-审核-入库”全环节：
- **角色化任务分发**：根据产线角色（如建模师、绑定师、动捕师）精准分配任务，屏蔽无关信息干扰，聚焦核心生产环节；
- **交付物自动自检**：美术师提交工程文件时，系统自动对照预设标准（如面数阈值、UV展开规范、材质球统一性）进行检测，同步生成量化改善建议，确保交付物符合标准化要求；
- **一站式QC审批**：美术师与质检（QC）人员在同一平台完成资产审核流程，无需跨系统操作，实现“审核-反馈-修改-重审”的闭环，直达标准交付状态。


## 3. 羲和：自动化任务调度与监控系统
作为数字人资产生产的“自动化引擎”，负责工程文件的自动化处理与任务全生命周期管理：
- **自动化文件生成**：将上游标准化工程文件自动转换为下游终端可直接调用的格式（如实时渲染模型、视频素材、交互资产包）；
- **离线视频生产**：支持批量离线渲染数字人视频，满足大规模内容生产需求；
- **全链路任务管理**：所有自动化任务统一接入系统，实现“策略化分发、实时监控、异常自动告警、进度可视化追踪”，保障任务高效执行与问题快速定位。


## 4. 星云：资产标准化服务化平台
承担数字人资产“标准化质检”与“服务化输出”的核心职能，是连接生产端与终端的关键枢纽：
- **标准化QC核验**：对上游交付的资产进行二次标准化核验，确保数据一致性与合规性，杜绝非标资产流入终端；
- **资产服务化封装**：将通过质检的标准化资产封装为终端可调用的服务接口（如API、SDK），实现资产的快速集成与规模化复用。


## 5. 河图：资产场景验证与创新管理平台
聚焦数字人资产的“场景化落地”与“技术创新验证”，同时承担角色产线的资产管理职能：
- **场景化效果QC**：在实际应用场景（如直播、虚拟交互、影视特效）中验证资产效果，确保资产性能与场景需求匹配；
- **数字人二次生产**：基于标准化基础资产，支持个性化调整与二次创作（如形象定制、动作扩展），平衡标准化与个性化需求；
- **创新技术验证**：为数字人领域的新技术（如AI驱动表情、实时交互算法、多模态融合）提供验证环境，推动技术落地与迭代；
- **角色产线资产管理**：对特定角色产线（如品牌虚拟代言人、行业定制数字人）的全生命周期资产进行统一管理，包括版本控制、权限分配、资产复用统计。
