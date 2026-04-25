<template>
  <div class="container">
    <div class="header">
      <h2>自定义事件 Demo</h2>
      <p>演示如何在语音中使用 &lt;uievent&gt; 标签触发自定义事件，实现多模态内容展示</p>
    </div>
    <div class="content">
      <div class="avatar-section">
        <div :id="containerId" class="avatar-container" />
        <div v-if="!avatarInstance && !loading" class="loading">请先连接数字人</div>
        <!-- UI内容展示区域：固定层级与位置 -->
        <div class="ui-content-area">
          <!-- 图片：最底层、居中、16:9 宽400 -->
          <div 
            v-for="(item, index) in displayedContent.filter(i => i.type === 'image')" 
            :key="'img-' + index" 
            class="content-item content-item--image"
          >
            <div class="image-content">
              <img :src="item.data.image || item.data.url" :alt="item.data.title || '图片'" />
              <div v-if="item.data.title" class="content-title">{{ item.data.title }}</div>
            </div>
            <button class="close-btn" @click="removeContentByItem(item)">×</button>
          </div>
          <!-- 公司链接：左上角，层级高于图片 -->
          <div 
            v-for="(item, index) in displayedContent.filter(i => i.type === 'link')" 
            :key="'link-' + index" 
            class="content-item content-item--link"
          >
            <a :href="item.data.url" target="_blank" class="link-card">
              <div v-if="item.data.image" class="link-image">
                <img :src="item.data.image" :alt="item.data.title" />
              </div>
              <div class="link-info">
                <div class="link-title">{{ item.data.title || '链接' }}</div>
                <div v-if="item.data.description" class="link-desc">{{ item.data.description }}</div>
                <div class="link-url">{{ item.data.url }}</div>
              </div>
            </a>
            <button class="close-btn" @click="removeContentByItem(item)">×</button>
          </div>
          <!-- 3D模型：右下角（只显示当前一个） -->
          <div 
            v-if="currentModel3d"
            class="content-item content-item--model3d"
          >
            <div class="model-placeholder">
              <div class="model-icon">3D</div>
              <div class="model-title">{{ currentModel3d.data.title || '3D模型' }}</div>
              <div class="model-url">{{ currentModel3d.data.url || currentModel3d.data.model_url }}</div>
              <div class="model-note">3D模型需要集成Three.js等3D库进行渲染</div>
            </div>
            <button class="close-btn" @click="removeContentByItem(currentModel3d)">×</button>
          </div>
          <!-- 视频：中间区域 -->
          <div 
            v-for="(item, index) in displayedContent.filter(i => i.type === 'video')" 
            :key="'video-' + index" 
            class="content-item content-item--video"
          >
            <div class="video-content">
              <video :src="item.data.video || item.data.url" controls :poster="item.data.cover" />
              <div v-if="item.data.title" class="content-title">{{ item.data.title }}</div>
            </div>
            <button class="close-btn" @click="removeContentByItem(item)">×</button>
          </div>
          <!-- 文本卡片：视频下方 -->
          <div 
            v-for="(item, index) in displayedContent.filter(i => i.type === 'text')" 
            :key="'text-' + index" 
            class="content-item content-item--text"
          >
            <div class="text-title">{{ item.data.title || '文本内容' }}</div>
            <div class="text-body">{{ item.data.text_content || item.data.text }}</div>
            <button class="close-btn" @click="removeContentByItem(item)">×</button>
          </div>
          <!-- 其他自定义类型 -->
          <!-- <div 
            v-for="(item, index) in displayedContent.filter(i => i.type === 'custom')" 
            :key="'custom-' + index" 
            class="content-item content-item--custom"
          >
            <div class="custom-title">{{ item.data.type || '自定义内容' }}</div>
            <pre>{{ JSON.stringify(item.data, null, 2) }}</pre>
            <button class="close-btn" @click="removeContentByItem(item)">×</button>
          </div> -->
        </div>
      </div>
      <div class="panel">
        <div class="group">
          <h3>连接设置</h3>
          <div><label>App ID:</label><input v-model="appId" /></div>
          <div><label>App Secret:</label><input v-model="appSecret" /></div>
          <div><label>Gateway:</label><input v-model="gatewayServer" /></div>
          <div class="btns">
            <button @click="connectAvatar" :disabled="loading || !!avatarInstance">
              {{ loading ? `连接中... ${progress}%` : '连接' }}
            </button>
            <button @click="disconnectAvatar" :disabled="!avatarInstance">断开</button>
          </div>
        </div>

        <div class="group">
          <h3>回调方式选择</h3>
          <div class="radio-group">
            <label>
              <input type="radio" v-model="callbackMode" value="proxy" />
              <span>proxyWidget (推荐)</span>
              <small>SDK默认处理字幕和背景图片，只接管自定义事件</small>
            </label>
            <label>
              <input type="radio" v-model="callbackMode" value="full" />
              <span>onWidgetEvent</span>
              <small>全面接管所有UI事件，包括字幕和背景图片</small>
            </label>
          </div>
        </div>

        <div class="group">
          <h3>显示设置</h3>
          <div class="setting-item">
            <label>
              <input type="checkbox" v-model="contentTransparent" />
              <span>内容半透明显示</span>
              <small>避免遮挡数字人（数字人层级为100，内容层级为50）</small>
            </label>
          </div>
        </div>

        <div class="group">
          <h3>示例模板</h3>
          <div class="template-list">
            <button 
              v-for="(template, idx) in templates" 
              :key="idx"
              @click="loadTemplate(template)"
              class="template-btn"
            >
              {{ template.name }}
            </button>
          </div>
        </div>

        <div class="group">
          <h3>说话内容</h3>
          <textarea v-model="speakText" rows="10" placeholder="输入SSML格式的内容，可以使用 &lt;uievent&gt; 标签定义自定义事件"></textarea>
          <button @click="speak" :disabled="!avatarInstance" class="speak-btn">发送并说话</button>
        </div>

        <div class="group">
          <h3>事件日志</h3>
          <div class="log-header">
            <span>总计: {{ eventLog.length }}</span>
            <span>自定义: {{ eventLog.filter(e => e.type === 'custom').length }}</span>
            <span>系统: {{ eventLog.filter(e => e.type === 'info').length }}</span>
          </div>
          <div class="log">
            <div v-for="(e, i) in eventLog" :key="i" :class="['item', e.type]">
              <div class="item-header">
                <span class="item-time">{{ e.time }}</span>
                <span class="item-type">{{ e.eventType }}</span>
              </div>
              <pre>{{ JSON.stringify(e.data, null, 2) }}</pre>
            </div>
            <div v-if="!eventLog.length" class="empty">暂无事件</div>
          </div>
          <button @click="clearLog" class="clear-btn">清空日志</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onUnmounted, inject, computed } from 'vue'
