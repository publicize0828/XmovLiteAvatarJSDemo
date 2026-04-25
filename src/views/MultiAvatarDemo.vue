<template>
  <div class="multi-avatar-container">
    <div class="header">
      <h2>多数字人切换演示</h2>
      <p class="description">选择一个数字人进行展示，其他数字人将进入隐身模式</p>
    </div>

    <div class="main-content">
      <div class="left-panel">
        <div class="avatar-display-wrapper">
          <div 
            v-for="(avatar, index) in avatars" 
            :key="avatar.name" 
            class="avatar-display" 
            :id="'avatar-display-' + index"
            :class="{ 
              'avatar-online': avatar.status === 'online',
              'avatar-invisible': avatar.status === 'invisible'
            }"
            :style="{
              zIndex: avatar.status === 'online' ? 10 : 1,
              visibility: avatar.status === 'invisible' ? 'hidden' : 'visible'
            }"
          >
            <div v-if="!currentAvatar || avatar.loading" class="loading-indicator">
              <div class="spinner"></div>
              <span>{{ avatar.loading ? '加载中...' : '请选择一个数字人' }}</span>
            </div>
          </div>
          <div class="current-avatar-info" v-if="currentAvatar && !currentAvatar.loading">
            <span class="avatar-name">{{ currentAvatar.name }}</span>
            <span class="avatar-status" :class="'status-' + currentAvatar.status">
              {{ currentAvatar.status === 'online' ? '在线' : currentAvatar.status === 'invisible' ? '隐身' : '未连接' }}
            </span>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="speak-panel">
          <h3>说话控制</h3>
          <div class="control-group">
            <label>说话内容：</label>
            <textarea v-model="speakText" class="speak-textarea" placeholder="输入要说的内容..." rows="5"></textarea>
          </div>
          <button class="btn btn-primary full-width" @click="speakToCurrentAvatar" :disabled="!currentAvatar || !currentAvatar.instance">
            说话
          </button>
        </div>

        <div class="avatar-list-section">
          <div class="avatar-list-header">
            <h3>屏型智能体列表</h3>
          </div>
          <div class="avatar-cards-container">
            <div class="avatar-cards-scroll">
              <div v-for="(avatar, index) in avatars" :key="index" class="avatar-card">
                <div class="avatar-card-image">
                  <div class="avatar-image-placeholder">
                    <span>{{ avatar.name.charAt(0) }}</span>
                  </div>
                  <div v-if="avatar.instance" class="avatar-status-badge" :class="'status-' + avatar.status">
                    <span v-if="avatar.status === 'online'">✓ 在线</span>
                    <span v-else-if="avatar.status === 'invisible'">已连接,隐身</span>
                  </div>
                </div>
                
                <div class="avatar-card-content">
                  <h4 class="avatar-card-title">{{ avatar.name }}</h4>
                  <p class="avatar-card-appid">{{ avatar.appId }}</p>
                </div>
                
                <div class="avatar-card-actions">
                  <template v-if="!avatar.instance">
                    <button class="btn-card btn-card-primary" @click="connectAvatar(index)" :disabled="avatar.loading">
                      {{ avatar.loading ? '连接中...' : '连接' }}
                    </button>
                  </template>
                  
                  <template v-else-if="avatar.status === 'online'">
                    <button class="btn-card btn-card-white" @click="disableAvatar(index)" :disabled="avatar.loading">
                      {{ avatar.loading && avatar.switching === 'invisible' ? '切换中...' : '隐身' }}
                    </button>
                    <button class="btn-card btn-card-white" @click="disconnectAvatar(index)" :disabled="avatar.loading">
                      {{ avatar.loading && avatar.switching === 'disconnect' ? '断开中...' : '断开连接' }}
                    </button>
                  </template>
                  
                  <template v-else>
                    <button class="btn-card btn-card-white" @click="disconnectAvatar(index)" :disabled="avatar.loading">
                      {{ avatar.loading && avatar.switching === 'disconnect' ? '断开中...' : '断开连接' }}
                    </button>
                    <button class="btn-card btn-card-primary" @click="enableAvatar(index)" :disabled="avatar.loading">
                      {{ avatar.loading && avatar.switching === 'online' ? '切换中...' : '在线' }}
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { AvatarStatus } from './types/index';
import { appStore } from '../stores/app';

