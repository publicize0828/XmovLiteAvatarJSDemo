/**
 * XmovASR 3.0 签名工具
 * 根据 ASR 2.0~3.0 服务对接文档实现
 */

/**
 * 生成 XmovASR 签名
 * @param params - 参数字典，包含 app_id 和 timestamp
 * @param secret - app 密钥
 * @returns 签名字符串（已 URL 编码）
 */
export function makeXmovAsrSignature(
  params: { app_id: number | string; timestamp: number },
  secret: string
): string {
  // 1. 对参数按 key 的 ASCII 码排序
  const sortedKeys = Object.keys(params).sort();
  const paramsStr = sortedKeys
    .map((key) => `${key}=${params[key as keyof typeof params]}`)
    .join("&");

  // 2. 使用 HMAC-SHA1 加密
  // 支持 CryptoJSTest 和 CryptoJS（项目中可能使用不同的变量名）
  const CryptoJS = window.CryptoJSTest || window.CryptoJS;
  if (!CryptoJS) {
    throw new Error("CryptoJS 未加载，无法生成签名");
  }

  const hash = CryptoJS.HmacSHA1(paramsStr, secret);

  // 3. 转换为 Uint8Array 然后转为字符串
  const words = hash.words;
  const sigBytes = hash.sigBytes;
  const u8 = new Uint8Array(sigBytes);
  for (let i = 0; i < sigBytes; i++) {
    u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }

  // 4. 转换为字符串
  let dataString = "";
  for (let i = 0; i < u8.length; i++) {
    dataString += String.fromCharCode(u8[i]);
  }

  // 5. Base64 编码
  const base64 = window.btoa(dataString);

  // 6. URL 编码
  return encodeURIComponent(base64);
}

/**
 * 生成 XmovASR WebSocket URL
 * @param appId - 应用 ID
 * @param secret - 应用密钥
 * @param endpoint - WebSocket 端点 URL（默认使用测试环境）
 * @returns 完整的 WebSocket URL
 */
export function makeXmovAsrUrl(
  appId: number | string,
  secret: string,
  endpoint: string = "wss://asr-api.xingyun3d.com/ws/asr/"
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    app_id: appId,
    timestamp: timestamp,
  };
  const signature = makeXmovAsrSignature(params, secret);
  return `${endpoint}?app_id=${appId}&timestamp=${timestamp}&signature=${signature}`;
}