import { appStore } from '../stores/app'
import type { AppState } from '../types'

const appStateInjected = inject<AppState>('appState')!
const appStoreInjected = appStore

const containerId = ref(`custom-event-${Date.now()}`)
const loading = ref(false)
const progress = ref(0)
const appId = ref(appStateInjected?.avatar.appId || '')
const appSecret = ref(appStateInjected?.avatar.appSecret || '')
const gatewayServer = ref('https://pre-ttsa-gateway-lite.xingyun3d.com/api/session')
const callbackMode = ref<'proxy' | 'full'>('proxy')
const contentTransparent = ref(true) // 默认半透明，避免遮挡数字人
const displayedContent = ref<Array<{type: string, data: any, timestamp: number}>>([])

// 独立的数字人实例（不共享）- 使用 shallowRef 优化性能
const avatarInstance = shallowRef<any>(null)

// 当前3D模型（只显示最新的一个）
const currentModel3d = computed(() => {
  const model3dItems = displayedContent.value.filter(i => i.type === 'model3d')
  return model3dItems.length > 0 ? model3dItems[model3dItems.length - 1] : null
})

// 配置常量 - 提取为常量避免重复创建
const config = {
  auto_ka: true,
  cleaning_text: true,
  emotion_version: "v1_version",
  figure_name: "SCF25_001",
  framedata_proto_version: 2,
  init_events: [],
  is_large_model: false,
  is_vertical: true,
  language: "chinese",
  lite_drive_style: "service1",
  llm_name: "Doubao",
  look_name: "N_Wuliping_14333_new",
  mp_service_id: "F_CN02_show52",
  optional_emotion: "serious,smile,confused",
  pitch: 1,
  raw_audio: false,
  render_preset: "1080x1920_fullbody",
  resolution: { height: 1920, width: 1080 },
  sta_face_id: "F_lively02_xiaoze",
  tts_emotion: "neutral",
  tts_speed: 1,
  tts_split_length: 16,
  tts_split_row: 1,
  tts_vcn_id: "XMOV_HN_TTS__43",
  volume: 1
} as const;

