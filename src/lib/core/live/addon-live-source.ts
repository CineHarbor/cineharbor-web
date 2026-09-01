//! 把 `AddonLiveClient`（addon 直连）适配为 live 页原生的 `LiveSource` / `LiveChannel` 形状。
//!
//! 用途：live 页切走时用开关把 `fetchLiveSources` / `fetchLiveChannels` 换成本适配器（native 形状不变，
//! 页面零改动）。语义差异：`LiveSource.url` 置空（addon 不暴露上游 M3U）；`LiveChannel.url` 取已转链流 url
//! （`getStreamUrl` 按频道逐个取，addon 侧仅本地拼 URL、无上游抓取，代价为每频道一次本地 HTTP）；`tvgId`
//! 恒空（EPG 缺口，页面已 `tvgId || name` 回退）。

import type { LiveChannel, LiveSource } from "@/lib/transport/live-client";

import type { AddonLiveClient } from "./addon-live-client";

export interface AddonLiveDataSource {
  listSources(): Promise<LiveSource[]>;
  listChannels(sourceKey: string): Promise<LiveChannel[]>;
}

export class AddonLiveDataSourceImpl implements AddonLiveDataSource {
  constructor(private readonly client: AddonLiveClient) {}

  async listSources(): Promise<LiveSource[]> {
    const sources = await this.client.listSources();
    return sources.map((source) => ({
      key: source.key,
      name: source.name,
      url: "",
      from: "config",
    }));
  }

  async listChannels(sourceKey: string): Promise<LiveChannel[]> {
    const channels = await this.client.listChannels(sourceKey);
    const out: LiveChannel[] = [];
    for (const channel of channels) {
      let url = "";
      try {
        url = await this.client.getStreamUrl(channel.id);
      } catch {
        // 无流频道：url 置空，页面按空流跳过。
      }
      out.push({
        id: channel.id,
        tvgId: channel.tvgId,
        name: channel.name,
        logo: channel.logo,
        group: channel.group || "其他",
        url,
      });
    }
    return out;
  }
}