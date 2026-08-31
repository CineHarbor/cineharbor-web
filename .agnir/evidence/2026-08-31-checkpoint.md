# 2026-08-31 checkpoint（续作 douban-imdb-rt + 品牌构建修复）

## 本轮改动（已 commit，未 push）

- `aaea96c` feat(web): 三源评分统一聚合层 P0（douban 真实 + IMDb/RT 门控降级）+ `POST /api/ratings/batch`。
- `490fa33` fix(web): `gen:manifest` 补品牌色与 maskable 图标，消除构建对 `public/manifest.json` 的覆盖回退。
- `6bd7e99` refactor(web): 品牌主题色收敛到 `NEXT_PUBLIC_THEME_COLOR` 单一来源。

## 待推送

- `cineharbor-web`：`main` 领先 `origin/main` 3 个提交（上述 3 个）。
- `cineharbor`（门面）：`main` 领先 `origin/main` 1 个提交（`64b0b85` docs: douban-imdb-rt P0 落地…）。

## 验证

- `pnpm typecheck`、`pnpm test`（108 suites / 517 tests）、`pnpm build` 均通过。
- `pnpm gen:manifest`（未设 env）与提交版 `public/manifest.json` 零 diff；`NEXT_PUBLIC_THEME_COLOR` 覆盖冒烟通过。