// 示例模板
const templates = [
  {
    name: '图片展示',
    ssml: `<speak>
  <uievent>
    <type>show_image</type>
    <data>
      <image>https://media.xingyun3d.com/xingyun3d/general/litehuman/background_2D/jushen_v1_black_and_gold_style_office_02.png</image>
      <title>办公室场景</title>
    </data>
  </uievent>
  这是我们的办公室场景图片。
</speak>`
  },
  {
    name: '视频播放',
    ssml: `<speak>
  <uievent>
    <type>show_video</type>
    <data>
      <video>https://media.xingyun3d.com/xingyun3d/general/official_website/xingyun_open_v2/f7b110-37e2a1-c6d05a.mp4</video>
      <cover>https://example.com/cover.jpg</cover>
      <title>产品介绍视频</title>
    </data>
  </uievent>
  让我为您播放产品介绍视频。
</speak>`
  },
  {
    name: '网站链接',
    ssml: `<speak>
  <uievent>
    <type>show_link</type>
    <data>
      <url>https://www.xingyun3d.com</url>
      <title>官方网站</title>
      <description>访问我们的官方网站了解更多信息</description>
      <image>https://xingyun3d.com/favicon.ico</image>
    </data>
  </uievent>
  您可以访问我们的官方网站了解更多详情。
</speak>`
  },
  {
    name: '3D模型',
    ssml: `<speak>
  <uievent>
    <type>show_model3d</type>
    <data>
      <model_url>https://example.com/model.glb</model_url>
      <title>产品3D模型</title>
    </data>
  </uievent>
  这是产品的3D模型展示。
</speak>`
  },
  {
    name: '文本卡片',
    ssml: `<speak>
  <uievent>
    <type>show_text</type>
    <data>
      <title>重要提示</title>
      <text_content>这是一段重要的文本内容，可以用于展示FAQ、说明文档等。</text_content>
    </data>
  </uievent>
  让我为您展示重要信息。
</speak>`
  },
  {
    name: '多模态组合',
    ssml: `<speak>
  <uievent>
    <type>show_image</type>
    <data>
      <image>https://media.xingyun3d.com/xingyun3d/general/litehuman/background_2D/jushen_v1_black_and_gold_style_office_02.png</image>
      <title>场景图片</title>
    </data>
  </uievent>
  首先展示场景图片。
  <uievent>
    <type>show_video</type>
    <data>
      <video>https://media.xingyun3d.com/xingyun3d/general/official_website/xingyun_open_v2/f7b110-37e2a1-c6d05a.mp4</video>
      <cover>https://example.com/cover.jpg</cover>
      <title>产品介绍视频</title>
    </data>
  </uievent>
  让我为您播放产品介绍视频。
  <uievent>
    <type>show_link</type>
    <data>
      <url>https://www.example.com</url>
      <title>相关链接</title>
    </data>
  </uievent>
  然后提供相关链接。
  <uievent>
    <type>show_model3d</type>
    <data>
      <model_url>https://example.com/model.glb</model_url>
      <title>产品3D模型</title>
    </data>
  </uievent>
  这是产品的3D模型展示。
</speak>`
  }
]

const speakText = ref(templates[0].ssml)
const eventLog = ref<{time: string, eventType: string, data: any, type: 'custom'|'info'}[]>([])

function addEventLog(eventType: string, data: any, type: 'custom'|'info' = 'custom') {
  eventLog.value.unshift({ 
    time: new Date().toLocaleTimeString(), 
    eventType, 
    data, 
    type 
  });
  // 限制日志数量，避免内存泄漏
  if (eventLog.value.length > 100) {
    eventLog.value = eventLog.value.slice(0, 100);
  }
}

function loadTemplate(template: typeof templates[0]) {
  // 清空之前展示的内容
  displayedContent.value = []
  // 加载新模板
  speakText.value = template.ssml
  // 如果数字人已连接，自动发送
  if (avatarInstance.value) {
    speak()
  }
}

function removeContentByItem(item: { type: string; data: any; timestamp: number }) {
  const i = displayedContent.value.indexOf(item)
  if (i !== -1) displayedContent.value.splice(i, 1)
}

