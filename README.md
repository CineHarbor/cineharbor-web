# cineharbor-web

CineHarbor Web 客户端（Next.js + PWA），对应 Stremio 的 `stremio-web`。

> P4 阶段从旧项目迁入。数据面终态见 ADR-0005：Web 为薄客户端，唯一数据面 = 本地 Rust local-service，原生 `/api` 与 web 侧 TS 后端按切面退役。
>
> 过渡期：既有页面仍走原生 `/api`（「来源 + 剧集」富模型），`src/lib/transport/addon-client.ts` 是 `/addons`（local-service 的 Stremio 兼容子集）的传输层。富模型经 local-service 的 native RPC 暴露（`/addons` 子集 + 富 RPC 双表面，共用同一 Rust 核心，见 ADR-0005）。

## 常用命令

```bash
pnpm install
pnpm dev          # 开发服务器（含生成 PWA manifest）
pnpm typecheck    # tsc 类型检查
pnpm build        # 生产构建
pnpm test         # jest
pnpm sync:imdb    # 同步 IMDb 官方 datasets，生成运行时评分索引
```

## 环境变量

运行/构建所需变量见旧项目 `.env.local`（含 Upstash 等密钥），本地开发需自行配置；敏感值不入库。

- `NEXT_PUBLIC_SITE_NAME`：站点名（同时写入 `public/manifest.json`，由 `pnpm gen:manifest` 生成）。
- `NEXT_PUBLIC_THEME_COLOR`：品牌主题色（默认 `#0B1220`），`public/manifest.json` 的 `theme_color`/`background_color` 与 `app/layout.tsx` 的 `theme-color` meta 读同一变量，改色只改这一处。

三源评分聚合（`POST /api/ratings/batch`，实现见 `src/lib/ratings/`，方案见门面仓 `docs/plans/douban-imdb-rt-integration-plan.md`）：

- 豆瓣：无需额外配置，复用现有 `NEXT_PUBLIC_DOUBAN_PROXY*`。
- IMDb：`pnpm sync:imdb` 用官方 datasets 零 key 生成 `data/imdb-index.json`（`title.basics/akas/ratings`；`IMDB_INDEX_PATH` 可覆盖路径），运行时按「显式 imdb_id」或「标题+年份」匹配取评分。
- Rotten Tomatoes：`RT_RATINGS_JSON` = `{"<rt_slug>":{"value":81}}`，只展示 `Tomatometer`（P2 接入授权 feed 前为占位）。
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
6. 在 repository / VCS 上下文中，把已授权的 `commit`、`提交`、`提交代码` 或同义请求视为 checkpoint boundary：先 reconcile Agnir 再 commit，优先把 Project 改动与 Agnir 改动放进同一 revision；`commit and push`、`提交推送` 或同义请求表示 checkpoint + commit + push，并在声明了 authoritative ref 时验证推送结果。
