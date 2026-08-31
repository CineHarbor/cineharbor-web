#!/usr/bin/env node
/* eslint-disable */
// 根据 NEXT_PUBLIC_SITE_NAME 动态生成 manifest.json

const fs = require('fs');
const path = require('path');

// 获取项目根目录
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const manifestPath = path.join(publicDir, 'manifest.json');

// 从环境变量获取站点名称
const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'CineHarbor';

// 品牌主题色：单一来源为环境变量 NEXT_PUBLIC_THEME_COLOR（见 README 环境变量），
// 未设置时回落品牌默认 #0B1220。src/app/layout.tsx 的 theme-color meta 读同一变量。
const BRAND_THEME_COLOR = process.env.NEXT_PUBLIC_THEME_COLOR || '#0B1220';

// manifest.json 模板
const manifestTemplate = {
  name: siteName,
  short_name: siteName,
  description: '影视聚合',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: BRAND_THEME_COLOR,
  theme_color: BRAND_THEME_COLOR,
  'apple-mobile-web-app-capable': 'yes',
  'apple-mobile-web-app-status-bar-style': 'black',
  icons: [
    {
      src: '/icons/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/icons/icon-256x256.png',
      sizes: '256x256',
      type: 'image/png',
    },
    {
      src: '/icons/icon-384x384.png',
      sizes: '384x384',
      type: 'image/png',
    },
    {
      src: '/icons/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
    },
    {
      src: '/icons/icon-512-maskable.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};

try {
  // 确保 public 目录存在
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 写入 manifest.json
  fs.writeFileSync(manifestPath, JSON.stringify(manifestTemplate, null, 2));
  console.log(`✅ Generated manifest.json with site name: ${siteName}`);
} catch (error) {
  console.error('❌ Error generating manifest.json:', error);
  process.exit(1);
}
