<template>
  <div ref="containerRef" class="avatar-render">
    <!-- SDK 渲染容器 -->
    <div :id="containerId" class="sdk-container" />
    
    <!-- 字幕显示 -->
    <div v-show="appState.ui.subTitleText" class="subtitle">
      {{ appState.ui.subTitleText }}
    </div>
    
    <!-- 语音输入动画 -->
    <div v-show="appState.asr.isListening" class="voice-animation">
      <img :src="siriIcon" alt="语音输入" />
    </div>
    
    <!-- 加载状态 -->
    <div v-if="!appState.avatar.connected" class="loading-placeholder">
      <div class="loading-text">-- 正在连接 --</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, computed, ref, onMounted, onUnmounted } from 'vue'
import { avatarService } from '../services/avatar'
import type { AppState } from '../types'
import siriIcon from '../assets/siri.png'

// 注入全局状态
const appState = inject<AppState>('appState')!

// 获取容器ID
const containerId = computed(() => avatarService.getContainerId())

// 响应式处理
const containerRef = ref<HTMLElement | null>(null)
const objectFit = ref<'cover' | 'contain'>('cover')

function updateObjectFit() {
  if (!containerRef.value) return
  
  const container = containerRef.value
  const containerRatio = container.clientWidth / container.clientHeight
  // 数字人标准比例为9:16 (0.5625)
  const avatarRatio = 9 / 16
  
  // 如果容器比例接近数字人比例，使用cover以填满屏幕
  // 如果容器比例差异较大，使用contain以完整显示
  objectFit.value = Math.abs(containerRatio - avatarRatio) < 0.2 ? 'cover' : 'contain'
}

onMounted(() => {
  updateObjectFit()
  window.addEventListener('resize', updateObjectFit)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateObjectFit)
})
</script>

<style scoped>
.avatar-render {
  flex: 1;
  position: relative;
  background: #000000;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;
  width: 100%;
  height: 100%;
}

.sdk-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.sdk-container :deep(canvas),
.sdk-container :deep(video) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: v-bind(objectFit);
}

/* 确保 SDK 内部容器也居中 */
.sdk-container :deep(div) {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

/* 响应式处理 - 当需要保持特定比例时 */
@media (max-width: 768px) {
  .avatar-render {
    padding: 0;
  }

  .sdk-container {
    width: 100%;
    height: 100%;
  }

  .sdk-container :deep(canvas),
  .sdk-container :deep(video) {
    object-fit: cover;
  }
}

/* @media (max-width: 768px) {
  .avatar-render {
    padding: 0 12px;
  }

  .sdk-container {
    width: 100%;
    height: 100%;
    max-height: calc(100vh - 140px);
  }

  .sdk-container :deep(canvas),
  .sdk-container :deep(video) {
    object-fit: cover;
  }
} */

.subtitle {
  position: absolute;
  z-index: 100;
  bottom: 220px;
  left: 50%;
  width: 375px;
  max-width: 90%;
  word-break: break-word;
  text-align: center;
  transform: translateX(-50%);
  font-size: 20px;
  color: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.2);
  padding: 8px 16px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
}

.voice-animation {
  position: absolute;
  left: 50%;
  top: 75%;
  transform: translateX(-50%);
  width: 360px;
  max-width: 90%;
  z-index: 101;
}

.voice-animation > img {
  width: 100%;
  height: auto;
}

.loading-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
}

.loading-text {
  font-size: 18px;
  color: #666;
  font-weight: 500;
}
</style>
