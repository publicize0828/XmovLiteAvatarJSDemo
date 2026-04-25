<template>
  <div class="interactive-container">
    <div class="header" v-if="!isMobile">
      <h2>数字人交互</h2>
      <p class="description">与数字人进行实时对话和交互</p>
    </div>
    <div class="content">
      <div class="avatar-render">
        <div :id="containerId" class="sdk-container" />
        <div v-show="appState.ui.subTitleText" class="subtitle">{{ appState.ui.subTitleText }}</div>
        <div v-show="appState.asr.isListening" class="voice-animation">
          <img :src="siriIcon" alt="语音输入" />
        </div>
        <div class="control-panel">
          <div class="control-row">
            <button class="ctrl btn-green" @click="handleControl('speak')">说话</button>
            <button class="ctrl btn-green" @click="handleControl('think')">思考</button>
            <button class="ctrl btn-green" @click="handleControl('listen')">听</button>
            <button class="ctrl btn-green" @click="handleControl('idle')">空闲</button>
            <button class="ctrl btn-green" @click="handleControl('interactive_idle')">空闲互动</button>
            <button class="ctrl btn-green" @click="handleControl('interrupt')">中断</button>
          </div>
          <div class="control-row">
            <button class="ctrl btn-gray" @click="handleControl('offline')">断线</button>
            <button class="ctrl btn-gray" @click="handleControl('online')">在线</button>
            <button class="ctrl btn-gray" @click="handleControl('destroy')">销毁</button>
          </div>
        </div>
        <div class="input-area">
          <div class="input-container">
            <textarea v-model="appState.ui.text" class="input-text" placeholder="请输入消息..." rows="1" @keydown.enter.exact.prevent="handleSendMessage" />
            <div class="input-actions">
              <button @click="handleVoiceInput" :disabled="!appState.avatar.connected" class="btn btn-voice" :class="{ 'active': appState.asr.isListening }">
                <svg viewBox="0 0 24 24" class="icon">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>
              <button @click="handleSendMessage" :disabled="!appState.avatar.connected || !appState.ui.text.trim()" class="btn btn-send">
                <svg viewBox="0 0 24 24" class="icon">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div v-if="!appState.avatar.connected" class="loading-placeholder">
          <div class="loading-text">-- 正在连接 --</div>
        </div>
      </div>
      <div class="panel" :class="{ 'panel-collapsed': !isPanelOpen }" v-if="!isMobile">
        <div class="panel-header">
          <h3>设置</h3>
          <button class="panel-toggle" @click="togglePanel">
            <svg v-if="isPanelOpen" viewBox="0 0 24 24" class="icon"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
            <svg v-else viewBox="0 0 24 24" class="icon"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
          </button>
        </div>
        <div v-show="isPanelOpen" class="panel-content"><Info /></div>
      </div>
      <button v-if="isMobile" class="floating-settings-btn" @click="togglePanel" :class="{ 'active': isPanelOpen }">
        <svg v-if="!isPanelOpen" viewBox="0 0 24 24" class="icon">
          <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" class="icon"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
      <div v-if="isMobile" v-show="isPanelOpen" class="mobile-panel-overlay" @click="togglePanel">
        <div class="mobile-panel" @click.stop>
          <div class="mobile-panel-header">
            <h3>设置</h3>
            <button class="mobile-panel-close" @click="togglePanel">
              <svg viewBox="0 0 24 24" class="icon"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="mobile-panel-content"><Info /></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, computed, ref, shallowRef, onMounted, onUnmounted } from "vue";
import { avatarService } from "../services/avatar";
import { useAsr } from "../composables/useAsr";
import type { AppState, AppStore, AsrProvider } from "../types";
import siriIcon from "../assets/siri.png";
import Info from "./ConfigPanel.vue";

