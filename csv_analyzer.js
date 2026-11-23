(function (root) {
  'use strict';

  const DIFF_COLS = [
    { key: 'B', label: 'BEGINNER' },
    { key: 'N', label: 'NORMAL' },
    { key: 'H', label: 'HYPER' },
    { key: 'A', label: 'ANOTHER' },
    { key: 'L', label: 'LEGGENDARIA' },
  ];

  const LAMP_META = {
    'NO PLAY':         { rank: 0, short: 'NP',   label: 'NO PLAY',       color: '#475569', bg: 'rgba(71,85,105,0.18)',   clearVal: null },
    'FAILED':          { rank: 1, short: 'F',    label: 'FAILED',        color: '#ef4444', bg: 'rgba(239,68,68,0.16)',   clearVal: 0.0 },
    'ASSIST CLEAR':    { rank: 2, short: 'AC',   label: 'ASSIST CLEAR',  color: '#c084fc', bg: 'rgba(192,132,252,0.18)', clearVal: 0.30 },
    'EASY CLEAR':      { rank: 3, short: 'EC',   label: 'EASY CLEAR',    color: '#4ade80', bg: 'rgba(74,222,128,0.18)',  clearVal: 0.62 },
    'CLEAR':           { rank: 4, short: 'NC',   label: 'CLEAR',         color: '#38bdf8', bg: 'rgba(56,189,248,0.18)',  clearVal: 1.0 },
    'HARD CLEAR':      { rank: 5, short: 'HC',   label: 'HARD CLEAR',    color: '#f87171', bg: 'rgba(248,113,113,0.22)', clearVal: 1.15 },
    'EX HARD CLEAR':   { rank: 6, short: 'EXHC', label: 'EX HARD CLEAR', color: '#facc15', bg: 'rgba(250,204,21,0.20)',  clearVal: 1.25 },
    'FULLCOMBO CLEAR': { rank: 7, short: 'FC',   label: 'FULLCOMBO',     color: '#22d3ee', bg: 'rgba(34,211,238,0.22)',  clearVal: 1.32 },
  };

  const AXIS_COACH = {
    sp: [
      {
        name: '乱打/高速',
        short: '乱打高速',
        tip: '优先用 RANDOM 打中高速 16 分乱打与二重乱打，保持手腕放松与小振幅击键；关注绿字视野（建议 270–310），避免高 BPM 下提前发力导致整体推快。',
        optTip: '优先 RANDOM（拆固定指法，建立通用读谱）',
      },
      {
        name: '階段/指独立',
        short: '阶段指独立',
        tip: '交替使用 正規 / MIRROR / R-RANDOM 均衡左右手，针对弱侧无名指与小指做刻意独立击键；遇到连续 16 分折返阶段时先控低速准确度再提速。',
        optTip: '正規 / MIRROR 交替 + R-RANDOM',
      },
      {
        name: '物量/体力',
        short: '物量体力',
        tip: '刻意练习 1,000+ Notes 持续密集段，减少无谓拍键力度（降噪轻打），中段学会借低密小节快速松肩换气，确保尾段手速不衰减。',
        optTip: 'RANDOM 均分双手指压',
      },
      {
        name: '認識/ズレ',
        short: '认识错拍',
        tip: '针对非整数分音、错位双押与高熵配置，重点用“听音乐节拍 + 块状横认识”代替逐个看键；可适度把 SUDDEN+ / LIFT 调稳，避免视线追尾。',
        optTip: '正規 / MIRROR 或 RANDOM 强化横认识',
      },
      {
        name: '縦連/軸',
        short: '纵连轴谱',
        tip: '单键轴与微纵连重在手腕弹性而非纯手指硬敲；练习时可先用 RANDOM 把固定轴打散培养对高速单键的节拍感，再回正規/MIRROR 攻坚固定轴。',
        optTip: '拆轴开 RANDOM；固定练习用 正規/MIRROR',
      },
      {
        name: '皿/皿複合',
        short: '连皿皿复合',
        tip: '明确 1048 / 小指皿 / 対称固定等皿手型切换，看皿时把连皿按“推-拉-推”偶奇数拍分组，切忌靠感觉乱搓引发空 POOR 连锁与 BAD 锁定。',
        optTip: '正規或 MIRROR（让皿侧键位更顺手）',
      },
      {
        name: 'CN/HCN',
        short: 'CN/HCN',
        tip: '严格区分普通 CN 与 HCN：普通 CN 尾判极宽（±116ms+）不必死盯着松手，把注意力放在按住时的游离键；HCN 一旦断按会按 16 分持续掉血，断手后要立刻补按止血。',
        optTip: '正規/MIRROR 为主，锁指严重时再试 RANDOM',
      },
      {
        name: 'ソフラン',
        short: '变速齿轮',
        tip: '提前在 Textage 记好变速小节与高低速比例，熟练使用空白处 皿チョン (FHS) 或针对主力段定绿字，低速段配合 LIFT/白字切视野避免键位糊成一团。',
        optTip: '正規/MIRROR（方便背板变速点）',
      },
    ],
    dp: [
      {
        name: '片手力/复用',
        short: '片手复用',
        tip: '针对单侧高速与同指复用，减少无名指/小指盲目硬顶，主动利用 HomePo 拇指/食指覆盖与 1M/2M 把难手型换到惯用手或更顺手的内外侧。',
        optTip: '善用 FLIP / 1M / 2M 把高频侧给优势手',
      },
      {
        name: '両手物量',
        short: '两手物量',
        tip: '提升 14 键持续供血与双侧同步稳定性，注意保持上半身居中、避免因单侧偏重导致重心歪斜和后半体力崩盘。',
        optTip: 'FLIP 平衡左右盘负载，必要时 R-RAN',
      },
      {
        name: '認識/左右振り',
        short: '认识左右振',
        tip: '强化 14 键整体横认识（把视线锚定在 P1/P2 中缝而非左右来回扫视），遇到大幅左右振り时借助对称镜像（1M/2M）把平行配置转为对称配置。',
        optTip: '1M / 2M / M/M（平行转对称极有效）',
      },
      {
        name: '無理押し/移動',
        short: '无理押移动',
        tip: '对 1+7 等大跨度与片手远距离移动，提前规划手掌平移支点与 HomePo 定位，若正規含过多無理押し，果断切换 R-RANDOM 或单侧 RANDOM 化解。',
        optTip: 'R-RANDOM / RANDOM 规避固定無理押し',
      },
      {
        name: '縦連/軸',
        short: '片手纵连',
        tip: '片手纵连极易触发单手僵硬，练习用手腕轻弹分担手指负担，或利用单侧 RANDOM / R-RANDOM 把最难的边缘键轴转移到食指/中指。',
        optTip: '单侧 RANDOM / R-RANDOM 拆边缘纵连',
      },
      {
        name: '着地/皿',
        short: '着地双皿',
        tip: '强化“回盘着地”肌肉记忆：打完皿后第一时间用小指/拇指锚定内侧键，提前判断相邻键+皿的無理皿位置，避免连带误触。',
        optTip: 'FLIP 或 单侧 MIRROR 避开無理皿',
      },
      {
        name: '片手CN',
        short: '片手CN',
        tip: '片手按住 CN 同时打同侧键时，优先用拇指或小指锁定边缘 CN 释放其余手指；HCN 断按时立即回补止血，普通 CN 尾判宽容度高不必紧张。',
        optTip: '正規/MIRROR（保持顺手锁指方向）',
      },
      {
        name: 'ソフラン',
        short: '变速齿轮',
        tip: 'DP 下变速更考验记忆与单手调速能力，提前确认空白小节位置使用皿チョン，或根据主要发狂段 BPM 设定主绿字。',
        optTip: '正規 / FLIP 固定背板',
      },
    ],
  };

  function decodeCsvBuffer(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    try {
      const txt = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return txt.replace(/^\uFEFF/, '');
    } catch (_) {
      const txt = new TextDecoder('shift-jis').decode(bytes);
      return txt.replace(/^\uFEFF/, '');
    }
  }

  function parseCsvRows(text) {
    const clean = String(text || '').replace(/^\uFEFF/, '');
    const rows = [];
    let row = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      if (inQuotes) {
        if (ch === '"') {
          if (clean[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          row.push(cur);
          cur = '';
        } else if (ch === '\r') {
          if (clean[i + 1] === '\n') i++;
          row.push(cur);
          rows.push(row);
          row = [];
          cur = '';
        } else if (ch === '\n') {
          row.push(cur);
          rows.push(row);
          row = [];
          cur = '';
        } else {
          cur += ch;
        }
      }
    }
    if (cur.length > 0 || row.length > 0) {
      row.push(cur);
      rows.push(row);
    }
    return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim() !== ''));
  }

  function normExact(s) {
    return String(s || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normCompact(s) {
    return String(s || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .normalize('NFKC')
      .toLowerCase()
      // Strip quotes, whitespace, musical/heart symbols, dashes, tilde, bullets often differing between Konami CSV & Textage
      .replace(/[\s"'`´’‘“”„＂＇〜～~\-‐‑‒–—―·・•♡♥❤❥♫♪♩♬★☆†‡!！?？.,。、:：;；()（）\[\]【】<>《》/\\]/g, '')
      .trim();
  }

  function normBaseTitle(s) {
    const raw = String(s || '').normalize('NFKC').trim();
    const stripped = raw
      .replace(/[～〜~].*?[～〜~]/g, '')
      .replace(/\s+-[^-]+-\s*$/g, '')
      .replace(/\s*\([^)]+\)\s*$/g, '')
      .trim();
    return normCompact(stripped || raw);
  }

  function normVerName(v) {
    const s = String(v || '').trim().toLowerCase();
    if (s === '1st&substream' || s === '1st style' || s === 'substream') return '1st_sub';
    return s.replace(/\s+/g, ' ');
  }

  function parseKonamiCsv(text, filename) {
    const matrix = parseCsvRows(text);
    if (matrix.length < 2) {
      throw new Error('CSV 文件内容为空或行数不足。');
    }
    const headers = matrix[0].map((h) => h.trim());
    const idx = {};
    headers.forEach((h, i) => { idx[h] = i; });

    if (idx['タイトル'] === undefined || idx['バージョン'] === undefined) {
      throw new Error('未识别到 Konami IIDX 官方 CSV 表头（缺少「バージョン」或「タイトル」列）。请确认导入的是 e-amusement 导出的成绩 CSV。');
    }

    const availableDiffs = DIFF_COLS.filter((d) => idx[`${d.label} クリアタイプ`] !== undefined);
    if (availableDiffs.length === 0) {
      throw new Error('未识别到难度成绩列（如 NORMAL/HYPER/ANOTHER クリアタイプ）。');
    }

    const songs = [];
    for (let r = 1; r < matrix.length; r++) {
      const cols = matrix[r];
      const title = (cols[idx['タイトル']] || '').trim();
      if (!title) continue;
      const version = (cols[idx['バージョン']] || '').trim();
      const genre = idx['ジャンル'] !== undefined ? (cols[idx['ジャンル']] || '').trim() : '';
      const artist = idx['アーティスト'] !== undefined ? (cols[idx['アーティスト']] || '').trim() : '';
      const playCount = idx['プレー回数'] !== undefined ? (parseInt(cols[idx['プレー回数']], 10) || 0) : 0;
      const lastPlayed = idx['最終プレー日時'] !== undefined ? (cols[idx['最終プレー日時']] || '').trim() : '';

      const diffs = {};
      for (const d of availableDiffs) {
        const lv = parseInt(cols[idx[`${d.label} 難易度`]], 10) || 0;
        const score = parseInt(cols[idx[`${d.label} スコア`]], 10) || 0;
        const pg = parseInt(cols[idx[`${d.label} PGreat`]], 10) || 0;
        const gr = parseInt(cols[idx[`${d.label} Great`]], 10) || 0;
        const missRaw = (cols[idx[`${d.label} ミスカウント`]] || '').trim();
        const hasBp = missRaw !== '' && missRaw !== '---' && /^-?\d+$/.test(missRaw);
        const bp = hasBp ? parseInt(missRaw, 10) : null;
        const lampRaw = (cols[idx[`${d.label} クリアタイプ`]] || 'NO PLAY').trim().toUpperCase();
        const lamp = LAMP_META[lampRaw] ? lampRaw : 'NO PLAY';
        const djRaw = (cols[idx[`${d.label} DJ LEVEL`]] || '---').trim().toUpperCase();
        const dj = djRaw === '---' || djRaw === '' ? null : djRaw;

        diffs[d.key] = {
          dChar: d.key,
          lv,
          score,
          pg,
          gr,
          bp,
          hasBp,
          hasScore: score > 0,
          lamp,
          lampRank: LAMP_META[lamp].rank,
          dj,
        };
      }

      songs.push({ version, title, genre, artist, playCount, lastPlayed, diffs });
    }

    const fnLower = String(filename || '').toLowerCase();
    let hintMode = null;
    if (/(^|[_\-\s])dp([_\-\s.]|$)/.test(fnLower)) hintMode = 'dp';
    else if (/(^|[_\-\s])sp([_\-\s.]|$)/.test(fnLower)) hintMode = 'sp';

    return {
      filename: filename || 'score.csv',
      hintMode,
      rowCount: songs.length,
      songs,
    };
  }

  function buildCatalogSongIndex(charts) {
    // Group charts by song identity (ver + base tag without _l suffix where appropriate)
    const songMap = new Map();
    for (const c of charts) {
      const songKey = `${c.ver}|${c.tag}`;
      if (!songMap.has(songKey)) {
        songMap.set(songKey, {
          songKey,
          tag: c.tag,
          ver: c.ver,
          verKey: normVerName(c.ver),
          title: c.title,
          artist: c.artist,
          exactTitle: normExact(c.title),
          compactTitle: normCompact(c.title),
          baseTitle: normBaseTitle(c.title),
          compactArtist: normCompact(c.artist),
          hasAc: false,
          chartsByDiff: {},
        });
      }
      const g = songMap.get(songKey);
      if (c.ac) g.hasAc = true;
      g.chartsByDiff[c.dChar] = c;
    }

    const allSongs = [...songMap.values()];
    const byExact = new Map();
    const byCompact = new Map();
    const byVerBase = new Map();
    const byVerArtist = new Map();
    const byTag = new Map();

    const pushMap = (map, k, val) => {
      if (!k) return;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(val);
    };

    for (const s of allSongs) {
      pushMap(byExact, s.exactTitle, s);
      pushMap(byCompact, s.compactTitle, s);
      pushMap(byVerBase, `${s.verKey}|${s.baseTitle}`, s);
      pushMap(byVerArtist, `${s.verKey}|${s.compactArtist}`, s);
      pushMap(byTag, s.tag, s);
    }

    return { allSongs, byExact, byCompact, byVerBase, byVerArtist, byTag };
  }

  function scoreSongCandidate(csvRow, cand, baseBonus) {
    let sc = baseBonus;
    const csvVerKey = normVerName(csvRow.version);
    if (cand.verKey === csvVerKey) sc += 100;
    if (cand.hasAc) sc += 14;

    const csvArtist = normCompact(csvRow.artist);
    if (csvArtist && cand.compactArtist) {
      if (csvArtist === cand.compactArtist) sc += 25;
      else if (cand.compactArtist.includes(csvArtist) || csvArtist.includes(cand.compactArtist)) sc += 12;
    }

    let lvMatches = 0;
    let lvTotal = 0;
    for (const d of DIFF_COLS) {
      const dr = csvRow.diffs[d.key];
      if (!dr || dr.lv <= 0) continue;
      lvTotal++;
      const ch = cand.chartsByDiff[d.key];
      if (ch) {
        if (ch.lv === dr.lv) { sc += 22; lvMatches++; }
        else if (Math.abs(ch.lv - dr.lv) === 1) { sc += 8; }
        else sc -= 8;
      }
    }
    return { score: sc, lvMatches, lvTotal };
  }

  function matchCsvToCatalog(parsedCsv, charts, mode) {
    const index = buildCatalogSongIndex(charts);
    const recordMap = new Map(); // chart.id -> playerRecord
    const playedRecords = [];
    const unmatchedSongs = [];
    let matchedSongs = 0;
    let totalCsvPlayedCharts = 0;
    let missingTextageDiffs = 0;
    let levelExactMatches = 0;
    let levelComparisons = 0;

    for (const row of parsedCsv.songs) {
      const exactKey = normExact(row.title);
      const compactKey = normCompact(row.title);
      const verKey = normVerName(row.version);
      const baseKey = `${verKey}|${normBaseTitle(row.title)}`;
      const artistKey = `${verKey}|${normCompact(row.artist)}`;

      const candScores = new Map();
      const consider = (list, bonus) => {
        if (!list) return;
        for (const cand of list) {
          const res = scoreSongCandidate(row, cand, bonus);
          const prev = candScores.get(cand.songKey);
          if (!prev || res.score > prev.score) {
            candScores.set(cand.songKey, { cand, ...res });
          }
        }
      };

      consider(index.byExact.get(exactKey), 60);
      consider(index.byCompact.get(compactKey), 48);
      if (candScores.size === 0) {
        consider(index.byVerBase.get(baseKey), 30);
      }
      if (candScores.size === 0) {
        // Tier 4: Same version + artist + strong difficulty level fingerprint (catches kanji variants like 火影 / 焱影)
        const artistCands = index.byVerArtist.get(artistKey) || [];
        for (const cand of artistCands) {
          const res = scoreSongCandidate(row, cand, 0);
          if (res.lvTotal >= 2 && res.lvMatches >= Math.max(2, res.lvTotal - 1)) {
            candScores.set(cand.songKey, { cand, ...res });
          }
        }
      }

      let best = null;
      for (const entry of candScores.values()) {
        if (!best || entry.score > best.score) best = entry;
      }

      if (!best) {
        unmatchedSongs.push({ version: row.version, title: row.title, artist: row.artist });
        for (const d of DIFF_COLS) {
          if (row.diffs[d.key]?.lampRank > 0) totalCsvPlayedCharts++;
        }
        continue;
      }

      matchedSongs++;
      const song = best.cand;

      for (const d of DIFF_COLS) {
        const dr = row.diffs[d.key];
        if (!dr) continue;
        if (dr.lampRank > 0) totalCsvPlayedCharts++;

        let chart = song.chartsByDiff[d.key];
        // Handle legacy separate `_l` Textage entries for LEGGENDARIA
        if (!chart && d.key === 'L' && dr.lv > 0) {
          const altList = index.byTag.get(`${song.tag}_l`);
          if (altList && altList.length > 0) {
            chart = altList[0].chartsByDiff.L || altList[0].chartsByDiff.A;
          }
        }
        if (!chart) {
          if (dr.lampRank > 0) missingTextageDiffs++;
          continue;
        }

        if (dr.lv > 0) {
          levelComparisons++;
          if (chart.lv === dr.lv) levelExactMatches++;
        }

        if (dr.lampRank === 0) continue; // NO PLAY

        const exRate = dr.hasScore && chart.notes > 0 ? Math.min(1, dr.score / (2 * chart.notes)) : null;
        const bpRate = dr.hasBp && chart.notes > 0 ? dr.bp / chart.notes : null;
        const pgRatio = dr.hasScore && (dr.pg + dr.gr) > 0 ? dr.pg / (dr.pg + dr.gr) : null;

        const rec = {
          chartId: chart.id,
          chart,
          mode,
          csvLevel: dr.lv || chart.lv,
          lamp: dr.lamp,
          lampRank: dr.lampRank,
          lampMeta: LAMP_META[dr.lamp],
          score: dr.score,
          hasScore: dr.hasScore,
          isCarryover: !dr.hasScore && !dr.hasBp,
          pg: dr.pg,
          gr: dr.gr,
          bp: dr.bp,
          hasBp: dr.hasBp,
          dj: dr.dj,
          exRate,
          bpRate,
          pgRatio,
          playCount: row.playCount,
          lastPlayed: row.lastPlayed,
        };

        const existing = recordMap.get(chart.id);
        if (!existing || rec.lampRank > existing.lampRank || (rec.lampRank === existing.lampRank && rec.score > existing.score)) {
          recordMap.set(chart.id, rec);
        }
      }
    }

    for (const rec of recordMap.values()) playedRecords.push(rec);

    return {
      mode,
      filename: parsedCsv.filename,
      totalCsvSongs: parsedCsv.rowCount,
      matchedSongs,
      unmatchedSongs,
      totalCsvPlayedCharts,
      missingTextageDiffs,
      playedCount: playedRecords.length,
      levelExactRate: levelComparisons > 0 ? levelExactMatches / levelComparisons : 0,
      recordMap,
      playedRecords,
    };
  }

  function detectBestMode(parsedCsv, datasets) {
    if (parsedCsv.hintMode && datasets[parsedCsv.hintMode]) {
      return parsedCsv.hintMode;
    }
    const spTry = matchCsvToCatalog(parsedCsv, datasets.sp, 'sp');
    const dpTry = matchCsvToCatalog(parsedCsv, datasets.dp, 'dp');
    const spScore = spTry.matchedSongs * 0.3 + spTry.levelExactRate * 500 + spTry.playedCount * 0.1;
    const dpScore = dpTry.matchedSongs * 0.3 + dpTry.levelExactRate * 500 + dpTry.playedCount * 0.1;
    return dpScore > spScore + 15 ? 'dp' : 'sp';
  }

  function sigmoid(x) {
    if (x > 25) return 1;
    if (x < -25) return 0;
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * 1D Regularized Logistic MLE (Rasch / IRT Clear-Power solver)
   * Fits P(y=1 | s) = sigmoid((theta - s) / tau)
   */
  function fitIrtTheta(samples, tau = 3.2) {
    if (!samples || samples.length === 0) return null;
    const pos = samples.filter((p) => p.y >= 0.5);
    const neg = samples.filter((p) => p.y < 0.5);
    if (pos.length === 0) return { theta: null, pos: 0, neg: neg.length, reliable: false, maxPos: null };

    const maxPos = Math.max(...pos.map((p) => p.s));
    const minNeg = neg.length > 0 ? Math.min(...neg.map((p) => p.s)) : maxPos + 4;
    const allS = samples.map((p) => p.s).sort((a, b) => a - b);
    const lo = Math.max(0, allS[0] - 8);
    const hi = allS[allS.length - 1] + 8;

    const priorMu = neg.length > 0 ? 0.55 * maxPos + 0.45 * minNeg : maxPos + 1.5;
    const priorVar = 18 * 18;

    let bestTheta = priorMu;
    let bestLL = -Infinity;
    for (let t = lo; t <= hi; t += 0.5) {
      let ll = -0.5 * ((t - priorMu) ** 2) / priorVar;
      for (const pt of samples) {
        const p = Math.min(1 - 1e-7, Math.max(1e-7, sigmoid((t - pt.s) / tau)));
        ll += pt.w * (pt.y * Math.log(p) + (1 - pt.y) * Math.log(1 - p));
      }
      if (ll > bestLL) {
        bestLL = ll;
        bestTheta = t;
      }
    }

    let theta = bestTheta;
    for (let iter = 0; iter < 12; iter++) {
      let grad = -(theta - priorMu) / priorVar;
      let hess = -1 / priorVar;
      for (const pt of samples) {
        const p = sigmoid((theta - pt.s) / tau);
        grad += pt.w * (pt.y - p) / tau;
        hess -= pt.w * p * (1 - p) / (tau * tau);
      }
      if (Math.abs(hess) < 1e-8) break;
      const step = Math.max(-4, Math.min(4, grad / (-hess)));
      theta += step;
      if (Math.abs(step) < 1e-4) break;
    }

    return {
      theta: Math.round(theta * 10) / 10,
      pos: pos.length,
      neg: neg.length,
      maxPos: Math.round(maxPos * 10) / 10,
      reliable: pos.length >= 3 && neg.length >= 2,
    };
  }

  function buildCatalogStats(charts) {
    const acCharts = charts.filter((c) => c.ac);
    const byLevel = {};
    for (let lv = 1; lv <= 12; lv++) {
      const sub = acCharts.filter((c) => c.lv === lv);
      const ref = sub.length >= 10 ? sub : charts.filter((c) => c.lv === lv);
      const mean = new Array(8).fill(0);
      const std = new Array(8).fill(1);
      if (ref.length > 0) {
        for (let d = 0; d < 8; d++) {
          let s = 0;
          for (const c of ref) s += c.radar[d];
          mean[d] = s / ref.length;
          let v = 0;
          for (const c of ref) v += (c.radar[d] - mean[d]) ** 2;
          std[d] = Math.max(4.5, Math.sqrt(v / ref.length));
        }
      }

      const gaugeStats = {};
      for (const g of ['ec', 'nc', 'hc', 'exhc']) {
        const vals = ref.map((c) => c[`s_${g}`]).sort((a, b) => a - b);
        const q = (p) => vals.length ? vals[Math.min(vals.length - 1, Math.floor(vals.length * p))] : 0;
        gaugeStats[g] = {
          p10: q(0.10),
          p25: q(0.25),
          p50: q(0.50),
          p75: q(0.75),
          p90: q(0.90),
          vals,
        };
      }

      byLevel[lv] = { count: ref.length, mean, std, gaugeStats };
    }
    return { byLevel };
  }

  function mapThetaToLevelTier(theta, gauge, catalogStats) {
    if (theta === null || theta === undefined) return null;
    let bestLv = 1;
    let bestDist = Infinity;
    for (let lv = 1; lv <= 12; lv++) {
      const gs = catalogStats.byLevel[lv]?.gaugeStats[gauge];
      if (!gs || gs.vals.length === 0) continue;
      const dist = Math.abs(theta - gs.p50);
      if (dist < bestDist) {
        bestDist = dist;
        bestLv = lv;
      }
    }
    const gs = catalogStats.byLevel[bestLv].gaugeStats[gauge];
    let rankPct = 0;
    for (const v of gs.vals) {
      if (theta >= v) rankPct++;
      else break;
    }
    const pct = gs.vals.length > 0 ? rankPct / gs.vals.length : 0.5;
    let band = '中位';
    if (pct >= 0.85) band = '上位 (S/A+)';
    else if (pct >= 0.65) band = '中上位 (A/B+)';
    else if (pct >= 0.35) band = '中位 (B/C)';
    else if (pct >= 0.15) band = '中下位 (C/D)';
    else band = '下位 (D/E)';

    const eqDec = bestLv + Math.max(-0.35, Math.min(1.15, (pct - 0.05) * 1.0));
    return {
      lv: bestLv,
      pct: Math.round(pct * 100),
      band,
      eqRate: Math.round(eqDec * 100) / 100,
      label: `★${bestLv} ${band}`,
    };
  }

  function parsePrimaryBpm(bpmStr) {
    const s = String(bpmStr || '');
    const nums = s.match(/\d+(?:\.\d+)?/g);
    if (!nums || nums.length === 0) return 150;
    return parseFloat(nums[nums.length - 1]);
  }

  function fitLinearBaseline(points) {
    if (points.length < 6) {
      const avg = points.length ? points.reduce((acc, p) => acc + p.y, 0) / points.length : 0;
      return { a: avg, b: 0 };
    }
    let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const p of points) {
      const w = p.w || 1;
      sw += w;
      sx += w * p.x;
      sy += w * p.y;
      sxx += w * p.x * p.x;
      sxy += w * p.x * p.y;
    }
    const mx = sx / sw;
    const my = sy / sw;
    const denom = sxx - sw * mx * mx;
    const b = Math.abs(denom) > 1e-6 ? (sxy - sw * mx * my) / denom : 0;
    const a = my - b * mx;
    return { a, b };
  }

  function analyzePlayerPerformance(matchResult, catalogCharts, radarCfg, opts = {}) {
    const mode = matchResult.mode;
    const played = matchResult.playedRecords;
    const catalogStats = buildCatalogStats(catalogCharts);
    const axisMeta = AXIS_COACH[mode];

    // 1. Per-level lamp distribution
    const levelSummary = [];
    for (let lv = 1; lv <= 12; lv++) {
      const lvPlayed = played.filter((r) => r.chart.lv === lv);
      const totalAc = catalogCharts.filter((c) => c.ac && c.lv === lv).length;
      const counts = { FAILED: 0, ASSIST: 0, EC: 0, NC: 0, HC: 0, EXHC: 0, FC: 0 };
      let scoredN = 0, exSum = 0, bpN = 0, bpRateSum = 0;
      for (const r of lvPlayed) {
        if (r.lampRank === 1) counts.FAILED++;
        else if (r.lampRank === 2) counts.ASSIST++;
        else if (r.lampRank === 3) counts.EC++;
        else if (r.lampRank === 4) counts.NC++;
        else if (r.lampRank === 5) counts.HC++;
        else if (r.lampRank === 6) counts.EXHC++;
        else if (r.lampRank === 7) counts.FC++;
        if (r.exRate !== null) { scoredN++; exSum += r.exRate; }
        if (r.bpRate !== null) { bpN++; bpRateSum += r.bpRate; }
      }
      const clearedNc = counts.NC + counts.HC + counts.EXHC + counts.FC;
      const clearedEc = clearedNc + counts.EC;
      levelSummary.push({
        lv,
        totalAc,
        played: lvPlayed.length,
        counts,
        clearedEc,
        clearedNc,
        ncRate: lvPlayed.length ? clearedNc / lvPlayed.length : 0,
        ecRate: lvPlayed.length ? clearedEc / lvPlayed.length : 0,
        avgExRate: scoredN ? exSum / scoredN : null,
        avgBpRate: bpN ? bpRateSum / bpN : null,
        scoredN,
      });
    }

    // 2. Fit 4-Gauge Clear Power (IRT, with gauge-selection censoring awareness for HC / EXHC)
    const tauByMode = mode === 'dp' ? 3.8 : 3.2;
    const ecSamples = played.map((r) => ({ s: r.chart.s_ec, y: r.lampRank >= 3 ? 1 : 0, w: 1 }));
    const ncSamples = played.map((r) => ({ s: r.chart.s_nc, y: r.lampRank >= 4 ? 1 : 0, w: 1 }));

    const ncPosCount = played.filter((r) => r.lampRank >= 4).length;
    const hcPos = played.filter((r) => r.lampRank >= 5);
    const exPos = played.filter((r) => r.lampRank >= 6);
    const hcAttemptRatio = ncPosCount > 0 ? hcPos.length / ncPosCount : 0;
    const exAttemptRatio = ncPosCount > 0 ? exPos.length / ncPosCount : 0;

    let hcSamples;
    let hcNote = '';
    if (hcAttemptRatio >= 0.42) {
      // Regular HARD-gauge player: standard IRT across played pool
      hcSamples = played.map((r) => ({ s: r.chart.s_hc, y: r.lampRank >= 5 ? 1 : 0, w: 1 }));
    } else {
      // Normal-gauge-primary player: avoid penalizing unattempted blue lamps as HARD fails!
      hcNote = '平时以 NC 为主，按已红灯与未过关谱面估算';
      const hcSorted = [...hcPos].map((r) => r.chart.s_hc).sort((a, b) => a - b);
      const hcUpperRef = hcSorted.length ? hcSorted[Math.floor(hcSorted.length * 0.75)] : 0;
      hcSamples = played
        .filter((r) => r.lampRank >= 5 || r.lampRank <= 3 || r.chart.s_hc >= hcUpperRef + 1.5)
        .map((r) => ({
          s: r.chart.s_hc,
          y: r.lampRank >= 5 ? 1 : 0,
          w: r.lampRank >= 5 ? 1.0 : (r.lampRank === 1 ? 0.85 : (r.lampRank <= 3 ? 0.55 : 0.25)),
        }));
    }

    let exSamples;
    let exNote = '';
    if (exAttemptRatio >= 0.32) {
      exSamples = played.map((r) => ({ s: r.chart.s_exhc, y: r.lampRank >= 6 ? 1 : 0, w: 1 }));
    } else {
      exNote = '按已黄灯/FC 与未过关谱面估算';
      const exSorted = [...exPos].map((r) => r.chart.s_exhc).sort((a, b) => a - b);
      const exUpperRef = exSorted.length ? exSorted[Math.floor(exSorted.length * 0.75)] : 0;
      exSamples = played
        .filter((r) => r.lampRank >= 6 || r.lampRank <= 3 || r.chart.s_exhc >= exUpperRef + 2.0)
        .map((r) => ({
          s: r.chart.s_exhc,
          y: r.lampRank >= 6 ? 1 : 0,
          w: r.lampRank >= 6 ? 1.0 : (r.lampRank === 1 ? 0.85 : (r.lampRank <= 3 ? 0.50 : 0.22)),
        }));
    }

    const irt = {
      ec: fitIrtTheta(ecSamples, tauByMode),
      nc: fitIrtTheta(ncSamples, tauByMode),
      hc: fitIrtTheta(hcSamples, tauByMode + 0.5),
      exhc: fitIrtTheta(exSamples, tauByMode + 1.0),
    };
    if (irt.hc) irt.hc.note = hcNote;
    if (irt.exhc) irt.exhc.note = exNote;
    for (const g of ['ec', 'nc', 'hc', 'exhc']) {
      if (irt[g]) {
        irt[g].eq = mapThetaToLevelTier(irt[g].theta, g, catalogStats);
      }
    }

    // Determine primary anchor theta & active focus levels
    const ncTheta = irt.nc?.theta ?? irt.ec?.theta ?? (
      played.length ? played.reduce((a, r) => a + r.chart.s_nc, 0) / played.length : 25
    );
    const ecTheta = irt.ec?.theta ?? ncTheta;
    const hcTheta = (irt.hc?.reliable && irt.hc.theta !== null) ? irt.hc.theta : (ncTheta - 1.5);

    const activeCandidates = levelSummary
      .filter((l) => l.played >= 5)
      .map((l) => {
        const mixScore = 1 - Math.abs(l.ncRate - 0.52) * 1.4;
        return { lv: l.lv, score: l.played * (0.45 + Math.max(0, mixScore)) };
      })
      .sort((a, b) => b.score - a.score);

    const primaryLevel = activeCandidates[0]?.lv || irt.nc?.eq?.lv || 8;
    const focusLevels = [
      Math.max(1, primaryLevel - 1),
      primaryLevel,
      Math.min(12, primaryLevel + 1),
    ].filter((v, i, arr) => arr.indexOf(v) === i);

    // 3. Frontier-Weighted Clear, EX% & BP% Baselines (2-pass so trivial low-level clears don't skew frontier residuals!)
    const prelimSoft = played.map((r) => {
      const ySoft = r.lampRank >= 4 ? 1.0 : (r.lampRank === 3 ? 0.62 : (r.lampRank === 2 ? 0.30 : 0.0));
      return { s: r.chart.s_nc, y: ySoft, w: 1 };
    });
    const prelimTheta = fitIrtTheta(prelimSoft, tauByMode)?.theta ?? ncTheta;

    const calcInfoW = (r, refTheta) => {
      const p = sigmoid((refTheta - r.chart.s_nc) / tauByMode);
      const dist = Math.abs(r.chart.s_nc - refTheta);
      if (p > 0.96 && r.lampRank >= 4) return 0.20;
      if (p < 0.04 && r.lampRank <= 1) return 0.25;
      if (dist > 14) return 0.45;
      return 1.0;
    };

    // Pass 2: Refit soft clear curve, NC curve, EX baseline & BP baseline with frontier weights
    const weightedSoft = played.map((r) => ({
      s: r.chart.s_nc,
      y: r.lampRank >= 4 ? 1.0 : (r.lampRank === 3 ? 0.62 : (r.lampRank === 2 ? 0.30 : 0.0)),
      w: calcInfoW(r, prelimTheta),
    }));
    const softTheta = fitIrtTheta(weightedSoft, tauByMode)?.theta ?? prelimTheta;

    const weightedNc = played.map((r) => ({
      s: r.chart.s_nc,
      y: r.lampRank >= 4 ? 1 : 0,
      w: calcInfoW(r, softTheta),
    }));
    const ncFrontierTheta = fitIrtTheta(weightedNc, tauByMode)?.theta ?? ncTheta;

    const scoredPts = played
      .filter((r) => r.exRate !== null)
      .map((r) => ({ x: r.chart.s_nc, y: r.exRate, w: calcInfoW(r, softTheta) }));
    const exBaseline = fitLinearBaseline(scoredPts);

    const bpPts = played
      .filter((r) => r.bpRate !== null)
      .map((r) => ({ x: r.chart.s_nc, y: Math.min(0.40, r.bpRate), w: calcInfoW(r, softTheta) }));
    const bpBaseline = fitLinearBaseline(bpPts);

    const enriched = played.map((r) => {
      const c = r.chart;
      const pEc = sigmoid((ecTheta - c.s_ec) / tauByMode);
      const pNc = sigmoid((ncFrontierTheta - c.s_nc) / tauByMode);
      const pSoft = sigmoid((softTheta - c.s_nc) / tauByMode);
      const actualSoft = r.lampRank >= 4 ? 1.0 : (r.lampRank === 3 ? 0.62 : (r.lampRank === 2 ? 0.30 : 0.0));
      const rClear = actualSoft - pSoft;

      const expEx = Math.max(0.30, Math.min(0.98, exBaseline.a + exBaseline.b * c.s_nc));
      const rEx = r.exRate !== null ? (r.exRate - expEx) : null;

      const expBp = Math.max(0.002, Math.min(0.35, bpBaseline.a + bpBaseline.b * c.s_nc));
      const rBp = r.bpRate !== null ? (expBp - Math.min(0.40, r.bpRate)) : null;

      const infoW = calcInfoW(r, softTheta);

      let perfResid = rClear;
      if (rEx !== null && rBp !== null) {
        const exNorm = Math.max(-1, Math.min(1, rEx / 0.09));
        const bpNorm = Math.max(-1, Math.min(1, rBp / 0.045));
        perfResid = 0.60 * rClear + 0.25 * exNorm + 0.15 * bpNorm;
      } else if (rEx !== null) {
        const exNorm = Math.max(-1, Math.min(1, rEx / 0.09));
        perfResid = 0.72 * rClear + 0.28 * exNorm;
      }

      const lvSt = catalogStats.byLevel[c.lv];
      const zRadar = c.radar.map((val, d) => {
        if (!lvSt) return 0;
        return (val - lvSt.mean[d]) / lvSt.std[d];
      });

      return {
        ...r,
        pEc,
        pNc,
        pSoft,
        actualSoft,
        rClear,
        expEx,
        rEx,
        expBp,
        rBp,
        perfResid,
        infoW,
        zRadar,
        primaryBpm: parsePrimaryBpm(c.bpm),
      };
    });

    // Global baseline zero-centering
    let totW = 0, totR = 0;
    for (const r of enriched) { totW += r.infoW; totR += r.infoW * r.perfResid; }
    const globalOffset = totW > 0 ? totR / totW : 0;
    for (const r of enriched) r.perfResidCentered = r.perfResid - globalOffset;

    // 4. 8-Axis Relative Strength & Weakness Decomposition (High-Axis vs Complementary Baseline!)
    const rawAxes = [];
    for (let d = 0; d < 8; d++) {
      let thresh = 0.55;
      let subset = enriched.filter((r) => r.zRadar[d] >= thresh && r.chart.radar[d] >= 6);
      if (subset.length < 4) {
        thresh = 0.35;
        subset = enriched.filter((r) => r.zRadar[d] >= thresh && r.chart.radar[d] >= 5);
      }
      const subsetSet = new Set(subset);
      const comp = enriched.filter((r) => !subsetSet.has(r));

      let wSum = 0, resSum = 0, actNcSum = 0, expNcSum = 0;
      let exCnt = 0, rExSum = 0, exAbsSum = 0;
      let bpCnt = 0, rBpSum = 0, bpAbsSum = 0;

      for (const r of subset) {
        const zW = Math.min(2.4, Math.max(0.5, r.zRadar[d]));
        const w = r.infoW * zW;
        wSum += w;
        resSum += w * r.perfResidCentered;
        actNcSum += w * (r.lampRank >= 4 ? 1 : 0);
        expNcSum += w * r.pNc;
        if (r.rEx !== null) { exCnt++; rExSum += r.rEx; exAbsSum += r.exRate; }
        if (r.rBp !== null) { bpCnt++; rBpSum += r.rBp; bpAbsSum += r.bpRate; }
      }

      let compW = 0, compRes = 0;
      for (const r of comp) {
        compW += r.infoW;
        compRes += r.infoW * r.perfResidCentered;
      }

      const n = subset.length;
      const highMean = wSum > 0 ? resSum / wSum : 0;
      const compMean = compW > 0 ? compRes / compW : 0;
      const contrast = highMean - compMean;

      rawAxes.push({
        d,
        subset,
        n,
        wSum,
        contrast,
        actualNcPct: wSum > 0 ? (actNcSum / wSum) * 100 : null,
        expectedNcPct: wSum > 0 ? (expNcSum / wSum) * 100 : null,
        avgExPct: exCnt > 0 ? (exAbsSum / exCnt) * 100 : null,
        deltaExPct: exCnt > 0 ? (rExSum / exCnt) * 100 : null,
        avgBpPct: bpCnt > 0 ? (bpAbsSum / bpCnt) * 100 : null,
        deltaBpPct: bpCnt > 0 ? (rBpSum / bpCnt) * 100 : null,
      });
    }

    // Center across the 8 axes by their sample-weighted mean so relative strengths (+) and weaknesses (-) are balanced and crisp!
    let axW = 0, axC = 0;
    for (const a of rawAxes) {
      if (a.n >= 3) {
        const w = Math.min(40, a.n);
        axW += w;
        axC += w * a.contrast;
      }
    }
    const meanAxisContrast = axW > 0 ? axC / axW : 0;

    const axisAnalysis = rawAxes.map((a) => {
      const d = a.d;
      const relContrast = a.contrast - meanAxisContrast;
      const shrink = a.n / (a.n + 4.5);
      const strengthIndex = Math.round(Math.max(-100, Math.min(100, relContrast * shrink * 175)));
      const deltaNcPct = (a.actualNcPct !== null && a.expectedNcPct !== null) ? (a.actualNcPct - a.expectedNcPct) : null;

      const highlights = [...a.subset]
        .filter((r) => r.lampRank >= 3)
        .sort((x, y) => (y.perfResidCentered * Math.max(0.5, y.zRadar[d])) - (x.perfResidCentered * Math.max(0.5, x.zRadar[d])))
        .slice(0, 3);

      const struggles = [...a.subset]
        .filter((r) => r.lampRank <= 3)
        .sort((x, y) => (x.perfResidCentered * Math.max(0.5, x.zRadar[d])) - (y.perfResidCentered * Math.max(0.5, y.zRadar[d])))
        .slice(0, 3);

      let verdict = '均衡';
      if (a.n < 3) verdict = '样本较少';
      else if (strengthIndex >= 12) verdict = '明显擅长';
      else if (strengthIndex >= 4) verdict = '略占优势';
      else if (strengthIndex <= -12) verdict = '重点短板';
      else if (strengthIndex <= -4) verdict = '有提升空间';

      return {
        idx: d,
        label: radarCfg.labels[d],
        short: axisMeta[d].short,
        color: radarCfg.cols[d],
        tip: axisMeta[d].tip,
        optTip: axisMeta[d].optTip,
        n: a.n,
        confidence: a.n >= 12 ? '高' : (a.n >= 5 ? '中' : '低'),
        strengthIndex,
        radarPlotVal: Math.max(10, Math.min(100, Math.round(52 + strengthIndex * 0.48))),
        actualNcPct: a.actualNcPct,
        expectedNcPct: a.expectedNcPct,
        deltaNcPct,
        avgExPct: a.avgExPct,
        deltaExPct: a.deltaExPct,
        avgBpPct: a.avgBpPct,
        deltaBpPct: a.deltaBpPct,
        verdict,
        highlights,
        struggles,
      };
    });

    // 5. Pattern Tag, 地力 vs 個人差, BPM Band, Notes Stamina & Structural Analysis
    function summarizeBucket(label, items) {
      let wSum = 0, resSum = 0, actNc = 0, expNc = 0, exN = 0, exSum = 0, bpN = 0, bpSum = 0;
      for (const r of items) {
        wSum += r.infoW;
        resSum += r.infoW * r.perfResidCentered;
        actNc += r.infoW * (r.lampRank >= 4 ? 1 : 0);
        expNc += r.infoW * r.pNc;
        if (r.exRate !== null) { exN++; exSum += r.exRate; }
        if (r.bpRate !== null) { bpN++; bpSum += r.bpRate; }
      }
      const n = items.length;
      const shrink = n / (n + 4);
      const score = wSum > 0 ? Math.round(Math.max(-100, Math.min(100, (resSum / wSum) * shrink * 165))) : 0;
      const actualNcPct = wSum > 0 ? (actNc / wSum) * 100 : 0;
      const expectedNcPct = wSum > 0 ? (expNc / wSum) * 100 : 0;
      return {
        label,
        n,
        score,
        actualNcPct,
        expectedNcPct,
        deltaNcPct: actualNcPct - expectedNcPct,
        avgExPct: exN > 0 ? (exSum / exN) * 100 : null,
        avgBpPct: bpN > 0 ? (bpSum / bpN) * 100 : null,
      };
    }

    const coreVsKj = {
      core: summarizeBucket('地力谱面 (Core)', enriched.filter((r) => !r.chart.kj)),
      kojinsa: summarizeBucket('个人差谱面', enriched.filter((r) => r.chart.kj)),
    };

    const tagCandidates = mode === 'dp'
      ? ['片手発狂', '着地難', 'DB同時押し', '左右振り', '無理押し', '片手移動', '階段', '無理皿/隣接皿', '両皿', '連皿', '縦連', 'HCN', '片手CN', 'ソフラン', 'ラス殺し', '局所難']
      : ['高速乱打', '二重乱打', '階段', '同時押し', '縦連', '皿', 'CN/BSS', 'HCN', 'ソフラン', 'ラス殺し', '局所難'];

    const tagStats = tagCandidates
      .map((t) => summarizeBucket(t, enriched.filter((r) => r.chart.tags.includes(t))))
      .filter((x) => x.n >= 2)
      .sort((a, b) => a.score - b.score);

    const bpmBands = [
      { label: '低速 (<140)', fn: (r) => r.primaryBpm < 140 },
      { label: '中速 (140–164)', fn: (r) => r.primaryBpm >= 140 && r.primaryBpm < 165 },
      { label: '中高速 (165–189)', fn: (r) => r.primaryBpm >= 165 && r.primaryBpm < 190 },
      { label: '超高速 (190+)', fn: (r) => r.primaryBpm >= 190 },
    ].map((b) => summarizeBucket(b.label, enriched.filter(b.fn))).filter((x) => x.n >= 2);

    const staminaBands = [
      { label: '轻物量 (<650N)', fn: (r) => r.chart.notes < 650 },
      { label: '标准物量 (650–999N)', fn: (r) => r.chart.notes >= 650 && r.chart.notes < 1000 },
      { label: '高物量 (1000–1399N)', fn: (r) => r.chart.notes >= 1000 && r.chart.notes < 1400 },
      { label: '超高耐力 (1400N+)', fn: (r) => r.chart.notes >= 1400 },
    ].map((b) => summarizeBucket(b.label, enriched.filter(b.fn))).filter((x) => x.n >= 2);

    const lastKillStat = summarizeBucket('尾杀强化 (尾段比 ≥1.30x)', enriched.filter((r) => r.chart.lastKill >= 1.30));
    const midSpikeStat = summarizeBucket('局所爆发 (峰值比 ≥1.75x)', enriched.filter((r) => r.chart.spike >= 1.75));

    const scoredRecs = enriched.filter((r) => r.exRate !== null);
    const activeScored = scoredRecs.filter((r) => focusLevels.includes(r.chart.lv));
    const refScored = activeScored.length >= 5 ? activeScored : scoredRecs;
    const avgExPct = refScored.length ? (refScored.reduce((a, r) => a + r.exRate, 0) / refScored.length) * 100 : null;
    const pgRecs = refScored.filter((r) => r.pgRatio !== null);
    const avgPgRatio = pgRecs.length ? (pgRecs.reduce((a, r) => a + r.pgRatio, 0) / pgRecs.length) * 100 : null;
    const bpRecs = enriched.filter((r) => r.bpRate !== null && focusLevels.includes(r.chart.lv));
    const avgFocusBp = bpRecs.length ? bpRecs.reduce((a, r) => a + r.bp, 0) / bpRecs.length : null;
    const djCounts = { AAA: 0, AA: 0, A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    for (const r of scoredRecs) {
      if (r.dj && djCounts[r.dj] !== undefined) djCounts[r.dj]++;
    }
    const latestPlayDate = played
      .map((r) => r.lastPlayed)
      .filter(Boolean)
      .sort()
      .pop() || '—';

    const reliableAxes = axisAnalysis.filter((a) => a.n >= 3);
    const sortedBest = [...reliableAxes].sort((a, b) => b.strengthIndex - a.strengthIndex);
    const sortedWeak = [...reliableAxes].sort((a, b) => a.strengthIndex - b.strengthIndex);
    const topStrengths = sortedBest.filter((a) => a.strengthIndex >= 4).slice(0, 3);
    const topWeaknesses = sortedWeak.filter((a) => a.strengthIndex <= -4).slice(0, 3);
    const coachWeakAxes = topWeaknesses.length >= 2 ? topWeaknesses : sortedWeak.slice(0, 3);

    const topOverperform = [...enriched]
      .filter((r) => r.lampRank >= 4 && r.infoW >= 0.4)
      .sort((a, b) => b.perfResidCentered - a.perfResidCentered)
      .slice(0, 10);

    const topUnderperform = [...enriched]
      .filter((r) => r.lampRank <= 3 && r.infoW >= 0.4)
      .sort((a, b) => a.perfResidCentered - b.perfResidCentered)
      .slice(0, 10);

    const targetGauge = opts.targetGauge || 'nc';
    const targetLevel = opts.targetLevel || 0;
    const recs = buildRecommendations({
      mode,
      targetGauge,
      targetLevel,
      enriched,
      recordMap: matchResult.recordMap,
      catalogCharts,
      catalogStats,
      irt,
      ncTheta,
      ecTheta,
      hcTheta,
      tau: tauByMode,
      primaryLevel,
      coachWeakAxes,
    });

    const summaryLines = [];
    if (irt.nc?.eq) {
      summaryLines.push(
        `当前 ${mode.toUpperCase()} 蓝灯(NC) 推定能力值 CP ${irt.nc.theta.toFixed(1)}（约 ${irt.nc.eq.label}），主攻区间集中在 ★${Math.max(1, primaryLevel - 1)}–★${Math.min(12, primaryLevel + 1)}。`
      );
    }
    if (topStrengths.length > 0) {
      summaryLines.push(
        `相对优势项：${topStrengths.slice(0, 2).map((a) => `${a.short}(+${a.strengthIndex})`).join('、')}，同定数下的清灯率与得分均优于个人均值。`
      );
    }
    if (topWeaknesses.length > 0) {
      summaryLines.push(
        `核心提分短板：${topWeaknesses.slice(0, 2).map((a) => `${a.short}(${a.strengthIndex})`).join('、')}，建议优先刷下方专项三阶梯歌单针对补强。`
      );
    } else {
      summaryLines.push('八维配置发展均衡，没有明显偏科短板，建议直接通过地力主线梯队稳步抬升密度上限！');
    }
    if (coreVsKj.kojinsa.n >= 10 && coreVsKj.core.score - coreVsKj.kojinsa.score >= 12) {
      summaryLines.push(`配置倾向：地力谱表现明显稳于个人差谱（地力 ${coreVsKj.core.score > 0 ? '+' : ''}${coreVsKj.core.score} vs 个人差 ${coreVsKj.kojinsa.score}），补齐个人差短板后综合段位与清灯数将快速跳升。`);
    } else if (coreVsKj.kojinsa.n >= 10 && coreVsKj.kojinsa.score - coreVsKj.core.score >= 12) {
      summaryLines.push(`配置倾向：个人差谱面适应力很强（个人差 +${coreVsKj.kojinsa.score}），当前突破下一级的关键在于多刷常规高密地力乱打谱抬升基础物量上限。`);
    }
    if (lastKillStat.n >= 5 && lastKillStat.score <= -10) {
      summaryLines.push('结构诊断：尾杀谱（ラス殺し）失分明显，后段体力/控血偏紧，建议多打 1,000N+ 持续物量谱稳住后半段手速。');
    }
    if (avgExPct !== null && avgPgRatio !== null) {
      if (avgExPct >= 73) {
        summaryLines.push(`判定精度优秀（主攻区均分 ${avgExPct.toFixed(1)}%，PG 率 ${avgPgRatio.toFixed(1)}%），具备直接越级推更高清灯的底子！`);
      } else if (avgExPct < 63) {
        summaryLines.push(`主攻区均分偏紧（${avgExPct.toFixed(1)}%），建议适度回打低 1 级谱面稳固绿字/准度与 BP 控血，再冲高灯效率更高。`);
      }
    }

    return {
      mode,
      filename: matchResult.filename,
      totalCsvSongs: matchResult.totalCsvSongs,
      matchedSongs: matchResult.matchedSongs,
      unmatchedSongs: matchResult.unmatchedSongs,
      totalCsvPlayedCharts: matchResult.totalCsvPlayedCharts,
      missingTextageDiffs: matchResult.missingTextageDiffs,
      playedCount: played.length,
      scoredCount: scoredRecs.length,
      carryoverCount: played.filter((r) => r.isCarryover).length,
      latestPlayDate,
      levelSummary,
      irt,
      primaryLevel,
      focusLevels,
      avgExPct,
      avgPgRatio,
      avgFocusBp,
      djCounts,
      axisAnalysis,
      topStrengths,
      topWeaknesses,
      coachWeakAxes,
      coreVsKj,
      tagStats,
      bpmBands,
      staminaBands,
      lastKillStat,
      midSpikeStat,
      topOverperform,
      topUnderperform,
      recommendations: recs,
      summaryLines,
      enriched,
      recordMap: matchResult.recordMap,
    };
  }

  function buildRecommendations(ctx) {
    const {
      targetGauge, targetLevel, enriched, recordMap, catalogCharts,
      catalogStats, irt, ncTheta, ecTheta, hcTheta, tau, primaryLevel, coachWeakAxes,
    } = ctx;

    const minRankByGauge = { ec: 3, nc: 4, hc: 5, exhc: 6 };
    const minRank = minRankByGauge[targetGauge] || 4;
    const sKey = 's_' + targetGauge;

    let anchorTheta = ncTheta;
    if (targetGauge === 'ec') anchorTheta = ecTheta;
    else if (targetGauge === 'hc') anchorTheta = (irt.hc?.reliable && irt.hc.theta !== null) ? irt.hc.theta : (ncTheta - 1.5);
    else if (targetGauge === 'exhc') anchorTheta = (irt.exhc?.reliable && irt.exhc.theta !== null) ? irt.exhc.theta : (hcTheta - 2.5);

    if (targetLevel > 0) {
      const gs = catalogStats.byLevel[targetLevel]?.gaugeStats[targetGauge];
      if (gs && gs.p50 > 0) {
        anchorTheta = gs.p50;
      }
    }

    const levelFilter = (c) => {
      if (targetLevel > 0) return c.lv === targetLevel;
      return c.lv >= Math.max(1, primaryLevel - 1) && c.lv <= Math.min(12, primaryLevel + 1);
    };

    const quickWins = enriched
      .filter((r) => r.lampRank < minRank && r.chart.ac && levelFilter(r.chart))
      .map((r) => {
        const c = r.chart;
        const pTarget = sigmoid((anchorTheta - c[sKey]) / tau);
        const bpBonus = (r.bpRate !== null && r.bpRate <= 0.08) ? (0.08 - r.bpRate) * 3.0 : 0;
        const exBonus = (r.exRate !== null && r.exRate >= 0.68) ? (r.exRate - 0.68) * 1.6 : 0;
        const lampStepBonus = (r.lampRank === minRank - 1) ? 0.16 : (r.lampRank === minRank - 2 ? 0.06 : 0);
        const priority = pTarget + bpBonus + exBonus + lampStepBonus;

        const reasons = [];
        const cpDiff = c[sKey] - anchorTheta;
        if (cpDiff <= -1.0) reasons.push(`低于当前能力线 ${Math.abs(cpDiff).toFixed(1)} CP`);
        else if (cpDiff <= 1.2) reasons.push('紧贴当前能力线');
        if (r.lampRank === minRank - 1) reasons.push(`已亮 ${r.lampMeta.short}，仅差一档`);
        if (r.bp !== null && r.bpRate !== null && r.bpRate <= 0.075) reasons.push(`历史仅 ${r.bp} BP`);
        if (r.exRate !== null && r.exRate >= 0.70) reasons.push(`均分达 ${(r.exRate * 100).toFixed(1)}%`);
        if (reasons.length === 0) reasons.push(`模型推灯胜率 ${(pTarget * 100).toFixed(0)}%`);

        return {
          chart: c,
          rec: r,
          pTarget,
          priority,
          reason: reasons.slice(0, 2).join(' · '),
        };
      })
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 12);

    const acCharts = catalogCharts.filter((c) => c.ac);
    const minStageLv = targetLevel > 0 ? Math.max(1, targetLevel - 1) : Math.max(1, primaryLevel - 2);
    const maxStageLv = targetLevel > 0 ? Math.min(12, targetLevel + 1) : Math.min(12, primaryLevel + 1);

    const weaknessLadders = coachWeakAxes.slice(0, 3).map((ax) => {
      const d = ax.idx;
      const stages = [
        { key: 'base',    title: '① 夯实手感 (舒适区)',   lo: anchorTheta - 6.5, hi: anchorTheta - 1.2 },
        { key: 'main',    title: '② 主力攻坚 (能力线)',   lo: anchorTheta - 1.2, hi: anchorTheta + 2.4 },
        { key: 'stretch', title: '③ 突破检验 (上位挑战)', lo: anchorTheta + 2.4, hi: anchorTheta + 6.5 },
      ];

      const usedSongs = new Set();
      const stageData = stages.map((st) => {
        const mid = (st.lo + st.hi) / 2;
        const cands = [];
        for (const c of acCharts) {
          if (c.lv < minStageLv || c.lv > maxStageLv) continue;
          const sv = c[sKey];
          if (sv < st.lo || sv > st.hi) continue;
          const lvSt = catalogStats.byLevel[c.lv];
          if (!lvSt) continue;
          const z = (c.radar[d] - lvSt.mean[d]) / lvSt.std[d];
          if (z < 0.72 || c.radar[d] < 10) continue;

          const existing = recordMap.get(c.id);
          if (existing && existing.lampRank >= minRank) continue;
          const unplayedBonus = !existing ? 0.35 : 0.52;
          const diffPref = (primaryLevel >= 8 && (c.dChar === 'B' || c.dChar === 'N') && c.lv < primaryLevel) ? -0.35 : 0.1;
          const centerScore = 1 - Math.abs(sv - mid) / Math.max(2, (st.hi - st.lo) / 2);
          const sc = z * 1.15 + centerScore * 0.9 + unplayedBonus + diffPref;
          cands.push({ chart: c, z, score: sc, existing });
        }
        cands.sort((a, b) => b.score - a.score);
        const picks = [];
        for (const item of cands) {
          if (usedSongs.has(item.chart.title)) continue;
          usedSongs.add(item.chart.title);
          picks.push(item);
          if (picks.length >= 4) break;
        }
        return { ...st, picks };
      });

      return { axis: ax, stages: stageData };
    });

    const coreCands = [];
    const seenCoreTitles = new Set();
    for (const c of acCharts) {
      if (c.kj) continue;
      if (targetLevel > 0 && c.lv !== targetLevel) continue;
      if (targetLevel === 0 && (c.lv < Math.max(1, primaryLevel - 1) || c.lv > Math.min(12, primaryLevel + 1))) continue;
      const sv = c[sKey];
      if (sv < anchorTheta - 3.0 || sv > anchorTheta + 5.5) continue;
      const existing = recordMap.get(c.id);
      if (existing && existing.lampRank >= minRank) continue;
      const dist = Math.abs(sv - (anchorTheta + 1.0));
      const pTarget = sigmoid((anchorTheta - sv) / tau);
      coreCands.push({
        chart: c,
        existing,
        pTarget,
        cpVal: sv,
        dist,
      });
    }
    coreCands.sort((a, b) => a.dist - b.dist);
    const coreLadder = [];
    for (const item of coreCands) {
      if (seenCoreTitles.has(item.chart.title)) continue;
      seenCoreTitles.add(item.chart.title);
      coreLadder.push(item);
      if (coreLadder.length >= 16) break;
    }
    coreLadder.sort((a, b) => a.cpVal - b.cpVal);

    return {
      targetGauge,
      targetLevel,
      anchorTheta: Math.round(anchorTheta * 10) / 10,
      quickWins,
      weaknessLadders,
      coreLadder,
    };
  }

  const api = {
    DIFF_COLS,
    LAMP_META,
    AXIS_COACH,
    decodeCsvBuffer,
    parseCsvRows,
    parseKonamiCsv,
    matchCsvToCatalog,
    detectBestMode,
    analyzePlayerPerformance,
    buildRecommendations,
    normExact,
    normCompact,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.IIDXCsvAnalyzer = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
