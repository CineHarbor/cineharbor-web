'use strict';
/* eslint-disable @typescript-eslint/no-var-requires, no-console */
// 同步 IMDb 官方 datasets（title.basics / title.akas / title.ratings），
// 浓缩为运行时索引 JSON：`data/imdb-index.json`（覆盖路径用 IMDB_INDEX_PATH）。
// 用法：`pnpm sync:imdb`。索引格式见 src/lib/ratings/providers/imdb.ts 的 ImdbIndex。
//
// 零 key：数据来自 https://datasets.imdbws.com/ 的公开数据集（非商业自用）。

const https = require('node:https');
const zlib = require('node:zlib');
const readline = require('node:readline');
const fs = require('node:fs');
const path = require('node:path');

const { normalizeTitleKey } = require('../src/lib/ratings/imdb/title-key.js');

const DATASET_BASE = 'https://datasets.imdbws.com/';
const BASICS_KEEP = new Set(['movie', 'tvMovie', 'tvSeries', 'tvMiniSeries']);
const REGION_KEEP = new Set(['CN', 'TW', 'HK', 'SG', 'MY', 'MO']);
const LANGUAGE_PREFIXES = ['zh', 'cmn', 'yue', 'nan', 'wuu', 'hak'];
const MAX_ENTRIES_PER_KEY = 8;

function mapType(titleType) {
  return titleType === 'movie' || titleType === 'tvMovie' ? 'movie' : 'tv';
}

function parseYear(raw) {
  const year = Number.parseInt(raw, 10);
  return Number.isFinite(year) ? year : 0;
}

function isChineseAlias(region, language) {
  if (REGION_KEEP.has(region)) {
    return true;
  }
  if (!language || language === '\\N') {
    return false;
  }
  const lang = language.toLowerCase();
  return LANGUAGE_PREFIXES.some((prefix) => lang.startsWith(prefix));
}

function streamGz(url, onLine) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`下载失败 ${url}: HTTP ${res.statusCode}`));
          return;
        }

        const gunzip = zlib.createGunzip();
        const lines = readline.createInterface({
          input: res.pipe(gunzip),
          crlfDelay: Infinity,
        });
        let count = 0;
        lines.on('line', (line) => {
          count += 1;
          onLine(line);
        });
        lines.on('close', () => resolve(count));
        lines.on('error', reject);
        gunzip.on('error', reject);
      })
      .on('error', reject);
  });
}

async function loadRatings() {
  const ratings = new Map();
  await streamGz(`${DATASET_BASE}title.ratings.tsv.gz`, (line) => {
    const cols = line.split('\t');
    if (cols[0] === 'tconst') {
      return;
    }
    const value = Number.parseFloat(cols[1]);
    const votes = Number.parseInt(cols[2], 10);
    if (Number.isFinite(value) && Number.isFinite(votes)) {
      ratings.set(cols[0], { value, votes });
    }
  });
  return ratings;
}

async function loadBasics(ratings) {
  const basics = new Map();
  await streamGz(`${DATASET_BASE}title.basics.tsv.gz`, (line) => {
    const cols = line.split('\t');
    if (cols[0] === 'tconst') {
      return;
    }
    const tconst = cols[0];
    const titleType = cols[1];
    const isAdult = cols[4];
    if (!BASICS_KEEP.has(titleType) || isAdult === '1') {
      return;
    }
    if (!ratings.has(tconst)) {
      return;
    }

    basics.set(tconst, {
      type: mapType(titleType),
      primaryTitle: cols[2] === '\\N' ? '' : cols[2],
      originalTitle: cols[3] === '\\N' ? '' : cols[3],
      year: parseYear(cols[5]),
    });
  });
  return basics;
}

