# cineharbor-web

CineHarbor Web 客户端（Next.js + PWA），对应 Stremio 的 `stremio-web`。

> P4 阶段从旧项目迁入。数据面有两条通路，边界见 ADR-0004：
>
> - 既有页面（搜索/播放/直播）继续走原生 `/api`（「来源 + 剧集」富模型，保留逐集点播等能力），不强行降级到 addon 扁平模型。
> - 本地 `cineharbor-local-service` 的 `/addons` 聚合端点服务于 Stremio 双向互操作与桌面壳等新客户端，`src/lib/transport/addon-client.ts` 为传输层。

## 常用命令

```bash
pnpm install
pnpm dev          # 开发服务器（含生成 PWA manifest）
pnpm typecheck    # tsc 类型检查
pnpm build        # 生产构建
pnpm test         # jest
```

## 环境变量

运行/构建所需变量见旧项目 `.env.local`（含 Upstash 等密钥），本地开发需自行配置；敏感值不入库。

## 许可证

CC BY-NC-SA 4.0