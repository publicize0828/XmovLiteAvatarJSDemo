<script setup lang="ts">
import { provide, ref } from 'vue'
import Info from './components/ConfigPanel.vue'
import SdkRender from './components/AvatarRender.vue'
import FloatingButton from './components/FloatingButton.vue'
import { appState, appStore } from './stores/app'

// 提供全局状态和方法
provide('appState', appState)
provide('appStore', appStore)

// 控制设置面板的显示状态
const isPanelOpen = ref(true)

function togglePanel() {
  isPanelOpen.value = !isPanelOpen.value
}
</script>

<template>
  <div class="main">
    <SdkRender/>
    <div class="config-container" :class="{ 'collapsed': !isPanelOpen }">
      <Info v-show="isPanelOpen" />
    </div>
    <FloatingButton :is-open="isPanelOpen" @toggle="togglePanel" />
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

.config-container {
  transition: width 0.3s ease;
  width: 420px;
  max-height: 100vh;
  overflow: hidden;
}

.config-container.collapsed {
  width: 0;
}
</style>
