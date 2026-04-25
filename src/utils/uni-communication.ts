/**
 * uniapp web-view 通信工具
 * 用于 base 项目与 uniapp 之间的双向通信
 */

export interface UniMessage {
  type: string;
  data?: any;
  timestamp?: number;
}

/**
 * 检测是否在 uniapp 的 web-view 环境中
 */
export function isInUniApp(): boolean {
  // 检测微信小程序环境（多种方式）
  if (typeof wx !== 'undefined') {
    // 方式1: 直接检测 wx.miniProgram
    if (wx.miniProgram) {
      return true;
    }
    // 方式2: 通过 getEnv 检测（异步，但更可靠）
    try {
      // @ts-ignore
      if (wx.miniProgram && typeof wx.miniProgram.getEnv === 'function') {
        return true;
      }
    } catch (e) {
      // 忽略错误
    }
  }
  
  // 检测 uniapp 环境（通过 userAgent 或其他特征）
  if (typeof uni !== 'undefined') {
    return true;
  }
  
  // 检测是否在 iframe 中（web-view 可能以 iframe 形式嵌入）
  try {
    return window.self !== window.top;
  } catch (e) {
    // 跨域情况下会抛出错误，说明在 iframe 中
    return true;
  }
}

/**
 * 检测微信小程序环境（更严格的检测）
 */
function isWeChatMiniProgram(): boolean {
  if (typeof wx === 'undefined') {
    return false;
  }
  
  try {
    // 尝试访问 miniProgram 对象
    // @ts-ignore
    return !!(wx.miniProgram);
  } catch (e) {
    return false;
  }
}

/**
 * 向 uniapp 父窗口发送消息
 * @param message - 消息对象
 */
export function sendToUniApp(message: UniMessage): void {
  const fullMessage: UniMessage = {
    ...message,
    timestamp: Date.now(),
  };

  let messageSent = false;

  // 调试信息：输出当前环境状态
  if (process.env.NODE_ENV === 'development') {
    console.log('[UniApp通信] 环境检测:', {
      hasWx: typeof wx !== 'undefined',
      // @ts-ignore
      hasMiniProgram: typeof wx !== 'undefined' && !!wx.miniProgram,
      hasUni: typeof uni !== 'undefined',
      isInIframe: window.self !== window.top,
      userAgent: navigator.userAgent,
    });
  }

  // 方式1: 微信小程序环境（优先检测）
  // 在微信小程序 web-view 中，wx 对象可能异步加载，需要多次尝试
  if (typeof wx !== 'undefined') {
    try {
      // @ts-ignore
      const miniProgram = wx.miniProgram;
      if (miniProgram) {
        // 微信小程序中，postMessage 可以直接调用
        // 注意：在微信小程序 web-view 中，postMessage 会缓存消息
        // 消息会在页面隐藏、分享等时机发送给小程序页面
        // 这是微信小程序的机制，不是 bug
        // @ts-ignore
        miniProgram.postMessage({ data: fullMessage });
        console.log('[UniApp通信] ✅ 已发送消息到微信小程序（消息已缓存，将在页面隐藏/分享时发送）:', fullMessage);
        messageSent = true;
      } else {
        // 如果 miniProgram 不存在，可能是还没加载完成，延迟重试
        console.warn('[UniApp通信] ⚠️ wx.miniProgram 不存在，延迟重试...');
        setTimeout(() => {
          try {
            // @ts-ignore
            if (wx && wx.miniProgram) {
              // @ts-ignore
              wx.miniProgram.postMessage({ data: fullMessage });
              console.log('[UniApp通信] ✅ 延迟发送消息到微信小程序成功:', fullMessage);
            } else {
              console.warn('[UniApp通信] ⚠️ 延迟重试后，wx.miniProgram 仍不存在');
            }
          } catch (e) {
            console.warn('[UniApp通信] ❌ 延迟发送到微信小程序失败:', e);
          }
        }, 100);
      }
    } catch (error) {
      console.error('[UniApp通信] ❌ 发送消息到微信小程序失败:', error);
      // 即使出错也尝试其他方式
    }
  } else {
    // 如果 wx 对象不存在，可能是还没加载，延迟检测
    // 但不要阻塞，继续尝试其他方式
    if (process.env.NODE_ENV === 'development') {
      console.warn('[UniApp通信] ⚠️ wx 对象不存在，延迟检测...');
    }
    setTimeout(() => {
      if (typeof wx !== 'undefined') {
        try {
          // @ts-ignore
          if (wx.miniProgram) {
            // @ts-ignore
            wx.miniProgram.postMessage({ data: fullMessage });
            console.log('[UniApp通信] ✅ 延迟检测并发送消息到微信小程序:', fullMessage);
          }
        } catch (e) {
          // 忽略错误
        }
      }
    }, 200);
  }

  // 方式2: uniapp 环境（通过 postMessage）
  if (!messageSent && window.parent && window.parent !== window.self) {
    try {
      window.parent.postMessage(fullMessage, '*');
      console.log('[UniApp通信] 已发送消息到父窗口:', fullMessage);
      messageSent = true;
    } catch (error) {
      console.error('[UniApp通信] 发送消息到父窗口失败:', error);
    }
  }

  // 方式3: 尝试通过 uni 对象
  if (!messageSent && typeof uni !== 'undefined') {
    try {
      // @ts-ignore
      uni.postMessage({ data: fullMessage });
      console.log('[UniApp通信] 已发送消息到 uniapp:', fullMessage);
      messageSent = true;
    } catch (error) {
      console.error('[UniApp通信] 发送消息到 uniapp 失败:', error);
    }
  }

  // 方式4: 如果是在 iframe 中，即使检测失败也尝试发送
  if (!messageSent) {
    try {
      const isInIframe = window.self !== window.top;
      if (isInIframe && window.parent) {
        window.parent.postMessage(fullMessage, '*');
        console.log('[UniApp通信] 已通过 iframe postMessage 发送消息:', fullMessage);
        messageSent = true;
      }
    } catch (e) {
      // 跨域情况下会抛出错误，这是正常的
    }
  }

  // 如果所有方式都失败，输出警告（但不阻止执行）
  if (!messageSent) {
    console.warn('[UniApp通信] 未检测到 uniapp 环境，消息未发送:', fullMessage);
    // 在开发环境中，仍然尝试发送，以防检测逻辑有问题
    if (process.env.NODE_ENV === 'development') {
      try {
        if (window.parent) {
          window.parent.postMessage(fullMessage, '*');
          console.log('[UniApp通信] 开发环境：已尝试通过 postMessage 发送消息');
        }
      } catch (e) {
        // 忽略错误
      }
    }
  }
}

