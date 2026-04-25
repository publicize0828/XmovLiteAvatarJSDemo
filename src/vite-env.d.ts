/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly XMOV_ASR_URL?: string;
  readonly XUNFEI_ASR_URL?: string;
  // SDK 配置（本地开发环境变量）
  readonly VITE_APP_ID?: string;
  readonly VITE_APP_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 全局类型声明（用于 web-view 环境检测）
declare global {
  // uni-app 全局对象类型声明
  const uni: {
    postMessage?: (options: { data: any }) => void;
    [key: string]: any;
  } | undefined;

  // 微信小程序全局对象类型声明
  const wx: {
    miniProgram?: {
      postMessage?: (options: { data: any }) => void;
      navigateBack?: (options?: any) => void;
      getEnv?: (callback: (res: { miniprogram: boolean }) => void) => void;
      [key: string]: any;
    };
    [key: string]: any;
  } | undefined;

  // Node.js process 对象（Vite 环境变量访问）
  namespace NodeJS {
    interface ProcessEnv {
      readonly NODE_ENV: 'development' | 'production' | 'test';
      [key: string]: string | undefined;
    }
  }

  const process: {
    env: NodeJS.ProcessEnv;
  };
}

export {};