interface AvatarInstance {
  name: string;
  appId: string;
  appSecret?: string;
  instance: any; // 使用 shallowRef 时类型保持不变
  loading: boolean;
  switching: '' | 'online' | 'invisible' | 'disconnect';
  status: 'online' | 'invisible' | 'offline';
}

const selectedIndex = ref(-1);
const speakText = ref('你好，请介绍一下你自己。');

// 使用 ref，确保 status/loading 等字段变化可触发视图更新
const avatars = ref<AvatarInstance[]>([
  { name: '护理助手', appId: 'e8922a09f10b448abd6fa53289ee2029', appSecret: 'a135e89b3876446e9a3000f83daee4a9', instance: null, loading: false, switching: '', status: 'offline' },
  { name: '客服专员', appId: '306956d028e146a99614f1169ece84ae', appSecret: '7b71aa39b55c40a7b363b318bd7a4462', instance: null, loading: false, switching: '', status: 'offline' },
  { name: '商务助理', appId: 'c40eb96219cd4ff39b97611a3b78acf9', appSecret: '4a508eddffba43a7a20e08dde3cb1cbd', instance: null, loading: false, switching: '', status: 'offline' },
  { name: '男大助理', appId: 'aeb9dda1231a4e4bb36ca01efb97bf84', appSecret: 'f7a02065ed66489fba9c6b176e733469', instance: null, loading: false, switching: '', status: 'offline' },
  { name: '健康顾问', appId: 'f03dc49f43f24236803f7fee2282d4e0', appSecret: '4deb95ddbc3d4e789e5ad6af7924b8a0', instance: null, loading: false, switching: '', status: 'offline' }
]);

const gatewayServer = ref('https://test-nebula-agent.xmov.ai/user/v1/ttsa/session');

const currentAvatar = computed(() => {
  return selectedIndex.value >= 0 ? avatars.value[selectedIndex.value] : null;
});

const connectedCount = computed(() => {
  return avatars.value.filter(avatar => avatar.instance).length;
});

async function connectAvatar(index: number) {
  const avatar = avatars.value[index];
  if (avatar.instance) return;

  if (connectedCount.value >= 3) {
    alert('最多允许三个数字人连接');
    return;
  }

  avatar.loading = true;
  const useInvisibleMode = connectedCount.value > 0;

  try {
    avatar.instance = await appStore.createAvatarInstance({
      containerId: `avatar-display-${index}`,
      appId: avatar.appId,
      appSecret: avatar.appSecret || '',
      gatewayServer: gatewayServer.value,
      config: {},
      useInvisibleMode,
      onStatusChange: (status: AvatarStatus) => {
        if (status === AvatarStatus.online || status === AvatarStatus.visible) {
          avatar.status = 'online';
          avatar.loading = false;
          avatar.switching = '';
          selectedIndex.value = index;
          // 其他在线的设为隐身
          avatars.value.forEach((other, i) => {
            if (i !== index && other.status === 'online') {
              other.instance?.switchInvisibleMode();
            }
          });
        } else if (status === AvatarStatus.invisible) {
          avatar.status = 'invisible';
          avatar.loading = false;
          avatar.switching = '';
        }
      },
      onDownloadProgress: (progress: number) => {
        if (progress === 100) {
          avatar.loading = false;
          avatar.switching = '';
        }
      }
    });
  } catch (error: any) {
    avatar.loading = false;
    avatar.switching = '';
    alert('连接失败: ' + (error.message || '未知错误'));
  }
}

async function disconnectAvatar(index: number) {
  const avatar = avatars.value[index];
  if (!avatar.instance) return;

  try {
    avatar.loading = true;
    avatar.switching = 'disconnect';
    await avatar.instance.destroy();
    avatar.instance = null;
    avatar.status = 'offline';
    avatar.loading = false;
    avatar.switching = '';
    if (selectedIndex.value === index) {
      selectedIndex.value = -1;
    }
  } catch (error) {
    avatar.loading = false;
    avatar.switching = '';
    console.error('断开失败:', error);
  }
}

function disableAvatar(index: number) {
  const avatar = avatars.value[index];
  if (avatar.instance && avatar.status === 'online') {
    avatar.loading = true;
    avatar.switching = 'invisible';
    avatar.instance.switchInvisibleMode();
  }
}