/**
 * 监听来自 uniapp 父窗口的消息
 * @param callback - 消息回调函数
 * @returns 取消监听的函数
 */
export function listenFromUniApp(
  callback: (message: UniMessage) => void
): () => void {
  const messageHandler = (event: MessageEvent) => {
    // 验证消息来源（可选，根据实际需求调整）
    // if (event.origin !== 'expected-origin') return;
    
    try {
      const message = event.data as UniMessage;
      if (message && message.type) {
        console.log('[UniApp通信] 收到来自父窗口的消息:', message);
        callback(message);
      }
    } catch (error) {
      console.error('[UniApp通信] 处理消息失败:', error);
    }
  };

  window.addEventListener('message', messageHandler);

  // 返回取消监听的函数
  return () => {
    window.removeEventListener('message', messageHandler);
  };
}

/**
 * 消息类型常量
 */
export const MESSAGE_TYPES = {
  // 连接相关
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECT_ERROR: 'connect_error',
  
  // 状态相关
  STATE_CHANGE: 'state_change',
  VOICE_STATE_CHANGE: 'voice_state_change',
  
  // 字幕相关
  SUBTITLE_ON: 'subtitle_on',
  SUBTITLE_OFF: 'subtitle_off',
  
  // 消息相关
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  
  // 语音识别相关
  ASR_START: 'asr_start',
  ASR_RESULT: 'asr_result',
  ASR_END: 'asr_end',
  ASR_ERROR: 'asr_error',
  
  // 初始化相关
  INIT_SUCCESS: 'init_success',
  INIT_ERROR: 'init_error',
  
  // 来自 uniapp 的消息类型
  FROM_UNIAPP: {
    SEND_MESSAGE: 'send_message',
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    INTERRUPT: 'interrupt',
    START_ASR: 'start_asr',
    STOP_ASR: 'stop_asr',
  },
} as const;

/**
 * 初始化微信小程序环境检测
 * 在页面加载完成后检测并设置全局变量
 */
let wxMiniProgramReady = false;
let wxMiniProgramCheckAttempts = 0;
const MAX_CHECK_ATTEMPTS = 10;

function checkWxMiniProgram() {
  if (wxMiniProgramReady || wxMiniProgramCheckAttempts >= MAX_CHECK_ATTEMPTS) {
    return;
  }

  wxMiniProgramCheckAttempts++;
  
  if (typeof wx !== 'undefined') {
    try {
      // @ts-ignore
      if (wx.miniProgram) {
        wxMiniProgramReady = true;
        console.log('[UniApp通信] 微信小程序环境已就绪');
        return;
      }
    } catch (e) {
      // 忽略错误
    }
  }

  // 如果还没就绪，继续尝试
  if (!wxMiniProgramReady && wxMiniProgramCheckAttempts < MAX_CHECK_ATTEMPTS) {
    setTimeout(checkWxMiniProgram, 100);
  }
}

// 页面加载完成后开始检测
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    checkWxMiniProgram();
  } else {
    window.addEventListener('load', checkWxMiniProgram);
    // 也尝试立即检测
    setTimeout(checkWxMiniProgram, 50);
  }
}

