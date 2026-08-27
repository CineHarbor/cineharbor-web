# cineharbor-web

CineHarbor Web 客户端（Next.js + PWA），对应 Stremio 的 `stremio-web`。

> P4 阶段从旧项目迁入；数据面经本地 `cineharbor-local-service` 的 `/addons` 聚合端点消费内容。

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