// 处理UI事件，展示多模态内容
function handleUIEvent(data: any) {
  const eventType = data.type || data.data?.type
  const eventData = data.data || data
  
  addEventLog(eventType, eventData, 'custom')
  
  // 根据事件类型展示不同的内容
  if (eventType === 'show_image' || eventType === 'widget_pic') {
    displayedContent.value.push({
      type: 'image',
      data: {
        image: eventData.image || eventData.url,
        title: eventData.title
      },
      timestamp: Date.now()
    })
  } else if (eventType === 'show_video' || eventType === 'widget_video') {
    displayedContent.value.push({
      type: 'video',
      data: {
        video: eventData.video || eventData.url,
        cover: eventData.cover,
        title: eventData.title
      },
      timestamp: Date.now()
    })
  } else if (eventType === 'show_link') {
    displayedContent.value.push({
      type: 'link',
      data: {
        url: eventData.url,
        title: eventData.title,
        description: eventData.description,
        image: eventData.image
      },
      timestamp: Date.now()
    })
  } else if (eventType === 'show_model3d') {
    // 移除旧的3D模型，只保留最新的一个
    displayedContent.value = displayedContent.value.filter(i => i.type !== 'model3d')
    displayedContent.value.push({
      type: 'model3d',
      data: {
        model_url: eventData.model_url || eventData.url,
        title: eventData.title
      },
      timestamp: Date.now()
    })
  } else if (eventType === 'show_text' || eventType === 'widget_text') {
    displayedContent.value.push({
      type: 'text',
      data: {
        title: eventData.title,
        text_content: eventData.text_content || eventData.text
      },
      timestamp: Date.now()
    })
  } else {
    // 其他自定义事件
    displayedContent.value.push({
      type: 'custom',
      data: eventData,
      timestamp: Date.now()
    })
  }
}

async function connectAvatar() {
  if (!appId.value || !appSecret.value) {
    alert('请先配置 AppId 和 AppSecret')
    return
  }

  if (avatarInstance.value) return

  loading.value = true
  progress.value = 0

  try {
    const finalConfig = {
      ...config,
      enable_asr: false,
      asr_enabled: false
    }

    // 创建独立的数字人实例
    avatarInstance.value = await appStoreInjected.createAvatarInstance({
      containerId: containerId.value,
      appId: appId.value,
      appSecret: appSecret.value,
      gatewayServer: gatewayServer.value,
      config: finalConfig,
      useInvisibleMode: false,
      onStatusChange: (status: any) => {
        console.log('CustomEvent Status:', status)
      },
      onWidgetEvent: callbackMode.value === 'full' ? (data: any) => {
        const eventType = data.type
        // 如果是字幕或背景图片，可以选择处理或忽略
        if (eventType === 'subtitle_on' || eventType === 'subtitle_off' || eventType === 'widget_pic') {
          addEventLog(eventType, data, 'info')
          return
        }
        // 处理其他自定义事件
        handleUIEvent(data)
      } : undefined,
      proxyWidget: callbackMode.value === 'proxy' ? {
        show_image: (widgetData: any) => {
          handleUIEvent(widgetData)
        },
        show_video: (widgetData: any) => {
          handleUIEvent(widgetData)
        },
        show_link: (widgetData: any) => {
          handleUIEvent(widgetData)
        },
        show_model3d: (widgetData: any) => {
          handleUIEvent(widgetData)
        },
        show_text: (widgetData: any) => {
          handleUIEvent(widgetData)
        },
        widget_video: (widgetData: any) => {
          handleUIEvent(widgetData)
        },
        widget_text: (widgetData: any) => {
          handleUIEvent(widgetData)
        }
      } : undefined,
      onDownloadProgress: (prog: number) => {
        progress.value = prog
        if (prog === 100) {
          loading.value = false
        }
      }
    })
    
    addEventLog('connected', { message: '连接成功' }, 'info')
    loading.value = false
    progress.value = 100
  } catch (e: any) {
    alert('连接失败: ' + (e.message || '未知错误'))
    loading.value = false
    avatarInstance.value = null
  }
}

async function disconnectAvatar() {
  if (avatarInstance.value) {
    try {
      await avatarInstance.value.destroy()
    } catch (e) {
      console.error('断开失败:', e)
    }
    avatarInstance.value = null
  }
  displayedContent.value = []
  addEventLog('disconnected', { message: '已断开' }, 'info')
}

