<script setup lang="ts">
import { provide, computed, onMounted, watch } from 'vue'
import SdkRender from './components/AvatarRender.vue'
import MultiAvatarDemo from './views/MultiAvatarDemo.vue'
import Walk from './views/Walk.vue'
import CustomEvent from './views/CustomEvent.vue'
import { appState, appStore } from './stores/app'

// 提供全局状态和方法
provide('appState', appState)
provide('appStore', appStore)

// PC 端判断
const isPC = computed(() => window.innerWidth >= 1024)

// 移动端强制使用数字人交互模式
onMounted(() => {
  if (!isPC.value) {
    appState.ui.mode = 'interactive'
  }
})

// 监听窗口大小变化，移动端强制使用数字人交互模式
watch(isPC, (newVal) => {
  if (!newVal) {
    appState.ui.mode = 'interactive'
  }
})

// 模式切换
type ModeType = 'interactive' | 'walk' | 'switch' | 'custom-event'

function setMode(mode: ModeType) {
  // 移动端不允许切换模式
  if (!isPC.value) return;
  appState.ui.mode = mode;
}

// 当前显示的组件
const activeComponent = computed(() => {
  if (appState.ui.mode === 'walk') return Walk
  if (appState.ui.mode === 'switch') return MultiAvatarDemo
  if (appState.ui.mode === 'custom-event') return CustomEvent
  return SdkRender
})
</script>

<template>
  <div class="main">
    <!-- 模式切换（仅 PC 端） -->
    <div class="mode-switcher" v-if="isPC">
      <button
        class="mode-btn"
        :class="appState.ui.mode === 'interactive' ? 'mode-btn-active' : ''"
        @click="setMode('interactive')"
      >
        数字人交互
      </button>
      <button
        class="mode-btn"
        :class="appState.ui.mode === 'walk' ? 'mode-btn-active' : ''"
        @click="setMode('walk')"
      >
        行走
      </button>
      <button
        class="mode-btn"
        :class="appState.ui.mode === 'switch' ? 'mode-btn-active' : ''"
        @click="setMode('switch')"
      >
        实时换人
      </button>
      <button
        class="mode-btn"
        :class="appState.ui.mode === 'custom-event' ? 'mode-btn-active' : ''"
        @click="setMode('custom-event')"
      >
        自定义事件
      </button>
    </div>

    <!-- 动态组件：根据模式切换 -->
    <component :is="activeComponent" :key="appState.ui.mode" />
  </div>
</template>

<style scoped>
.main {
  display: flex;
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

/* 模式切换器（PC 端） */
.mode-switcher {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 1001;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px 16px;
  border-radius: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
}

.mode-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: #f0f0f0;
  color: #666;
  width: auto;
  min-width: auto;
  white-space: nowrap;
}

.mode-btn:hover {
  background: #e0e0e0;
  color: #333;
}

.mode-btn-active {
  background: #007bff;
  color: white;
}

.mode-btn-active:hover {
  background: #0056b3;
}

</style>