function enableAvatar(index: number) {
  const avatar = avatars.value[index];
  if (!avatar.instance || avatar.status !== 'invisible') return;

  // 其他在线的设为隐身
  avatars.value.forEach((other, i) => {
    if (i !== index && other.status === 'online') {
      other.instance?.switchInvisibleMode();
    }
  });

  avatar.loading = true;
  avatar.switching = 'online';
  avatar.instance.switchInvisibleMode();
  selectedIndex.value = index;
}

function speakToCurrentAvatar() {
  if (currentAvatar.value?.instance) {
    currentAvatar.value.instance.speak(speakText.value, true, true);
  }
}

onUnmounted(() => {
  avatars.value.forEach(avatar => {
    if (avatar.instance) {
      avatar.instance.destroy();
    }
  });
});
</script>

<style scoped>
.multi-avatar-container { width: 100vw; height: 100vh; display: flex; flex-direction: column; background: #f5f5f5; }
.header { padding: 20px; background: white; border-bottom: 1px solid #ddd; }
.header h2 { margin: 0 0 4px 0; font-size: 24px; }
.description { margin: 0; color: #666; }
.main-content { flex: 1; display: flex; gap: 20px; padding: 20px; overflow: hidden; }
.left-panel { flex: 1; background: #000; border-radius: 8px; overflow: hidden; position: relative; display: flex; justify-content: center; align-items: center; }
.right-panel { width: 500px; background: white; border-radius: 8px; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
.avatar-display-wrapper { position: relative; width: 100%; height: 100%; }
.avatar-display { width: 100%; height: 100%; position: absolute; top: 0; left: 0; overflow: hidden; }
.avatar-display :deep(canvas), .avatar-display :deep(video) { width: 100%; height: 100%; object-fit: contain; display: block; }
.avatar-display.avatar-online { z-index: 10; visibility: visible; display: absolute; }
.avatar-display.avatar-invisible { z-index: 1; visibility: hidden; pointer-events: none; display: none; }
.current-avatar-info { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 15px; z-index: 200; background: rgba(0, 0, 0, 0.6); padding: 8px 16px; border-radius: 8px; }
.current-avatar-info .avatar-name { font-weight: bold; font-size: 18px; color: #fff; }
.current-avatar-info .avatar-status { padding: 4px 12px; border-radius: 4px; font-size: 14px; color: #fff; }
.status-online { background: #4CAF50; }
.status-invisible { background: #ff9800; }
.status-offline { background: #9e9e9e; }
.loading-indicator { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; color: #fff; z-index: 100; }
.spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #2196F3; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 10px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.speak-panel { padding-bottom: 20px; border-bottom: 1px solid #eee; }
.speak-panel h3 { margin: 0 0 15px 0; font-size: 16px; }
.control-group { margin-bottom: 15px; }
.control-group label { display: block; margin-bottom: 5px; font-weight: 500; }
.speak-textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; resize: vertical; box-sizing: border-box; }
.avatar-list-section { border-top: 1px solid #eee; padding-top: 20px; }
.avatar-list-header h3 { margin: 0 0 16px 0; font-size: 18px; }
.avatar-cards-container { max-height: 400px; overflow-y: auto; }
.avatar-cards-scroll { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.avatar-card { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0; display: flex; flex-direction: column; }
.avatar-card-image { position: relative; width: 100%; height: 100px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.avatar-image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; color: rgba(255, 255, 255, 0.8); font-weight: bold; }
.avatar-status-badge { position: absolute; top: 8px; right: 8px; padding: 4px 10px; border-radius: 12px; font-size: 12px; color: #fff; }
.avatar-status-badge.status-online { background: #81C784; }
.avatar-status-badge.status-invisible { background: #FFC107; color: #333; }
.avatar-card-content { padding: 16px; }
.avatar-card-title { margin: 0 0 8px 0; font-size: 16px; font-weight: 600; }
.avatar-card-appid { margin: 0; font-size: 12px; color: #666; }
.avatar-card-actions { padding: 0 16px 16px 16px; display: flex; gap: 8px; }
.btn-card { flex: 1; padding: 8px 16px; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
.btn-card-primary { background: #2196F3; color: #fff; }
.btn-card-primary:hover { background: #1976D2; }
.btn-card-white { background: #fff; color: #333; border: 1px solid #e0e0e0; }
.btn-card-white:hover { background: #f5f5f5; }
.btn-card:disabled { opacity: 0.5; cursor: not-allowed; }
.btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
.btn-primary { background: #2196F3; color: white; }
.btn-primary:hover:not(:disabled) { background: #1976D2; }
.btn.full-width { width: 100%; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