async function loadChineseAliases(basics) {
  const aliases = new Map();
  await streamGz(`${DATASET_BASE}title.akas.tsv.gz`, (line) => {
    const cols = line.split('\t');
    if (cols[0] === 'titleId') {
      return;
    }
    const titleId = cols[0];
    if (!basics.has(titleId)) {
      return;
    }
    if (!isChineseAlias(cols[3], cols[4])) {
      return;
    }
    const title = cols[2] === '\\N' ? '' : cols[2];
    if (!title) {
      return;
    }

    let set = aliases.get(titleId);
    if (!set) {
      set = new Set();
      aliases.set(titleId, set);
    }
    set.add(title);
  });
  return aliases;
}

function buildTitles(basics, aliases, ratings) {
  // key -> [{id, year, type, votes}]，纯对象（避免嵌套 Map 的内存开销）。
  const titles = {};
  for (const [tconst, basic] of basics) {
    const votes = ratings[tconst]?.votes || 0;
    const candidate = {
      id: tconst,
      year: basic.year,
      type: basic.type,
      votes,
    };

    const names = new Set([basic.primaryTitle, basic.originalTitle]);
    const aka = aliases.get(tconst);
    if (aka) {
      for (const name of aka) {
        names.add(name);
      }
    }

    for (const name of names) {
      if (!name) {
        continue;
      }
      const key = normalizeTitleKey(name);
      if (!key) {
        continue;
      }
      const bucket = titles[key];
      if (!bucket) {
        titles[key] = [candidate];
        continue;
      }
      // 同名条目去重（数组很小，线性扫即可）。
      const exists = bucket.some((entry) => entry.id === tconst);
      if (!exists) {
        bucket.push(candidate);
      }
    }
  }

  for (const key of Object.keys(titles)) {
    titles[key] = titles[key]
      .sort((a, b) => b.votes - a.votes)
      .slice(0, MAX_ENTRIES_PER_KEY);
  }
  return titles;
}

function slimRatings(basics, allRatings) {
  // 只保留打在基础片目（电影/剧集）上的评分，丢弃单集/短片/游戏等全量子集，
  // 显著缩小索引体积与运行时内存。
  const ratings = {};
  for (const tconst of basics.keys()) {
    const datum = allRatings.get(tconst);
    if (datum) {
      ratings[tconst] = datum;
    }
  }
  return ratings;
}

async function buildIndex() {
  console.log('  [1/5] title.ratings.tsv.gz ...');
  const allRatings = await loadRatings();
  console.log(`  [1/5] 评分 ${allRatings.size} 条`);

  console.log('  [2/5] title.basics.tsv.gz ...');
  const basics = await loadBasics(allRatings);
  console.log(`  [2/5] 保留电影/剧集 ${basics.size} 条`);

  console.log('  [3/5] 精选评分（丢弃非电影/剧集项）...');
  const ratings = slimRatings(basics, allRatings);
  allRatings.clear();
  console.log(`  [3/5] 精选评分 ${Object.keys(ratings).length} 条`);

  console.log('  [4/5] title.akas.tsv.gz（中文别名）...');
  const aliases = await loadChineseAliases(basics);
  console.log(`  [4/5] 命中别名 ${aliases.size} 条`);

  console.log('  [5/5] 构建标题键 ...');
  const titles = buildTitles(basics, aliases, ratings);
  console.log(`  [5/5] 标题键 ${Object.keys(titles).length} 个`);

  return {
    version: 1,
    generated_at: new Date().toISOString(),
    ratings,
    titles,
  };
}

async function main() {
  const outPath = process.env.IMDB_INDEX_PATH
    ? path.resolve(process.env.IMDB_INDEX_PATH)
    : path.resolve(__dirname, '..', 'data', 'imdb-index.json');

  const started = Date.now();
  console.log(`同步 IMDb datasets → ${outPath} ...`);
  const index = await buildIndex();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const tmpPath = `${outPath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(index));
  fs.renameSync(tmpPath, outPath);

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const sizeMb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
  console.log(
    `完成：${Object.keys(index.titles).length} 个标题键 / ` +
      `${Object.keys(index.ratings).length} 条评分，` +
      `${sizeMb} MB，耗时 ${seconds}s`
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error('sync-imdb 失败:', error);
    process.exit(1);
  });
}

module.exports = { buildIndex, mapType, parseYear, isChineseAlias };