'use client';

import { useEffect } from 'react';

// 簡易ログレベル制御: NEXT_PUBLIC_LOG_LEVEL=error|warn|info|debug|silent
export default function ConsoleFilter(): null {
  useEffect(() => {
    const level = process.env.NEXT_PUBLIC_LOG_LEVEL || 'info';
    const original = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug,
    };

    const silence = (method: keyof typeof console) => {
      // @ts-expect-error allow override
      console[method] = () => {};
    };

    if (level === 'silent') {
      silence('log'); silence('warn'); silence('info'); silence('debug');
    } else if (level === 'error') {
      silence('log'); silence('warn'); silence('info'); silence('debug');
      // errorは活かす
    } else if (level === 'warn') {
      silence('log'); silence('info'); silence('debug');
    } else if (level === 'info') {
      silence('debug');
    }

    return () => {
      console.log = original.log;
      console.warn = original.warn;
      console.error = original.error;
      console.info = original.info;
      console.debug = original.debug;
    };
  }, []);

  return null;
}