// 示例文本常量
const DEFAULT_SPEAK_TEXT = `<speak>
    <ue4event>
        <type>walk</type>
        <data>
            <target>K</target>
        </data>
    </ue4event>
汉皇重色思倾国，御宇多年求不得。杨家有女初长成，养在深闺人未识。天生丽质难自弃，一朝选在君王侧。回眸一笑百媚生，六宫粉黛无颜色。春寒赐浴华清池，温泉水滑洗凝脂。侍儿扶起娇无力，始是新承恩泽时。云鬓花颜金步摇，芙蓉帐暖度春宵。春宵苦短日高起，从此君王不早朝。承欢侍宴无闲暇，春从春游夜专夜。后宫佳丽三千人，三千宠爱在一身。金屋妆成娇侍夜，玉楼宴罢醉和春。姊妹弟兄皆列土，可怜光彩生门户。遂令天下父母心，不重生男重生女。骊宫高处入青云，仙乐风飘处处闻。缓歌谩舞凝丝竹，尽日君王看不足。渔阳鼙鼓动地来，惊破霓裳羽衣曲。九重城阙烟尘生，千乘万骑西南行。翠华摇摇行复止，西出都门百余里。六军不发无奈何，宛转蛾眉马前死。花钿委地无人收，翠翘金雀玉搔头。君王掩面救不得，回看血泪相和流。黄埃散漫风萧索，云栈萦纡登剑阁。峨嵋山下少人行，旌旗无光日色薄。蜀江水碧蜀山青，圣主朝朝暮暮情。行宫见月伤心色，夜雨闻铃肠断声。天旋地转回龙驭，到此踌躇不能去。马嵬坡下泥土中，不见玉颜空死处。君臣相顾尽沾衣，东望都门信马归。归来池苑皆依旧，太液芙蓉未央柳。芙蓉如面柳如眉，对此如何不泪垂。春风桃李花开日，秋雨梧桐叶落时。西宫南内多秋草，落叶满阶红不扫。梨园弟子白发新，椒房阿监青娥老。夕殿萤飞思悄然，孤灯挑尽未成眠。迟迟钟鼓初长夜，耿耿星河欲曙天。鸳鸯瓦冷霜华重，翡翠衾寒谁与共。悠悠生死别经年，魂魄不曾来入梦。临邛道士鸿都客，能以精诚致魂魄。为感君王辗转思，遂教方士殷勤觅。排空驭气奔如电，升天入地求之遍。上穷碧落下黄泉，两处茫茫皆不见。忽闻海上有仙山，山在虚无缥渺间。楼阁玲珑五云起，其中绰约多仙子。中有一人字太真，雪肤花貌参差是。金阙西厢叩玉扃，转教小玉报双成。闻道汉家天子使，九华帐里梦魂惊。揽衣推枕起徘徊，珠箔银屏迤逦开。云鬓半偏新睡觉，花冠不整下堂来。风吹仙袂飘飘举，犹似霓裳羽衣舞。玉容寂寞泪阑干，梨花一枝春带雨。含情凝睇谢君王，一别音容两渺茫。昭阳殿里恩爱绝，蓬莱宫中日月长。回头下望人寰处，不见长安见尘雾。惟将旧物表深情，钿合金钗寄将去。钗留一股合一扇，钗擘黄金合分钿。但教心似金钿坚，天上人间会相见。临别殷勤重寄词，词中有誓两心知。七月七日长生殿，夜半无人私语时。在天愿作比翼鸟，在地愿为连理枝。天长地久有时尽，此恨绵绵无绝期。
</speak>`;

const appState = inject<AppState>("appState")!;
const appStore = inject<AppStore>("appStore")!;
const containerId = computed(() => avatarService.getContainerId());
const isMobile = ref(window.innerWidth < 1024);
const isPanelOpen = ref(false);

function togglePanel() {
  isPanelOpen.value = !isPanelOpen.value;
}

function updateIsMobile() {
  isMobile.value = window.innerWidth < 1024;
  if (!isMobile.value) isPanelOpen.value = false;
}

function handleSendMessage() {
  if (!appState.ui.text.trim()) return;
  appStore.sendMessage();
  appState.ui.text = "";
}

