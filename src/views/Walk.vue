<template>
  <div class="walk-container">
    <div class="header">
      <h2>行走功能演示</h2>
      <p class="description">配置行走点位，控制数字人在场景中行走</p>
    </div>

    <div class="main-content">
      <!-- 左侧：数字人显示区域 -->
      <div class="left-panel">
        <div class="avatar-display-wrapper">
          <div id="walk-avatar" class="avatar-display"></div>
          <div v-if="loading" class="loading-overlay">
            <div class="progress-panel">
              <div class="progress-label">加载进度</div>
              <div class="progress-bar-container">
                <div class="progress-bar" :style="{ width: progress + '%' }"></div>
              </div>
              <div class="progress-percentage">{{ progress }}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：控制面板 -->
      <div class="right-panel">
        <!-- SDK 控制 -->
        <div class="sdk-section">
          <h3>SDK 控制</h3>
          <div class="button-group toggle-group">
            <button class="btn-toggle btn-param" :class="{ active: showParams }" @click="showParams = true">
              参数
            </button>
            <button class="btn-toggle btn-connect" :class="{ active: !showParams }" @click="showParams = false">
              连接
            </button>
          </div>
          <div v-if="showParams" class="params-panel">
            <div class="param-item">
              <label>App ID:</label>
              <input v-model="appId" type="text" />
            </div>
            <div class="param-item">
              <label>App Secret:</label>
              <input v-model="appSecret" type="text" />
            </div>
            <div class="param-item">
              <label>Gateway:</label>
              <input v-model="gatewayServer" type="text" />
            </div>
          </div>
          <div v-else class="connect-panel">
            <div class="button-group">
              <button class="btn btn-success" @click="connectAvatar" :disabled="loading || !!avatarInstance">
                {{ loading ? '连接中...' : '连接' }}
              </button>
              <button class="btn btn-danger" @click="disconnectAvatar" :disabled="!avatarInstance">
                断开
              </button>
            </div>
          </div>
          <div v-if="avatarInstance" class="status-info">
            <p><strong>连接状态：</strong><span :class="['status', 'connected']">已连接</span></p>
            <p v-if="walkState"><strong>行走状态：</strong><span :class="['status', walkState === 'walk_start' ? 'walking' : 'idle']">{{ walkState === 'walk_start' ? '行走中' : '空闲' }}</span></p>
          </div>
        </div>

        <!-- 行走控制 -->
        <div class="walk-section">
          <h3>行走控制</h3>
          <div class="position-panel">
            <div class="position-label">当前位置</div>
            <div class="position-indicator">
              <div v-for="point in pointNames" :key="point" 
                   :class="['position-dot', { active: currentPosition === point }]"
                   @click="walkToPoint(point)"
                   :disabled="!avatarInstance || walkState === 'walk_start'">
                {{ point }}
              </div>
            </div>
            <div class="status-value">{{ currentPosition ? `当前点位: ${currentPosition}` : '未设置' }}</div>
          </div>
          <div class="button-group walk-buttons">
            <button v-for="point in pointNames" :key="point" 
                    class="btn walk-btn" 
                    @click="walkToPoint(point)"
                    :disabled="!avatarInstance || walkState === 'walk_start'">
              到点位 {{ point }}
            </button>
          </div>
        </div>

        <!-- 说话控制 -->
        <div class="speak-section">
          <h3>说话控制</h3>
          <div class="control-group">
            <label>说话内容（可包含行走指令）:</label>
            <textarea v-model="speakText" class="speak-textarea" placeholder="输入要说的内容，可以使用SSML格式包含行走指令..." rows="6"></textarea>
          </div>
          <button class="btn btn-primary full-width" @click="speak" :disabled="!avatarInstance || walkState === 'walk_start'">说话</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onUnmounted, inject } from 'vue'
import { appStore } from '../stores/app'
import type { AppState } from '../types'

const appStateInjected = inject<AppState>('appState')!
const appStoreInjected = appStore

const appId = ref(appStateInjected?.avatar.appId || '')
const appSecret = ref(appStateInjected?.avatar.appSecret || '')
const gatewayServer = ref('https://test-ttsa-gateway-lite.xmov.ai/api/session')

// 独立的数字人实例（不共享）- 使用 shallowRef 优化性能
const avatarInstance = shallowRef<any>(null)
const loading = ref(false)
const progress = ref(0)
const walkState = ref('')
const currentPosition = ref('F')
const showParams = ref(false)
const pointNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'] as const

