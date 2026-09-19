import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  Cdp,
  launchChrome,
  readDevToolsPort,
  sleep,
  spawnRustAddon,
  waitForUrl,
  wsConnect,
} from './smoke-tools.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const addonSdkRoot = path.resolve(root, '..', 'cineharbor-addon-sdk');
const PASSWORD = 'cineharbor-release-product-smoke';
const POSTER =
  'data:image/svg+xml;base64,' +
  Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="3"><rect width="2" height="3" fill="gray"/></svg>').toString('base64');

function vodItem(fixtureOrigin) {
  return {
    vod_id: '101',
    vod_name: '星际穿越',
    vod_pic: POSTER,
    vod_year: '2014',
    vod_class: '科幻',
    type_name: '电影',
    vod_content: '一部关于星际旅行的电影',
    vod_douban_id: '3541415',
    vod_play_url: '正片$' + fixtureOrigin + '/media/movie.m3u8',
  };
}

function startFixtureServer() {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      const origin = 'http://127.0.0.1:' + server.address().port;
      const url = new URL(request.url || '/', origin);
      response.setHeader('access-control-allow-origin', '*');

      if (url.pathname === '/douban-search') {
        response.setHeader('content-type', 'text/html; charset=utf-8');
        response.end(
          '<!doctype html><html><body><script>window.__DATA__=' +
            JSON.stringify({
              total: 1,
              items: [
                {
                  tpl_name: 'search_subject',
                  id: 3541415,
                  title: '星际穿越 Interstellar (2014)',
                  cover_url: POSTER,
                  labels: [{ text: '电影' }],
                  rating: { value: 9.4, count: 800000 },
                },
              ],
            }) +
            ';</script></body></html>'
        );
        return;
      }

      if (url.pathname === '/vod-api') {
        response.setHeader('content-type', 'application/json; charset=utf-8');
        const ids = url.searchParams.get('ids');
        const wd = url.searchParams.get('wd');
        if (url.searchParams.get('ac') === 'videolist' && ids) {
          response.end(JSON.stringify({ list: ids === '101' ? [vodItem(origin)] : [] }));
          return;
        }
        if (url.searchParams.get('ac') === 'videolist' && wd) {
          response.end(JSON.stringify({ pagecount: 1, list: [vodItem(origin)] }));
          return;
        }
        response.end(JSON.stringify({ pagecount: 1, list: [] }));
        return;
      }

      if (
        url.pathname === '/media/movie.m3u8' ||
        url.pathname === '/media/live1.m3u8' ||
        url.pathname === '/media/live2.m3u8'
      ) {
        response.setHeader('content-type', 'application/vnd.apple.mpegurl');
        response.end(
          '#EXTM3U\n' +
            '#EXT-X-VERSION:3\n' +
            '#EXT-X-TARGETDURATION:1\n' +
            '#EXT-X-MEDIA-SEQUENCE:0\n' +
            '#EXTINF:1.0,\n' +
            origin +
            '/media/segment.ts\n' +
            '#EXT-X-ENDLIST\n'
        );
        return;
      }

      if (url.pathname === '/media/segment.ts') {
        response.setHeader('content-type', 'video/mp2t');
        const packet = Buffer.alloc(188);
        packet[0] = 0x47;
        response.end(packet);
        return;
      }

      response.statusCode = 404;
      response.end('not found');
    });

    server.listen(0, '127.0.0.1', () =>
      resolve({ server, port: server.address().port })
    );
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function spawnDoubanAddon(fixtureOrigin) {
  return spawnRustAddon('cineharbor-addon-douban', {
    root: addonSdkRoot,
    env: {
      CINEHARBOR_ADDON_PORT: '11471',
      CINEHARBOR_DOUBAN_SEARCH_BASE_URL: fixtureOrigin + '/douban-search',
    },
  });
}

function spawnVodAddon(configPath) {
  return spawnRustAddon('cineharbor-addon-vod', {
    root: addonSdkRoot,
    env: {
      CINEHARBOR_ADDON_PORT: '11473',
      CINEHARBOR_VOD_SITES: configPath,
    },
  });
}

function spawnLiveAddon(playlistPath) {
  return spawnRustAddon('cineharbor-addon-live', {
    root: addonSdkRoot,
    env: {
      CINEHARBOR_ADDON_PORT: '11472',
      CINEHARBOR_LIVE_SOURCE: playlistPath,
    },
  });
}

function buildAuthCookie(password) {
  const timestamp = Date.now();
  const payload = {
    username: 'admin',
    role: 'owner',
    timestamp,
    signature: createHmac('sha256', password)
      .update('admin:owner:' + timestamp)
      .digest('hex'),
  };
  return encodeURIComponent(JSON.stringify(payload));
}

