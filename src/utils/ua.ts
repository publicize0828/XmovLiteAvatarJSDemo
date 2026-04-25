/**
 * 用户代理（UA）相关工具函数
 */

/**
 * 检测是否在微信小程序环境中
 * @returns {boolean} 如果是小程序环境返回 true，否则返回 false
 */
export function isMiniProgram(): boolean {
  // 检测微信环境
  const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
  
  // 检测是否在小程序 webview 中
  const isMiniProgramEnv = (window as any).__wxjs_environment === 'miniprogram';
  
  return isWeChat && isMiniProgramEnv;
}

/**
 * 检测是否在微信环境中（包括小程序和普通微信浏览器）
 * @returns {boolean} 如果是微信环境返回 true，否则返回 false
 */
export function isWeChat(): boolean {
  return /MicroMessenger/i.test(navigator.userAgent);
}

/**
 * 检测是否在移动设备上
 * @returns {boolean} 如果是移动设备返回 true，否则返回 false
 */
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}