const speakText = ref(`<speak>
    <ue4event>
        <type>walk</type>
        <data>
            <target>K</target>
        </data>
    </ue4event>
霜降已过，初冬将至。虽然天气渐冷，但荣成市旅游市场依然"热"力十足。频繁冲上热搜，在这背后是荣成市依托本地特色，精准深耕客源市场，优化营销策略，吸引更多游客"奔荣而来"探访"诗与远方"。
</speak>`)

// 配置常量 - 提取为常量避免重复创建
const defaultLayout = {
  container: { size: [1440, 810] },
  avatar: { v_align: "center", h_align: "middle", scale: 0.3, offset_x: 0, offset_y: 0 }
} as const;

const defaultWalkConfig = {
  min_x_offset: -500,
  max_x_offset: 500,
  walk_points: { A: -500, B: -400, C: -300, D: -200, E: -100, F: 0, G: 100, H: 200, I: 300, J: 400, K: 500 },
  init_point: 0
} as const;

async function connectAvatar() {
  if (!appId.value || !appSecret.value) {
    alert('请先配置 AppId 和 AppSecret')
    return
  }

  if (avatarInstance.value) return

  loading.value = true
  progress.value = 0

  try {
    const containerId = 'walk-avatar'
    if (!document.querySelector(`#${containerId}`)) {
      alert('容器不存在')
      loading.value = false
      return
    }

    const walkConfig = {
      look_name: "FF008_6530_new",
      tts_vcn_id: "XMOV_HN_TTS__4",
      is_large_model: false,
      sta_face_id: "F_CN02_yuxuan",
      mp_service_id: "F_CN02_show52_walk_test",
      figure_name: "SCF25_001",
      lite_drive_style: "lively",
      background_img: "https://media.youyan.xyz/youyan/images/shot_layer_library/2D_background/ppt_train_02__2D_background.png",
      frame_rate: 24,
      optional_emotion: "",
      init_events: [{
        data: {
          axis_id: 1,
          height: 1,
          image: "https://media.xingyun3d.com/xingyun3d/general/litehuman/background_2D/jushen_v1_black_and_gold_style_office_02.png",
          width: 1,
          x_location: 0,
          y_location: 0
        },
        type: "widget_pic"
      }],
      auto_ka: true,
      render_preset: "1080x1920_fullbody",
      layout: defaultLayout,
      walk_config: defaultWalkConfig,
      enable_asr: false,
      asr_enabled: false
    }

    // 创建独立的数字人实例
    avatarInstance.value = await appStoreInjected.createAvatarInstance({
      containerId,
      appId: appId.value,
      appSecret: appSecret.value,
      gatewayServer: gatewayServer.value,
      config: walkConfig,
      useInvisibleMode: false,
      onStatusChange: (status: any) => {
        console.log('Walk Status:', status)
      },
      onWalkStateChange: (state: string) => {
        walkState.value = state
        if (state === 'walk_end') {
          // 行走结束后可以重新启用按钮
        }
      },
      onDownloadProgress: (prog: number) => {
        progress.value = prog
        if (prog === 100) {
          loading.value = false
        }
      }
    })
    
    currentPosition.value = 'F'
    loading.value = false
    progress.value = 100
    console.log('数字人连接成功')
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
  walkState.value = ''
  currentPosition.value = 'F'
  progress.value = 0
}

function walkToPoint(pointName: string) {
  if (!avatarInstance.value || walkState.value === 'walk_start') return;
  
  const speakContent = `<speak>
    <ue4event>
        <type>walk</type>
        <data>
            <target>${pointName}</target>
        </data>
    </ue4event>
    正在移动到点位${pointName}
</speak>`;
  
  try {
    avatarInstance.value.speak(speakContent, true, true);
    currentPosition.value = pointName;
    console.log(`数字人开始向点位 ${pointName} 移动`);
  } catch (e) {
    console.error('行走控制失败:', e);
    alert('行走控制失败，请稍后重试');
  }
}

function speak() {
  if (!avatarInstance.value || !speakText.value.trim()) {
    alert(avatarInstance.value ? '请输入内容' : '请先连接');
    return;
  }
  try {
    avatarInstance.value.speak(speakText.value, true, true);
  } catch (e) {
    alert('说话失败: ' + (e as Error).message);
  }
}

onUnmounted(() => {
  if (avatarInstance.value) {
    avatarInstance.value.destroy().catch(console.error)
    avatarInstance.value = null
  }
})
</script>

<style scoped>
.walk-container { width: 100vw; height: 100vh; display: flex; flex-direction: column; background: #f5f5f5; }
.header { padding: 20px; background: white; border-bottom: 1px solid #ddd; }
.header h2 { margin: 0 0 4px 0; font-size: 24px; }
.description { margin: 0; color: #666; }
.main-content { flex: 1; display: flex; gap: 20px; padding: 20px; overflow: hidden; }
.left-panel { flex: 1; background: white; border-radius: 8px; overflow: hidden; position: relative; }
.right-panel { width: 500px; background: white; border-radius: 8px; padding: 20px; overflow-y: auto; }
.avatar-display-wrapper { width: 100%; height: 100%; position: relative; background: #000; }
.avatar-display { width: 100%; height: 100%; position: relative; }
.avatar-display > div { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
.avatar-display :deep(canvas), .avatar-display :deep(video) { width: 100%; height: 100%; object-fit: contain; display: block; }
.loading-overlay { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 100; }
.progress-panel { background: white; padding: 20px; border-radius: 8px; text-align: center; min-width: 300px; }
.progress-label { font-size: 14px; color: #666; margin-bottom: 10px; }
.progress-bar-container { width: 100%; height: 20px; background: #ecf0f1; border-radius: 10px; overflow: hidden; margin-bottom: 10px; }
.progress-bar { height: 100%; background: #3498db; border-radius: 10px; transition: width 0.3s; }
.progress-percentage { font-size: 16px; font-weight: 600; color: #2c3e50; }
.sdk-section, .walk-section, .speak-section { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
.sdk-section:last-child, .walk-section:last-child, .speak-section:last-child { border-bottom: none; }
.sdk-section h3, .walk-section h3, .speak-section h3 { margin: 0 0 15px 0; font-size: 18px; }
.button-group { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px; }
.toggle-group { gap: 0; }
.toggle-group .btn-toggle { border-radius: 0; margin: 0; }
.toggle-group .btn-toggle:first-child { border-radius: 4px 0 0 4px; }
.toggle-group .btn-toggle:last-child { border-radius: 0 4px 4px 0; }
.connect-panel .button-group { flex-direction: row; gap: 10px; }
.connect-panel .button-group .btn { flex: 1; height: 40px; padding: 8px 16px; }
.btn-toggle { padding: 8px 20px; border: none; cursor: pointer; font-size: 14px; transition: all 0.3s; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.btn-param { background: #95a5a6; color: white; }
.btn-param.active { background: #27ae60; box-shadow: 0 2px 8px rgba(39, 174, 96, 0.3); }
.btn-param:hover:not(:disabled) { background: #229954; }
.btn-connect { background: #95a5a6; color: white; }
.btn-connect.active { background: #e74c3c; box-shadow: 0 2px 8px rgba(231, 76, 60, 0.3); }
.btn-connect:hover:not(:disabled) { background: #c0392b; }
.walk-buttons { flex-direction: column; }
.walk-buttons button { width: 100%; }
.btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; transition: all 0.3s; min-width: 120px; width: auto; }
.btn-success { background: #27ae60; color: white; }
.btn-success:hover:not(:disabled) { background: #229954; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(39, 174, 96, 0.3); }
.btn-danger { background: #e74c3c; color: white; }
.btn-danger:hover:not(:disabled) { background: #c0392b; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(231, 76, 60, 0.3); }
.btn-primary { background: #3498db; color: white; }
.btn-primary:hover:not(:disabled) { background: #2980b9; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(52, 152, 219, 0.3); }
.walk-btn { background: #3498db; color: white; }
.walk-btn:hover:not(:disabled) { background: #2980b9; transform: translateY(-1px); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.params-panel, .connect-panel { margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 4px; }
.param-item { margin-bottom: 12px; }
.param-item:last-child { margin-bottom: 0; }
.param-item label { display: block; margin-bottom: 4px; font-size: 12px; color: #666; font-weight: 500; }
.param-item input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
.param-item input:focus { outline: none; border-color: #3498db; box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1); }
.full-width { width: 100%; }
.status-info { margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px; }
.status-info p { margin: 5px 0; }
.status { font-weight: 600; }
.status.connected { color: #27ae60; }
.status.walking { color: #f39c12; }
.status.idle { color: #2c3e50; }
.position-panel { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; margin-bottom: 15px; }
.position-label { font-size: 14px; color: #666; margin-bottom: 10px; }
.position-indicator { display: flex; justify-content: center; gap: 5px; margin-bottom: 10px; flex-wrap: wrap; }
.position-dot { width: 32px; height: 32px; border-radius: 50%; background: #bdc3c7; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s; font-weight: 600; font-size: 12px; }
.position-dot:hover:not(:disabled) { transform: scale(1.1); }
.position-dot.active { background: #3498db; transform: scale(1.2); }
.position-dot:disabled { opacity: 0.5; cursor: not-allowed; }
.control-group { margin-bottom: 15px; }
.control-group label { display: block; margin-bottom: 5px; font-weight: bold; }
.speak-textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical; font-family: inherit; font-size: 14px; box-sizing: border-box; }
</style>
