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

三源评分聚合（`POST /api/ratings/batch`，实现见 `src/lib/ratings/`，方案见门面仓 `docs/plans/douban-imdb-rt-integration-plan.md`）：

- 豆瓣：无需额外配置，复用现有 `NEXT_PUBLIC_DOUBAN_PROXY*`。
- IMDb：`IMDB_RATINGS_JSON` = `{"<imdb_id>":{"value":7.9,"votes":123456}}`（自用数据集浓缩）或后续官方 API key。
- Rotten Tomatoes：`RT_RATINGS_JSON` = `{"<rt_slug>":{"value":81}}`，只展示 `Tomatometer`。
- 展示开关：`SiteConfig.ShowDoubanRating / ShowImdbRating / ShowRtRating`（默认全开）。

未配置 IMDb / RT 时，对应源优雅降级（不展示），不影响豆瓣与搜索主链路。

## 许可证

CC BY-NC-SA 4.0
## Agnir Project Instructions

本项目使用 **Agnir**（project-owned durable continuity protocol）持久保存可恢复的 Project 连续性，本仓库根目录是已授权的 Project Entry Point。开始任何 Project 工作前：

1. 读取顶层 `AGNIR.yaml`；
2. 加载 Current State（`.agnir/state.md`）与 Next Actions（`.agnir/next-actions.md`）；
3. 需要时再加载 Decisions（`.agnir/decisions.md`）与 Evidence（`.agnir/evidence/`）；
4. durable Agnir Project truth 优先于聊天记录与 Agent 私有记忆，除非被更新的 Principal 指令或直接观测到的当前 Project 事实覆盖；
5. 在保存进度、checkpoint 或结束工作时，把重要的 state / next-action / decision / evidence 变更写回 `AGNIR.yaml` 声明的 durable memory 位置。