function buildDiscoveryCache() {
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const bangumiCalendarData = weekdays.map((en, index) => ({
    weekday: { en },
    items: [
      {
        id: 40748 + index,
        name: 'Sousou no Frieren',
        name_cn: '葬送的芙莉莲',
        rating: { score: 9 },
        air_date: '2023-09-29',
        images: {
          large: POSTER,
          common: POSTER,
          medium: POSTER,
          small: POSTER,
          grid: POSTER,
        },
      },
    ],
  }));
  return {
    state: {
      homeDiscoveryEntry: {
        hotMovies: [],
        hotTvShows: [],
        hotVarietyShows: [],
        bangumiCalendarData,
        updatedAt: Date.now(),
      },
      doubanPageEntries: {},
    },
    version: 0,
  };
}

async function main() {
  const tmp = mkdtempSync(path.join(tmpdir(), 'ch-product-path-'));
  const fixture = await startFixtureServer();
  const fixtureOrigin = 'http://127.0.0.1:' + fixture.port;
  const vodConfigPath = path.join(tmp, 'vod-sites.json');
  const livePlaylistPath = path.join(tmp, 'channels.m3u');
  writeFileSync(
    vodConfigPath,
    JSON.stringify({
      sites: [
        {
          key: 'mock',
          name: 'MockSite',
          api: fixtureOrigin + '/vod-api',
          disable_ad_filter: true,
        },
      ],
    }),
    'utf8'
  );
  writeFileSync(
    livePlaylistPath,
    '#EXTM3U\n' +
      '#EXTINF:-1 tvg-id="cctv1" tvg-name="CCTV1" group-title="央视",CCTV-1 综合\n' +
      fixtureOrigin +
      '/media/live1.m3u8\n' +
      '#EXTINF:-1 tvg-id="cctv5" tvg-name="CCTV5" group-title="体育",CCTV-5 体育\n' +
      fixtureOrigin +
      '/media/live2.m3u8\n',
    'utf8'
  );

  const douban = spawnDoubanAddon(fixtureOrigin);
  const vod = spawnVodAddon(vodConfigPath);
  const live = spawnLiveAddon(livePlaylistPath);
  const port = await getFreePort();
  const origin = 'http://127.0.0.1:' + port;
  const next = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)],
    {
      cwd: root,
      stdio: ['ignore', 'inherit', 'inherit'],
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PASSWORD,
        USERNAME: 'admin',
        CINEHARBOR_ALLOWED_HOSTS: '127.0.0.1',
        NEXT_PUBLIC_STORAGE_TYPE: 'localstorage',
        ANNOUNCEMENT: 'release-smoke',
      },
    }
  );

  const profile = mkdtempSync(path.join(tmpdir(), 'ch-product-browser-'));
  let chrome;
  let ws;

  try {
    await Promise.all([
      waitForUrl('http://127.0.0.1:11471/manifest.json'),
      waitForUrl('http://127.0.0.1:11472/manifest.json'),
      waitForUrl('http://127.0.0.1:11473/manifest.json'),
      waitForUrl(origin + '/login', 30_000),
    ]);

    chrome = launchChrome(profile);
    const debugPort = await readDevToolsPort(profile);
    const targets = await (
      await fetch('http://127.0.0.1:' + debugPort + '/json', {
        signal: AbortSignal.timeout(5_000),
      })
    ).json();
    const page = targets.find((target) => target.type === 'page');
    assert.ok(page, 'Missing browser page target');

    ws = await wsConnect(page.webSocketDebuggerUrl);
    const cdp = new Cdp(ws, 120_000);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    const evaluate = async (expression) => {
      const result = await cdp.send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails) {
        throw new Error('Browser evaluation failed: ' + JSON.stringify(result.exceptionDetails));
      }
      return result.result.value;
    };

    const navigate = async (pathname) => {
      const loaded = cdp.once('Page.loadEventFired');
      const resultPromise = cdp.send('Page.navigate', { url: origin + pathname });
      const results = await Promise.all([resultPromise, loaded]);
      if (results[0].errorText) {
        throw new Error('Browser navigation failed: ' + results[0].errorText);
      }
    };

    const waitFor = async (expression, label, timeoutMs = 45_000) => {
      const deadline = Date.now() + timeoutMs;
      let lastError = '';
      while (Date.now() < deadline) {
        try {
          if (await evaluate('Boolean(' + expression + ')')) {
            return;
          }
        } catch (error) {
          lastError = error.message;
        }
        await sleep(100);
      }
      throw new Error('Timed out waiting for ' + label + (lastError ? ': ' + lastError : ''));
    };

    const bodyContains = (text, label = text, timeoutMs) =>
      waitFor(
        'document.body && document.body.innerText.includes(' + JSON.stringify(text) + ')',
        label,
        timeoutMs
      );

    await navigate('/downloads');
    await waitFor("location.pathname === '/login'", 'private-route login redirect');
    assert.match(await evaluate('location.search'), /redirect=/);

    const authCookie = buildAuthCookie(PASSWORD);
    await cdp.send('Network.setCookie', {
      name: 'auth',
      value: authCookie,
      url: origin + '/',
      httpOnly: true,
      sameSite: 'Lax',
    });
    await cdp.send('Network.setCookie', {
      name: 'auth-info',
      value: encodeURIComponent(JSON.stringify({ username: 'admin', role: 'owner' })),
      url: origin + '/',
      httpOnly: false,
      sameSite: 'Lax',
    });

    await navigate('/search?q=' + encodeURIComponent('星际穿越'));
    await bodyContains('标题搜索结果', 'search results heading');
    await bodyContains('星际穿越 Interstellar', 'Douban addon result');
    const clicked = await evaluate(
      "(() => { const title = Array.from(document.querySelectorAll('.ch-card-title')).find((node) => node.textContent.includes('星际穿越')); const card = title && title.closest('[aria-busy]'); if (!card) return false; card.click(); return true; })()"
    );
    assert.equal(clicked, true, 'Search result card was not clickable');

    await waitFor("location.pathname === '/play'", 'search card navigation to play');
    await bodyContains('一部关于星际旅行的电影', 'hydrated VOD detail', 60_000);
    const playback = await evaluate(
      "(() => ({ pathname: location.pathname, source: new URL(location.href).searchParams.get('source'), id: new URL(location.href).searchParams.get('id'), title: document.body.innerText.includes('星际穿越'), hasVideo: Boolean(document.querySelector('video')) }))()"
    );
    assert.equal(playback.pathname, '/play');
    assert.equal(playback.source, 'mock');
    assert.equal(playback.id, '101');
    assert.equal(playback.title, true);

    const favoriteClicked = await evaluate(
      "(() => { const button = document.querySelector('button[aria-label=\"添加收藏\"]'); if (!button) return false; button.click(); return true; })()"
    );
    assert.equal(favoriteClicked, true, 'Favorite action was unavailable');
    await waitFor(
      "Boolean(document.querySelector('button[aria-label=\"取消收藏\"]'))",
      'favorite persistence write'
    );

    await navigate('/search');
    await bodyContains('星际穿越', 'search history persistence');

    const cache = buildDiscoveryCache();
    await evaluate(
      "localStorage.setItem('discovery-cache-v1'," +
        JSON.stringify(JSON.stringify(cache)) +
        "); localStorage.setItem('hasSeenAnnouncement','release-smoke'); true"
    );
    await navigate('/');
    await bodyContains('新番放送', 'home Bangumi section');
    await bodyContains('葬送的芙莉莲', 'home Bangumi cached rendering');

    const favoritesTabClicked = await evaluate(
      "(() => { const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent.trim() === '收藏夹'); if (!button) return false; button.click(); return true; })()"
    );
    assert.equal(favoritesTabClicked, true, 'Favorites tab missing');
    await bodyContains('我的收藏', 'favorites tab');
    await bodyContains('星际穿越', 'favorite persisted across navigation');

    await navigate('/live');
    await waitFor(
      "Boolean(document.querySelector('[data-channel-id=\"live:m3u8:0\"]'))",
      'live addon channel list',
      60_000
    );
    await bodyContains('CCTV-1 综合', 'initial live channel');
    const switched = await evaluate(
      "(() => { const button = document.querySelector('[data-channel-id=\"live:m3u8:1\"]'); if (!button) return false; button.click(); return true; })()"
    );
    assert.equal(switched, true, 'Second live channel missing');
    await waitFor(
      "document.body.innerText.includes('CCTV-5 体育') && Boolean(document.querySelector('[data-channel-id=\"live:m3u8:1\"]'))",
      'live channel switch'
    );

    await navigate('/downloads?error=missing');
    await bodyContains('离线文件缺失或缓存已被系统清理', 'downloads explicit missing-file error');
    const groupingClicked = await evaluate(
      "(() => { const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent.includes('全局同名聚合')); if (!button) return false; button.click(); return true; })()"
    );
    assert.equal(groupingClicked, true, 'Download grouping setting missing');
    await bodyContains('全局同名聚合：开', 'download setting update');
    await navigate('/downloads');
    await bodyContains('全局同名聚合：开', 'download setting persistence');

    await navigate('/play');
    await bodyContains('缺少必要参数', 'explicit invalid playback error');

    console.log(
      'PRODUCT_PATH_RESULT=' +
        JSON.stringify({
          authRedirect: true,
          searchToPlayback: true,
          hydratedDetail: true,
          searchHistoryPersistence: true,
          favoritePersistence: true,
          homeBangumiRendering: true,
          liveSwitch: true,
          downloadsErrorAndSettingsPersistence: true,
          invalidPlaybackError: true,
        })
    );
  } finally {
    ws?.close();
    chrome?.kill('SIGKILL');
    next.kill('SIGKILL');
    douban.kill('SIGKILL');
    vod.kill('SIGKILL');
    live.kill('SIGKILL');
    fixture.server.close();
    await sleep(250);
    rmSync(profile, { recursive: true, force: true });
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('PRODUCT_PATH_FAILED: ' + error.message);
  process.exit(1);
});