function handleControl(action: string) {
  const instance = appState.avatar.instance;
  if (!instance) {
    if (action === 'speak') {
      alert("请先连接数字人");
    }
    return;
  }
  
  switch (action) {
    case "speak": {
      const speakText = appState.ui.text.trim() || DEFAULT_SPEAK_TEXT;
      try {
        // 直接调用 speak API: instance.speak(ssml, isStart, isEnd)
        instance.speak(speakText, true, true);
        // 清空输入框
        appState.ui.text = "";
      } catch (e) {
        alert('说话失败: ' + (e as Error).message);
      }
      break;
    }
    case "think":
      instance.think?.();
      break;
    case "listen":
      handleVoiceInput();
      break;
    case "idle":
      instance.idle?.() || instance.interactiveidle?.() || appStore.interrupt();
      break;
    case "interactive_idle":
      instance.interactiveidle?.() || appStore.interrupt();
      break;
    case "interrupt":
      appStore.interrupt();
      break;
    case "offline":
      appStore.disconnectAvatar();
      break;
    case "online":
      appStore.connectAvatar();
      break;
    case "destroy":
      instance.destroy?.();
      appStore.disconnectAvatar();
      break;
  }
}

function handleVoiceInput() {
  if (appState.asr.isListening) {
    appStore.stopVoiceInput();
    return;
  }
  if (!appState.asr.appId || !appState.asr.secretKey) {
    alert("请先配置ASR信息");
    return;
  }
  const { start } = useAsr({
    provider: appState.asr.provider as AsrProvider,
    appId: appState.asr.appId,
    secretId: appState.asr.secretId,
    secretKey: appState.asr.secretKey,
  });
  appStore.startVoiceInput({ onFinished: () => {}, onError: () => {} });
  start({
    onFinished: (text: string) => {
      appState.ui.text = text;
      appStore.stopVoiceInput();
      appStore.sendMessage();
      appState.ui.text = "";
    },
    onError: () => {
      appStore.stopVoiceInput();
    },
  });
}

onMounted(() => {
  window.addEventListener("resize", updateIsMobile);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateIsMobile);
  appState.avatar.instance?.destroy();
  appState.avatar.instance = null;
});
</script>