function speak() {
  const instance = avatarInstance.value
  if (!instance || !speakText.value.trim()) {
    alert(instance ? '请输入内容' : '请先连接')
    return
  }
  try {
    instance.speak(speakText.value, true, true)
    addEventLog('speak', { text: speakText.value.substring(0, 100) + '...' }, 'info')
  } catch (e) {
    alert('说话失败: ' + (e as Error).message)
  }
}

function clearLog() {
  eventLog.value = []
}

onUnmounted(() => {
  if (avatarInstance.value) {
    avatarInstance.value.destroy().catch(console.error)
    avatarInstance.value = null
  }
})
</script>

<style scoped>
.container { width: 100vw; height: 100vh; display: flex; flex-direction: column; background: #f5f5f5; }
.header { padding: 20px; background: white; border-bottom: 1px solid #ddd; }
.header h2 { margin: 0 0 8px 0; font-size: 24px; }
.header p { margin: 0; color: #666; font-size: 14px; }
.content { flex: 1; display: flex; gap: 20px; padding: 20px; overflow: hidden; }
.avatar-section { flex: 1; background: #000; position: relative; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
/* 容器与数字人同宽高（9:16 竖屏），居中，事件透传 */
.avatar-container { width: 100%; height: 100%; max-width: 100%; max-height: 100%; position: relative; z-index: 100; pointer-events: none; }
.avatar-container > div { width: 100%; height: 100%; pointer-events: none; }
.avatar-container :deep(canvas), .avatar-container :deep(video) { width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: contain; pointer-events: none; }
.avatar-container :deep(*) { pointer-events: none; }
.loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #fff; z-index: 101; }
.ui-content-area { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 50; }
.ui-content-area .content-item { pointer-events: all; }
.content-item { position: absolute; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; transition: all 0.3s; }
.content-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
/* 图片：最底层、居中、宽400、16:9 */
.content-item--image { bottom: 20px; left: 50%; transform: translateX(-50%); width: 400px; z-index: 1; }
.content-item--image .image-content { width: 100%; aspect-ratio: 16/9; overflow: hidden; }
.content-item--image .image-content img { width: 100%; height: 100%; object-fit: cover; display: block; }
.content-item--image .content-title { padding: 8px 12px; font-weight: 600; border-top: 1px solid #eee; font-size: 14px; }
/* 公司链接：左上角，层级高于图片 */
.content-item--link { top: 20px; left: 20px; width: 280px; z-index: 2; }
.content-item--link .link-card { display: flex; text-decoration: none; color: inherit; }
.content-item--link .link-image { width: 80px; flex-shrink: 0; }
.content-item--link .link-image img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px 0 0 8px; }
.content-item--link .link-info { flex: 1; padding: 10px; }
.content-item--link .link-title { font-weight: 600; margin-bottom: 4px; font-size: 14px; }
.content-item--link .link-desc { font-size: 11px; color: #666; margin-bottom: 4px; }
.content-item--link .link-url { font-size: 10px; color: #007bff; word-break: break-all; }
/* 3D模型：右下角 */
.content-item--model3d { bottom: 20px; right: 20px; width: 220px; z-index: 2; }
.content-item--model3d .model-placeholder { padding: 20px 16px; text-align: center; }
.content-item--model3d .model-icon { font-size: 32px; font-weight: bold; color: #007bff; margin-bottom: 8px; }
.content-item--model3d .model-title { font-weight: 600; margin-bottom: 4px; font-size: 14px; }
.content-item--model3d .model-url { font-size: 10px; color: #666; word-break: break-all; margin-bottom: 8px; }
.content-item--model3d .model-note { font-size: 10px; color: #999; font-style: italic; }
/* 视频：中间偏上 */
.content-item--video { top: 20px; left: 50%; transform: translateX(-50%); width: 400px; z-index: 2; }
.content-item--video .video-content { width: 100%; aspect-ratio: 16/9; overflow: hidden; background: #000; }
.content-item--video .video-content video { width: 100%; height: 100%; object-fit: contain; display: block; }
.content-item--video .content-title { padding: 8px 12px; font-weight: 600; border-top: 1px solid #eee; font-size: 14px; }
/* 文本卡片：视频下方 */
.content-item--text { top: 273px; left: 50%; transform: translateX(-50%); width: 400px; max-height: 240px; overflow-y: auto; z-index: 2; }
.content-item--text .text-title { padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #eee; font-size: 14px; }
.content-item--text .text-body { padding: 12px; line-height: 1.6; font-size: 13px; }
/* 自定义 */
.content-item--custom { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 360px; max-height: 80%; overflow: auto; z-index: 2; }
.content-item--custom .custom-title { padding: 12px; font-weight: 600; border-bottom: 1px solid #eee; }
.content-item--custom pre { padding: 12px; font-size: 11px; overflow-x: auto; margin: 0; }
.content-title { padding: 12px; font-weight: 600; border-top: 1px solid #eee; }
.link-card { display: flex; text-decoration: none; color: inherit; }
.link-image { width: 100px; flex-shrink: 0; }
.link-image img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px 0 0 8px; }
.link-info { flex: 1; padding: 12px; }
.link-title { font-weight: 600; margin-bottom: 4px; }
.link-desc { font-size: 12px; color: #666; margin-bottom: 4px; }
.link-url { font-size: 11px; color: #007bff; word-break: break-all; }
.text-title { padding: 12px; font-weight: 600; border-bottom: 1px solid #eee; }
.text-body { padding: 12px; line-height: 1.6; }
.model-placeholder { padding: 40px 20px; text-align: center; }
.model-icon { font-size: 48px; font-weight: bold; color: #007bff; margin-bottom: 12px; }
.model-title { font-weight: 600; margin-bottom: 8px; }
.model-url { font-size: 12px; color: #666; word-break: break-all; margin-bottom: 12px; }
.model-note { font-size: 11px; color: #999; font-style: italic; }
.custom-title { padding: 12px; font-weight: 600; border-bottom: 1px solid #eee; }
.custom-content pre { padding: 12px; font-size: 11px; overflow-x: auto; margin: 0; }
.close-btn { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; border: none; background: rgba(0,0,0,0.5); color: white; border-radius: 50%; cursor: pointer; font-size: 18px; line-height: 1; z-index: 3; }
.close-btn:hover { background: rgba(0,0,0,0.7); }
.panel { width: 450px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
.group { padding: 16px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.group h3 { margin: 0 0 12px 0; font-size: 16px; }
.group > div { margin-bottom: 12px; }
.group label { display: block; margin-bottom: 4px; font-size: 14px; font-weight: 500; }
.group input, .group textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-size: 14px; }
.group textarea { min-height: 150px; font-family: monospace; resize: vertical; }
.btns { display: flex; gap: 8px; }
.btns button { flex: 1; }
button { padding: 10px 16px; border: none; background: #007bff; color: white; cursor: pointer; border-radius: 4px; font-size: 14px; }
button:hover:not(:disabled) { background: #0056b3; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.speak-btn { width: 100%; margin-top: 8px; }
.radio-group { display: flex; flex-direction: column; gap: 12px; }
.radio-group label { display: flex; align-items: flex-start; gap: 8px; cursor: pointer; }
.radio-group input[type="radio"] { margin-top: 2px; }
.radio-group small { display: block; color: #666; font-size: 12px; margin-top: 4px; }
.setting-item { margin-bottom: 12px; }
.setting-item label { display: flex; align-items: flex-start; gap: 8px; cursor: pointer; }
.setting-item input[type="checkbox"] { margin-top: 2px; }
.setting-item small { display: block; color: #666; font-size: 12px; margin-top: 4px; }
.template-list { display: flex; flex-wrap: wrap; gap: 8px; }
.template-btn { padding: 8px 12px; font-size: 12px; background: #f8f9fa; color: #333; border: 1px solid #ddd; }
.template-btn:hover { background: #e9ecef; }
.log-header { display: flex; gap: 12px; margin-bottom: 8px; font-size: 12px; color: #666; }
.log { max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 8px; margin-bottom: 8px; background: #f8f9fa; }
.item { margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #007bff; }
.item.custom { border-left-color: #28a745; }
.item.info { border-left-color: #17a2b8; }
.item-header { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
.item-time { color: #666; }
.item-type { font-weight: 600; color: #333; }
.item pre { margin: 4px 0 0 0; font-size: 11px; overflow-x: auto; }
.empty { text-align: center; color: #999; padding: 20px; }
.clear-btn { width: 100%; background: #dc3545; }
.clear-btn:hover:not(:disabled) { background: #c82333; }
</style>
