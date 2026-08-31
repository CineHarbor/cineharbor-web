# cineharbor-web Next Actions

0. **提交并推送本次 Agnir 初始化**（`AGNIR.yaml` / `AGENTS.md` / `.agnir/` / README 段），当前均为未提交改动。

1. 本地开发配置 `.env.local`（含 Upstash 等密钥，不入库）。
2. 数据面边界遵循 ADR-0004：既有页面继续走 `/api`，新客户端走 local-service `/addons`。
3. `pnpm install` / `pnpm dev` / `pnpm typecheck` / `pnpm build` / `pnpm test`。