<style scoped>
.interactive-container { width: 100vw; height: 100vh; display: flex; flex-direction: column; background: #f5f5f5; }
.content { flex: 1; display: flex; gap: 20px; padding: 20px; overflow: hidden; }
.avatar-render { flex: 1; background: #000; border-radius: 8px; overflow: hidden; position: relative; }
.header { padding: 20px; background: white; border-bottom: 1px solid #ddd; }
.header h2 { margin: 0 0 4px 0; font-size: 24px; }
.description { margin: 0; color: #666; font-size: 14px; }
.sdk-container { height: 100%; }
.sdk-container canvas { object-fit: cover !important; width: 100% !important; }
.sdk-container :deep(canvas), .sdk-container :deep(video) { display: block; width: 100%; height: 100%; object-fit: contain; }
@media (min-width: 1025px) { .sdk-container { aspect-ratio: 16/9 !important; margin: 0 auto; } }
.subtitle, .voice-animation, .loading-placeholder { position: absolute; left: 50%; transform: translateX(-50%); }
.subtitle { bottom: 220px; width: 375px; max-width: 90%; word-break: break-word; text-align: center; font-size: 20px; color: #fff; border: 1px solid rgba(0,0,0,0.2); padding: 8px 16px; border-radius: 16px; background: rgba(0,0,0,0.6); backdrop-filter: blur(10px); z-index: 100; }
.voice-animation { top: 75%; width: 360px; max-width: 90%; z-index: 101; }
.voice-animation > img { width: 100%; height: auto; }
.loading-placeholder {display: flex; justify-content: center; align-items: center; background: rgba(255,255,255,0.9); backdrop-filter: blur(5px); z-index: 100; }
.loading-text { font-size: 18px; color: #666; font-weight: 500; }
.input-area { position: absolute; bottom: 30px; left: 10%; right: 10%; z-index: 102; padding: 12px; background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%); backdrop-filter: blur(10px); }
.input-container { display: flex; align-items: flex-end; gap: 8px; background: rgba(255,255,255,0.95); border-radius: 24px; padding: 8px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.input-text { flex: 1; border: none; outline: none; background: transparent; font-size: 14px; line-height: 1.5; resize: none; max-height: 120px; overflow-y: auto; padding: 4px 0; font-family: inherit; }
.input-text::placeholder { color: #999; }
.input-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.btn, .ctrl, .panel-toggle, .mobile-panel-close { border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; padding: 0; }
.btn { width: 36px; height: 36px; border-radius: 50%; }
.btn:disabled, .btn-green:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-green:disabled { opacity: 0.6; }
.btn-voice { background: #28a745; color: white; }
.btn-voice:hover:not(:disabled), .btn-send:hover:not(:disabled), .btn-green:hover:not(:disabled), .btn-gray:hover:not(:disabled) { transform: scale(1.05); }
.btn-voice:hover:not(:disabled) { background: #218838; }
.btn-voice.active { background: #dc3545; animation: pulse 1.5s ease-in-out infinite; }
.btn-send { background: #007bff; color: white; }
.btn-send:hover:not(:disabled) { background: #0056b3; }
.btn-send:disabled { background: #6c757d; }
.ctrl { flex: 1; min-width: 80px; height: 40px; border-radius: 8px; color: #fff; font-size: 14px; }
.btn-green { background: #22c55e; }
.btn-green:hover:not(:disabled) { background: #16a34a; }
.btn-gray { background: #8b8b8b; }
.btn-gray:hover:not(:disabled) { background: #757575; }
.control-panel { position: absolute; bottom: 120px; left: 12px; right: 12px; z-index: 150; display: flex; flex-direction: column; gap: 8px; }
.control-row { display: flex; flex-wrap: wrap; gap: 8px; }
.icon { width: 20px; height: 20px; fill: currentColor; }
.floating-settings-btn .icon { width: 24px; height: 24px; fill: white; }
.panel { width: 500px; background: white; border-radius: 8px; padding: 20px; overflow-y: auto; transition: all 0.3s ease; display: flex; flex-direction: column; }
.panel-header, .mobile-panel-header { display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; border-bottom: 1px solid #eee; }
.panel-header { margin-bottom: 16px; padding-bottom: 12px; position: sticky; top: 0; background: white; z-index: 10; }
.panel-header h3, .mobile-panel-header h3 { margin: 0; font-size: 18px; font-weight: 600; color: #333; }
.panel-toggle, .mobile-panel-close { width: 36px; height: 36px; border-radius: 8px; background: #fff; }
.panel-toggle { border: 1px solid #ddd; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.panel-toggle:hover { background: #f5f5f5; border-color: #007bff; box-shadow: 0 2px 4px rgba(0,123,255,0.2); }
.panel-toggle:active, .floating-settings-btn:active { transform: scale(0.95); }
.panel-toggle .icon { fill: #007bff; }
.mobile-panel-close { background: #f5f5f5; }
.mobile-panel-close:hover { background: #e0e0e0; }
.mobile-panel-close .icon { fill: #666; }
.panel-content, .mobile-panel-content { flex: 1; overflow-y: auto; }
.panel-collapsed { max-height: 60px; padding: 12px 16px; overflow: hidden; }
.panel-collapsed .panel-content { display: none; }
.panel-collapsed .panel-header { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
.floating-settings-btn { position: fixed; top: 20px; right: 20px; width: 56px; height: 56px; border-radius: 50%; background: #007bff; color: white; box-shadow: 0 4px 12px rgba(0,123,255,0.4); z-index: 10000; transition: all 0.3s ease; }
.floating-settings-btn:hover { background: #0056b3; box-shadow: 0 6px 16px rgba(0,123,255,0.5); transform: scale(1.05); }
.floating-settings-btn.active { background: #dc3545; box-shadow: 0 4px 12px rgba(220,53,69,0.4); }
.floating-settings-btn.active:hover { background: #c82333; box-shadow: 0 6px 16px rgba(220,53,69,0.5); }
.mobile-panel-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: flex-end; animation: fadeIn 0.3s ease; }
.mobile-panel { width: 100%; max-height: 80vh; background: white; border-radius: 20px 20px 0 0; display: flex; flex-direction: column; animation: slideUp 0.3s ease; box-shadow: 0 -4px 20px rgba(0,0,0,0.15); }
.mobile-panel-header { padding: 16px 20px; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@media (max-width: 1023px) { .header { display: none; } .content { flex-direction: column; padding: 0; gap: 0; height: 100%; } .avatar-render { height: 100%; border-radius: 0; } .panel { display: none; } .subtitle { bottom: 180px; } }
@media (max-width: 768px) { .input-area { padding: 8px; bottom: 5%; } .input-container { padding: 6px 10px; border-radius: 20px; } .input-text { font-size: 14px; max-height: 100px; } .btn { width: 32px; height: 32px; } .icon { width: 18px; height: 18px; } }
</style>
