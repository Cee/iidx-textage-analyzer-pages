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
    'NO PLAY':         { rank: 0, key: 'np',   short: 'NP',   label: 'NO PLAY',       color: '#64748b', bg: 'rgba(100,116,139,0.16)', clearVal: null },
    'FAILED':          { rank: 1, key: 'f',    short: 'F',    label: 'FAILED',        color: '#ef4444', bg: 'rgba(239,68,68,0.18)',   clearVal: 0.0 },
    'ASSIST CLEAR':    { rank: 2, key: 'ac',   short: 'AC',   label: 'ASSIST CLEAR',  color: '#c084fc', bg: 'rgba(192,132,252,0.18)', clearVal: 0.30 },
    'EASY CLEAR':      { rank: 3, key: 'ec',   short: 'EC',   label: 'EASY CLEAR',    color: '#4ade80', bg: 'rgba(74,222,128,0.18)',  clearVal: 0.62 },
    'CLEAR':           { rank: 4, key: 'nc',   short: 'NC',   label: 'CLEAR',         color: '#38bdf8', bg: 'rgba(56,189,248,0.18)',  clearVal: 1.0 },
    'HARD CLEAR':      { rank: 5, key: 'hc',   short: 'HC',   label: 'HARD CLEAR',    color: '#f8fafc', bg: 'rgba(248,250,252,0.16)', clearVal: 1.15 },
    'EX HARD CLEAR':   { rank: 6, key: 'exhc', short: 'EXHC', label: 'EX HARD CLEAR', color: '#facc15', bg: 'rgba(239,68,68,0.16)',   clearVal: 1.25 },
    'FULLCOMBO CLEAR': { rank: 7, key: 'fc',   short: 'FC',   label: 'FULLCOMBO',     color: '#38bdf8', bg: 'rgba(56,189,248,0.16)',  clearVal: 1.32 },
  };

  const AXIS_COACH = {
    sp: [
      {
        name: '乱打/高速',
        short: '乱打/高速',
        tip: '优先用 RANDOM 打中高速 16 分乱打与二重乱打，保持手腕放松与小振幅击键；关注绿字视野（建议 270–310），避免高 BPM 下提前发力导致整体推快。',
        optTip: '优先 RANDOM（拆固定指法，建立通用读谱）',
      },
      {
        name: '階段/指独立',
        short: '阶段/指独立',
        tip: '交替使用 正規 / MIRROR / R-RANDOM 均衡左右手，针对弱侧无名指与小指做刻意独立击键；遇到连续 16 分折返阶段时先控低速准确度再提速。',
        optTip: '正規 / MIRROR 交替 + R-RANDOM',
      },
      {
        name: '物量/体力',
        short: '物量/体力',
        tip: '刻意练习 1,000+ Notes 持续密集段，减少无谓拍键力度（降噪轻打），中段学会借低密小节快速松肩换气，确保尾段手速不衰减。',
        optTip: 'RANDOM 均分双手指压',
      },
      {
        name: '認識/ズレ',
        short: '认识/错拍',
        tip: '针对非整数分音、错位双押与高熵配置，重点用“听音乐节拍 + 块状横认识”代替逐个看键；可适度把 SUDDEN+ / LIFT 调稳，避免视线追尾。',
        optTip: '正規 / MIRROR 或 RANDOM 强化横认识',
      },
      {
        name: '縦連/軸',
        short: '纵连/轴谱',
        tip: '单键轴与微纵连重在手腕弹性而非纯手指硬敲；练习时可先用 RANDOM 把固定轴打散培养对高速单键的节拍感，再回正規/MIRROR 攻坚固定轴。',
        optTip: '拆轴开 RANDOM；固定练习用 正規/MIRROR',
      },
      {
        name: '皿/皿複合',
        short: '皿/皿复合',
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
        short: '变速(ソフラン)',
        tip: '提前在 Textage 记好 BPM 变速小节与高低速比例，熟练使用空白处 皿チョン (FHS) 或针对主力段定绿字，低速段配合 LIFT/白字切视野避免键位糊成一团。',
        optTip: '正規/MIRROR（方便背板变速点）',
      },
    ],
    dp: [
      {
        name: '片手力/复用',
        short: '片手/复用',
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
        short: '认识/左右振',
        tip: '强化 14 键整体横认识（把视线锚定在 P1/P2 中缝而非左右来回扫视），遇到大幅左右振り时借助对称镜像（1M/2M）把平行配置转为对称配置。',
        optTip: '1M / 2M / M/M（平行转对称极有效）',
      },
      {
        name: '無理押し/移動',
        short: '无理押/移动',
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
        short: '着地/双皿',
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
        short: '变速(ソフラン)',
        tip: 'DP 下 BPM 变速更考验记忆与单手调速能力，提前确认空白小节位置使用皿チョン，或根据主要发狂段 BPM 设定主绿字。',
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

  const HTML_ENTITY_MAP = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ecirc: 'ê', eacute: 'é', egrave: 'è', euml: 'ë',
    aacute: 'á', agrave: 'à', acirc: 'â', auml: 'ä', aring: 'å',
    oacute: 'ó', ograve: 'ò', ocirc: 'ô', ouml: 'ö', oslash: 'ø',
    uacute: 'ú', ugrave: 'ù', ucirc: 'û', uuml: 'ü',
    iacute: 'í', igrave: 'ì', icirc: 'î', iuml: 'ï',
    ntilde: 'ñ', ccedil: 'ç',
  };

  function decodeHtmlEntities(s) {
    return String(s || '').replace(/&([a-z]+|#\d+|#x[0-9a-f]+);/gi, (m, code) => {
      const lc = code.toLowerCase();
      if (HTML_ENTITY_MAP[lc]) return HTML_ENTITY_MAP[lc];
      if (lc.startsWith('#x')) return String.fromCodePoint(parseInt(lc.slice(2), 16) || 32);
      if (lc.startsWith('#')) return String.fromCodePoint(parseInt(lc.slice(1), 10) || 32);
      return m;
    });
  }

  function normExact(s) {
    return decodeHtmlEntities(s)
      .normalize('NFKC')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normCompact(s) {
    return decodeHtmlEntities(s)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .normalize('NFKC')
      .toLowerCase()
      // Strip quotes, whitespace, musical/heart/onsen symbols, dashes, tilde, bullets often differing between CSV & Textage
      .replace(/[\s"'`´’‘“”„＂＇〜～~\-‐‑‒–—―·・•♡♥❤❥♨♫♪♩♬★☆†‡!！?？.,。、:：;；()（）\[\]【】<>《》/\\]/g, '')
      .trim();
  }

  function normBaseTitle(s) {
    const raw = decodeHtmlEntities(s).normalize('NFKC').trim();
    const stripped = raw
      .replace(/[～〜~].*?[～〜~]/g, '')
      .replace(/\s+-[^-]+-\s*$/g, '')
      .replace(/\s*\([^)]+\)\s*$/g, '')
      .trim();
    return normCompact(stripped || raw);
  }

  const NUMERIC_VER_MAP = {
    '0': '1st_sub', '1': '2nd style', '2': '2nd style', '3': '3rd style',
    '4': '4th style', '5': '5th style', '6': '6th style', '7': '7th style',
    '8': '8th style', '9': '9th style', '10': '10th style',
    '11': 'iidx red', '12': 'happy sky', '13': 'distorted', '14': 'gold',
    '15': 'dj troopers', '16': 'empress', '17': 'sirius', '18': 'resort anthem',
    '19': 'lincle', '20': 'tricoro', '21': 'spada', '22': 'pendual',
    '23': 'copula', '24': 'sinobuz', '25': 'cannon ballers', '26': 'rootage',
    '27': 'heroic verse', '28': 'bistrover', '29': 'casthour', '30': 'resident',
    '31': 'epolis', '32': 'pinky crush', '33': 'sparkle shower', '34': 'zinrai',
  };

  const VER_CODE_BY_KEY = (() => {
    const m = { '1st_sub': '1st' };
    for (const [num, name] of Object.entries(NUMERIC_VER_MAP)) {
      if (num === '0' || num === '1') continue;
      m[name] = num;
    }
    return m;
  })();

  function normVerName(v) {
    const s = String(v || '').trim().toLowerCase();
    if (NUMERIC_VER_MAP[s]) return NUMERIC_VER_MAP[s];
    if (s === '1st&substream' || s === '1st style' || s === 'substream') return '1st_sub';
    return s.replace(/\s+/g, ' ');
  }

  function inferVerCodeFromName(v) {
    const k = normVerName(v);
    return VER_CODE_BY_KEY[k] || String(v || '').trim();
  }

  function normHomoglyph(s) {
    return normCompact(s).replace(/0/g, 'o').replace(/1/g, 'l');
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
          verCode: c.verCode || inferVerCodeFromName(c.ver),
          verKey: normVerName(c.ver),
          title: c.title,
          artist: c.artist,
          exactTitle: normExact(c.title),
          compactTitle: normCompact(c.title),
          homoglyphTitle: normHomoglyph(c.title),
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
    const unmatchedRecordMap = new Map(); // synthetic key -> playerRecord without catalog chart
    const playedRecords = [];
    const unmatchedRecords = [];
    const unmatchedSongs = [];
    let matchedSongs = 0;
    let totalCsvPlayedCharts = 0;
    let missingTextageDiffs = 0;
    let levelExactMatches = 0;
    let levelComparisons = 0;
    const modePref = mode === 'sp' ? 'SP' : 'DP';

    const pushUnmatchedRecord = (row, d, dr, matchedSong, reason) => {
      const isSyntheticPgGr = dr.hasScore
        && dr.score > 0
        && dr.pg === Math.floor(dr.score / 2)
        && dr.gr === (dr.score % 2);
      const pgRatio = (dr.hasScore && !isSyntheticPgGr && (dr.pg + dr.gr) > 0)
        ? dr.pg / (dr.pg + dr.gr)
        : null;
      const verStr = matchedSong ? matchedSong.ver : row.version;
      const verCode = (matchedSong && matchedSong.verCode) ? matchedSong.verCode : inferVerCodeFromName(row.version);
      const stubChart = {
        id: null,
        mode,
        tag: matchedSong ? matchedSong.tag : null,
        ver: verStr,
        verCode,
        title: row.title,
        artist: row.artist || (matchedSong ? matchedSong.artist : ''),
        diff: modePref + d.key,
        dChar: d.key,
        lv: dr.lv || 0,
        ac: true,
        notes: null,
        bestOpt: '',
        s_ec: null,
        s_nc: null,
        s_hc: null,
        s_exhc: null,
        noCatalogChart: true,
      };
      const rec = {
        chartId: null,
        chart: stubChart,
        hasChart: false,
        unmatchedReason: reason,
        mode,
        csvLevel: dr.lv || 0,
        lamp: dr.lamp,
        lampRank: dr.lampRank,
        lampMeta: LAMP_META[dr.lamp],
        score: dr.score,
        hasScore: dr.hasScore,
        isCarryover: !dr.hasScore && !dr.hasBp,
        isSyntheticPgGr,
        pg: dr.pg,
        gr: dr.gr,
        bp: dr.bp,
        hasBp: dr.hasBp,
        dj: dr.dj,
        exRate: null,
        bpRate: null,
        pgRatio,
        playCount: row.playCount,
        lastPlayed: row.lastPlayed,
      };
      const uKey = `${normVerName(row.version)}|${normCompact(row.title)}|${d.key}`;
      const existing = unmatchedRecordMap.get(uKey);
      if (!existing || rec.lampRank > existing.lampRank || (rec.lampRank === existing.lampRank && rec.score > existing.score)) {
        unmatchedRecordMap.set(uKey, rec);
      }
    };

    for (const row of parsedCsv.songs) {
      const exactKey = normExact(row.title);
      const compactKey = normCompact(row.title);
      const homoglyphKey = normHomoglyph(row.title);
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
        // Tier 4: Same version + artist + difficulty level fingerprint (catches kanji/Unicode homoglyphs like 火影/焱影, uən/uәn, 0/O)
        const artistCands = index.byVerArtist.get(artistKey) || [];
        const singleMatches = [];
        for (const cand of artistCands) {
          const res = scoreSongCandidate(row, cand, 0);
          if (res.lvTotal >= 2 && res.lvMatches >= Math.max(2, res.lvTotal - 1)) {
            candScores.set(cand.songKey, { cand, ...res });
          } else if (res.lvTotal === 1 && res.lvMatches === 1) {
            singleMatches.push({ cand, ...res });
          }
        }
        if (candScores.size === 0 && singleMatches.length === 1) {
          candScores.set(singleMatches[0].cand.songKey, singleMatches[0]);
        } else if (candScores.size === 0 && singleMatches.length > 1 && homoglyphKey) {
          const homoHits = singleMatches.filter((m) => m.cand.homoglyphTitle === homoglyphKey);
          if (homoHits.length === 1) {
            candScores.set(homoHits[0].cand.songKey, homoHits[0]);
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
          const dr = row.diffs[d.key];
          if (dr && dr.lampRank > 0) {
            totalCsvPlayedCharts++;
            pushUnmatchedRecord(row, d, dr, null, 'song_missing');
          }
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
          if (dr.lampRank > 0) {
            missingTextageDiffs++;
            pushUnmatchedRecord(row, d, dr, song, 'diff_missing');
          }
          continue;
        }

        if (dr.lv > 0) {
          levelComparisons++;
          if (chart.lv === dr.lv) levelExactMatches++;
        }

        if (dr.lampRank === 0) continue; // NO PLAY

        const exRate = dr.hasScore && chart.notes > 0 ? Math.min(1, dr.score / (2 * chart.notes)) : null;
        const bpRate = dr.hasBp && chart.notes > 0 ? dr.bp / chart.notes : null;
        // Detect tracker/private-server placeholder exports where PGreat=floor(EX/2) and Great=EX%2 (0 or 1)
        const isSyntheticPgGr = dr.hasScore
          && dr.score > 0
          && dr.pg === Math.floor(dr.score / 2)
          && dr.gr === (dr.score % 2)
          && (exRate === null || exRate < 0.96);
        const pgRatio = (dr.hasScore && !isSyntheticPgGr && (dr.pg + dr.gr) > 0)
          ? dr.pg / (dr.pg + dr.gr)
          : null;

        const rec = {
          chartId: chart.id,
          chart,
          hasChart: true,
          mode,
          csvLevel: dr.lv || chart.lv,
          lamp: dr.lamp,
          lampRank: dr.lampRank,
          lampMeta: LAMP_META[dr.lamp],
          score: dr.score,
          hasScore: dr.hasScore,
          isCarryover: !dr.hasScore && !dr.hasBp,
          isSyntheticPgGr,
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
    for (const rec of unmatchedRecordMap.values()) unmatchedRecords.push(rec);
    const allPlayedRecords = [...playedRecords, ...unmatchedRecords];

    return {
      mode,
      filename: parsedCsv.filename,
      totalCsvSongs: parsedCsv.rowCount,
      matchedSongs,
      unmatchedSongs,
      totalCsvPlayedCharts,
      missingTextageDiffs,
      playedCount: playedRecords.length,
      unmatchedChartCount: unmatchedRecords.length,
      totalPlayedCount: allPlayedRecords.length,
      levelExactRate: levelComparisons > 0 ? levelExactMatches / levelComparisons : 0,
      recordMap,
      playedRecords,
      unmatchedRecords,
      allPlayedRecords,
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
   * 1D Slip-Aware 4PL Regularized Logistic MLE (IRT Clear-Power solver)
   * Fits P(y=1 | s) = guess + (1 - guess - gamma) * sigmoid((theta - s) / tau)
   * where gamma > 0 neutralizes false downward pull from un-retried / ASSIST / casual low-tier misses.
   */
  function fitIrtTheta(samples, tau = 3.2, opts = {}) {
    if (!samples || samples.length === 0) return null;
    const pos = samples.filter((p) => p.y >= 0.5);
    const neg = samples.filter((p) => p.y < 0.5);
    if (pos.length === 0) return { theta: null, pos: 0, neg: neg.length, reliable: false, maxPos: null, sTop: null };

    const posS = pos.map((p) => p.s).sort((a, b) => a - b);
    const maxPos = posS[posS.length - 1];
    const topK = Math.min(20, Math.max(3, Math.round(posS.length * 0.12)));
    const topSlice = posS.slice(Math.max(0, posS.length - topK));
    const sTop = topSlice[Math.floor(topSlice.length * 0.5)];

    const allS = samples.map((p) => p.s).sort((a, b) => a - b);
    const lo = Math.max(0, allS[0] - 6);
    const hiDefault = Math.max(maxPos + 2.5, allS[allS.length - 1] + 5);
    const hi = opts.ceilingCap !== undefined ? Math.min(opts.ceilingCap, hiDefault) : Math.min(maxPos + 6.0, hiDefault);

    const gamma = Math.max(0, Math.min(0.40, opts.gamma ?? 0.03));
    const guess = Math.max(0, Math.min(0.05, opts.guess ?? 0.003));
    const priorMu = opts.priorMu !== undefined ? opts.priorMu : (sTop - 1.5);
    const priorVar = opts.priorVar !== undefined ? opts.priorVar : (30 * 30);

    const evalLL = (t) => {
      let ll = -0.5 * ((t - priorMu) ** 2) / priorVar;
      for (const pt of samples) {
        const q = sigmoid((t - pt.s) / tau);
        const p = Math.min(1 - 1e-7, Math.max(1e-7, guess + (1 - guess - gamma) * q));
        ll += pt.w * (pt.y * Math.log(p) + (1 - pt.y) * Math.log(1 - p));
      }
      return ll;
    };

    let bestTheta = Math.max(lo, Math.min(hi, priorMu));
    let bestLL = -Infinity;
    for (let t = lo; t <= hi; t += 0.25) {
      const ll = evalLL(t);
      if (ll > bestLL) {
        bestLL = ll;
        bestTheta = t;
      }
    }
    let fineTheta = bestTheta;
    let fineLL = bestLL;
    for (let t = Math.max(lo, bestTheta - 0.30); t <= Math.min(hi, bestTheta + 0.30); t += 0.02) {
      const ll = evalLL(t);
      if (ll > fineLL) {
        fineLL = ll;
        fineTheta = t;
      }
    }

    return {
      theta: Math.round(fineTheta * 10) / 10,
      pos: pos.length,
      neg: neg.length,
      maxPos: Math.round(maxPos * 10) / 10,
      sTop: Math.round(sTop * 10) / 10,
      gamma: Math.round(gamma * 100) / 100,
      reliable: pos.length >= 3 && neg.length >= 2,
    };
  }

  /**
   * Robust Per-Gauge IRT Estimator:
   * Handles (1) un-retried low-tier F/E charts when clearing S/A+ ("有白灯S却没有白灯F"),
   * (2) inverted lower-level casual/ASSIST/unattempted HC/EXHC records (e.g. ★12 94% HC with ★1-10 AC/FAILED),
   * and (3) selection-bias censoring when a player rarely turns on HC or EXHC.
   */
  function fitRobustGaugeIrt(played, gauge, minRank, tau, carryoverBaseW, isOptionalGauge) {
    const sKey = 's_' + gauge;
    const lvCount = new Array(13).fill(0);
    const lvPos = new Array(13).fill(0);
    for (const r of played) {
      lvCount[r.chart.lv]++;
      if (r.lampRank >= minRank) lvPos[r.chart.lv]++;
    }
    const lvRate = lvCount.map((n, lv) => (n > 0 ? lvPos[lv] / n : 0));
    const maxHigherRate = new Array(13).fill(0);
    for (let lv = 1; lv <= 12; lv++) {
      let mx = 0;
      for (let hi = lv + 1; hi <= 12; hi++) {
        if (lvCount[hi] >= 10 && lvPos[hi] >= 5 && lvRate[hi] > mx) mx = lvRate[hi];
      }
      maxHigherRate[lv] = mx;
    }

    const posRecs = played.filter((r) => r.lampRank >= minRank);
    if (posRecs.length === 0) {
      return {
        theta: null, pos: 0, neg: played.length, reliable: false, maxPos: null, sTop: null,
        slipFiltered: 0, sparseOptional: false, note: '', lvRate, maxHigherRate,
      };
    }

    const posS = posRecs.map((r) => r.chart[sKey]).sort((a, b) => a - b);
    const maxPos = posS[posS.length - 1];
    const topK = Math.min(20, Math.max(3, Math.round(posS.length * 0.12)));
    const topSlice = posS.slice(Math.max(0, posS.length - topK));
    const sTop = topSlice[Math.floor(topSlice.length * 0.5)];
    const p50Pos = posS[Math.floor(posS.length * 0.50)];
    const p25Pos = posS[Math.floor(posS.length * 0.25)];

    let activeTopLv = 12;
    for (let lv = 12; lv >= 1; lv--) {
      if (lvCount[lv] >= 10 && (lvPos[lv] >= 3 || lvRate[lv] >= 0.15)) {
        activeTopLv = lv;
        break;
      }
    }
    const activeNc = played.filter((r) => r.chart.lv >= Math.max(1, activeTopLv - 1) && r.lampRank >= 4).length;
    const activePos = played.filter((r) => r.chart.lv >= Math.max(1, activeTopLv - 1) && r.lampRank >= minRank).length;
    const ncPosCount = played.filter((r) => r.lampRank >= 4).length;
    const localAttemptRatio = activeNc > 0 ? activePos / activeNc : (ncPosCount > 0 ? posRecs.length / ncPosCount : 0);

    const sparseOptional = isOptionalGauge && (gauge === 'hc'
      ? (localAttemptRatio < 0.35 && activePos < 40)
      : (localAttemptRatio < 0.25));
    const selBiasW = sparseOptional ? Math.max(0.22, Math.min(0.85, localAttemptRatio * 1.65)) : 1.0;

    let slipFiltered = 0;
    let negNearOrAbove = 0;
    const samples = [];
    for (const r of played) {
      const s = r.chart[sKey];
      const isPos = r.lampRank >= minRank;
      let w = carryoverBaseW(r);
      if (!isPos) {
        if (sparseOptional) {
          if (r.lampRank >= 4 && s < p50Pos) {
            slipFiltered++;
            continue;
          }
          if (r.lampRank <= 2) w *= selBiasW;
          else if (r.lampRank === 3) w *= selBiasW * 0.70;
          else w *= selBiasW * 0.62;
        } else if (isOptionalGauge && r.lampRank >= 4 && s < p25Pos) {
          w *= 0.06;
          slipFiltered++;
        }

        const hiR = maxHigherRate[r.chart.lv];
        if (hiR >= 0.45 && hiR - lvRate[r.chart.lv] >= 0.18) {
          w *= 0.04;
          slipFiltered++;
        } else if (s < sTop - 10.0) {
          w *= 0.20;
          slipFiltered++;
        } else if (s < sTop - 6.0 && r.lampRank === 2) {
          w *= 0.18;
          slipFiltered++;
        }
        if (s >= sTop - 4.0 && w >= 0.15) negNearOrAbove += w;
      }
      if (w > 0.005) samples.push({ s, y: isPos ? 1 : 0, w });
    }

    let belowW = 0;
    let belowNegW = 0;
    for (const pt of samples) {
      if (pt.s <= sTop - 6.0) {
        belowW += pt.w;
        if (pt.y < 0.5) belowNegW += pt.w;
      }
    }
    const empSlip = belowW >= 4 ? (belowNegW / belowW) : 0.03;
    const gamma = Math.max(0.025, Math.min(0.35, empSlip * 1.15 + 0.015));

    const ceilingCap = negNearOrAbove < 1.5 ? (maxPos + 1.8) : (maxPos + 5.5);
    const priorVar = negNearOrAbove < 1.5 ? (6 * 6) : (32 * 32);
    const fit = fitIrtTheta(samples, tau, { gamma, guess: 0.003, ceilingCap, priorMu: sTop - 1.5, priorVar });

    let note = '';
    if (sparseOptional) {
      note = gauge === 'hc' ? '平时以 NC 为主，按已 HC 与未过关前沿估算' : '按已 EXHC/FC 与前沿记录估算';
    } else if (slipFiltered >= 20) {
      note = `已降权 ${slipFiltered} 首低区未复打/Assist异常`;
    }

    return {
      ...fit,
      pos: posRecs.length,
      neg: played.length - posRecs.length,
      maxPos: Math.round(maxPos * 10) / 10,
      sTop: Math.round(sTop * 10) / 10,
      slipFiltered,
      sparseOptional,
      note,
      lvRate,
      maxHigherRate,
    };
  }

  // ==================== SP Fingering / Grip Styles & Alternate-Technique Coach ====================
  const SP_GRIP_STYLES = {
    '1048': {
      key: '1048',
      label: '1048式（完全固定）',
      short: '1048式',
      desc: '标准五指完全固定（1P 左拇指3键 / 2P 右拇指5键，小指搓盘）；高速乱打与二重乱打最稳，弱点在密集皿复合与皿侧强键。',
      strengths: [0, 1, 2],
      watchAxes: [5, 4, 6],
    },
    sym: {
      key: 'sym',
      label: '对称固定（対称固定）',
      short: '对称固定',
      desc: '左右对称分工（4键由强指/拇指居中灵活承接），同时押与中轴安定，弱点在高频来皿时的皿侧抽离与边缘弱指连打。',
      strengths: [0, 2, 3],
      watchAxes: [5, 1, 4],
    },
    half35: {
      key: 'half35',
      label: '3:5 半固定',
      short: '3:5半固定',
      desc: '来皿时非皿手自动多接管中轴键（1P 右手借3键 / 2P 左手借5键），皿复合极强；纯高速非皿段需注意切回常规固定防止中轴抢指。',
      strengths: [5, 1, 3],
      watchAxes: [0, 4, 2],
    },
    wrist: {
      key: 'wrist',
      label: '手首皿（手腕搓盘）',
      short: '手首皿',
      desc: '手腕直接压/推转盘，双手全时留在7键上；皿复合与BSS几乎零干扰，但超高速不规则连皿（24分/变速停顿皿）与长曲易手腕疲劳/空POOR。',
      strengths: [5, 6, 0],
      watchAxes: [2, 4, 5],
    },
    hokuto: {
      key: 'hokuto',
      label: '北斗（移动指）',
      short: '北斗/移动指',
      desc: '不固定键位靠手掌平移灵活点押；擅长低速奇形配置、纵连、单手交互与复杂CN，弱点在高速高密度乱打/二重乱打容易串轨迷路。',
      strengths: [4, 3, 6],
      watchAxes: [0, 1, 2],
    },
  };

  function recommendGripForChart(chart, mainStyleKey = '1048', spSide = '1p') {
    const styleKey = SP_GRIP_STYLES[mainStyleKey] ? mainStyleKey : '1048';
    const is2p = spSide === '2p';
    const r = chart.radar || [0, 0, 0, 0, 0, 0, 0, 0];
    const tags = chart.tags || [];
    const bpm = parsePrimaryBpm(chart.bpm);
    const kTot = Math.max(1, (chart.leftNotes || 0) + (chart.rightNotes || 0));
    const scrSideNotes = is2p ? (chart.rightNotes || 0) : (chart.leftNotes || 0);
    const scrSideRatio = kTot > 10 ? scrSideNotes / kTot : 0.43;
    const scrSideHeavy = scrSideRatio >= 0.485;
    const scrSideKeys = is2p ? '5/6/7键' : '1/2/3键';
    const borrowKey = is2p ? '左手拇指借5键' : '右手拇指借3键';
    const freeHand = is2p ? '左手' : '右手';
    const optGain = chart.optGain || 0;
    const optShort = chart.optShort || '-';
    const bestOpt = chart.bestOpt || '正規 (-)';

    const hasScr = tags.includes('皿') || r[5] >= 18;
    const heavyScr = r[5] >= 46;
    const hasJack = tags.includes('縦連') || r[4] >= 26;
    const hasFastStream = tags.includes('高速乱打') || tags.includes('二重乱打') || r[0] >= 44;
    const hasCn = tags.includes('CN/BSS') || tags.includes('HCN') || r[6] >= 20;
    const hasStair = tags.includes('階段') || r[1] >= 40;
    const lowBpmTech = bpm <= 130 && (r[1] >= 22 || hasScr || hasJack);

    const recs = [];

    // 1. Scratch & scratch-composite adaptation
    if (hasScr || (scrSideHeavy && r[5] >= 10)) {
      if (styleKey === '1048' || styleKey === 'sym') {
        recs.push({
          priority: 95 + (heavyScr ? 10 : 0) + (scrSideHeavy ? 8 : 0),
          altGrip: heavyScr ? '切 3:5 半固定 / 临时手首皿' : '切 3:5 半固定',
          badge: '切 3:5 / 手首皿',
          reason: scrSideHeavy
            ? `皿侧 ${scrSideKeys} 占比偏高 (${(scrSideRatio * 100).toFixed(0)}%) 且带皿复合，${SP_GRIP_STYLES[styleKey].short}硬顶易掉键；来皿时${borrowKey}切 3:5 半固定，或用临时手首皿解放七键。`
            : `含持续皿复合（皿轴 ${r[5]}），来皿段落推荐${borrowKey}切 3:5 半固定或临时切手首皿，大幅降低皿手小指来回切换负担。`,
          optHint: optShort === 'MIR' ? `强烈建议叠挂 鏡 (MIRROR) (-${(optGain * 100).toFixed(1)}%) 把重键移到${freeHand}` : (optGain >= 0.04 ? `可配合 ${bestOpt} (-${(optGain * 100).toFixed(1)}%)` : ''),
        });
      } else if (styleKey === 'half35' && (heavyScr || scrSideHeavy)) {
        recs.push({
          priority: 86,
          altGrip: '局部切 手首皿 / 皿段保盘',
          badge: '局部手首皿',
          reason: `高密皿复合（皿轴 ${r[5]}）超过常规 3:5 半固定舒适区，密集皿段可尝试局部切手首皿，或在连皿爆发处优先保盘、键位适当餡蜜。`,
          optHint: optShort === 'MIR' ? `配合 鏡 (MIRROR) (-${(optGain * 100).toFixed(1)}%) 可把 ${scrSideKeys} 移离皿侧` : '',
        });
      } else if (styleKey === 'wrist' && heavyScr) {
        recs.push({
          priority: 90,
          altGrip: '连皿段切 小指/指推拉皿',
          badge: '连皿切指皿',
          reason: `高密连皿/变速皿（皿轴 ${r[5]}）用手腕硬搓易触发空 POOR 与连 BAD 锁定；连皿爆发段建议临时切小指推拉控拍，普通皿复合段再回手首皿。`,
          optHint: optGain >= 0.04 ? `配合 ${bestOpt} 减轻单手键压` : '',
        });
      } else if (styleKey === 'hokuto' && hasScr) {
        recs.push({
          priority: 82,
          altGrip: '皿段切 3:5 半固定 / 手首皿',
          badge: '皿段切固定',
          reason: `北斗在来皿时易丢失键盘基准位，建议皿复合段落锚定 3:5 半固定（${borrowKey}）或切手首皿稳住键位参照。`,
          optHint: optShort === 'MIR' ? `配 鏡 (-${(optGain * 100).toFixed(1)}%) 更稳` : '',
        });
      }
    }

    // 2. Jacks, low-BPM awkward trills/chords -> Hokuto / Finger-break / Anmitsu
    if (hasJack || lowBpmTech) {
      if (styleKey !== 'hokuto') {
        recs.push({
          priority: 84 + (hasJack ? 8 : 0),
          altGrip: hasJack ? '纵连段 崩指 / 局部切北斗' : '低速奇形段 崩指 / 切北斗',
          badge: '局部崩指/北斗',
          reason: hasJack
            ? `含明显纵连/轴压（纵连轴 ${r[4]}），纯固定单指硬顶极易僵硬掉血；局部允许崩指/切北斗用双手或相邻强指分担，高密处可适度餡蜜。`
            : `中低速（BPM ${chart.bpm}）含相邻交互/奇形配置，固定手型易卡弱指，局部切北斗/崩指横向当成同时押处理更稳。`,
          optHint: optShort === 'S-RAN' || optShort === 'RAN' ? `配合 ${bestOpt} (-${(optGain * 100).toFixed(1)}%) 拆散固定纵连/同手颤音` : '',
        });
      }
    }

    // 3. Fast dense stream / double-stream -> Fixed 1048 / Symmetrical
    if (hasFastStream) {
      if (styleKey === 'hokuto') {
        recs.push({
          priority: 92,
          altGrip: '发狂段切 1048式 / 对称固定',
          badge: '切固定指法',
          reason: `高速高密乱打（乱打轴 ${r[0]}，峰值 ${chart.peakNps} NPS）下北斗平移极易串轨；主发狂段建议强行落回 1048/对称固定锁住基准键位。`,
          optHint: optGain >= 0.04 ? `建议搭配 ${bestOpt} (-${(optGain * 100).toFixed(1)}%) 均衡左右手` : '建议配 RANDOM 打散固定坏手型',
        });
      } else if (styleKey === 'half35' && !hasScr) {
        recs.push({
          priority: 74,
          altGrip: '纯键高速段回切 1048式 / 对称固定',
          badge: '纯键回固定',
          reason: `本谱几乎无皿干扰而乱打密度高（乱打轴 ${r[0]}），非皿段直接回切标准 1048 或对称固定，避免 3:5 中轴借指引起误触。`,
          optHint: optGain >= 0.04 ? `可配 ${bestOpt} (-${(optGain * 100).toFixed(1)}%)` : '',
        });
      } else if (styleKey === 'wrist' && r[2] >= 52 && !hasScr) {
        recs.push({
          priority: 72,
          altGrip: '纯键耐力段 抬腕回常规固定',
          badge: '抬腕省体力',
          reason: `高物量纯键耐力谱（物量轴 ${r[2]}，${chart.notes}N），无皿段抬起手腕回归标准固定可减少前臂僵硬、留体力保尾杀。`,
          optHint: optGain >= 0.04 ? `可配 ${bestOpt} (-${(optGain * 100).toFixed(1)}%)` : '',
        });
      }
    }

    // 4. CN / HCN / BSS same-hand lock -> Cross-hand borrow / Finger-break
    if (hasCn && (styleKey === '1048' || styleKey === 'sym')) {
      recs.push({
        priority: 78,
        altGrip: 'CN段 跨手借键 / 临时手首皿(BSS)',
        badge: 'CN跨手崩指',
        reason: `含 CN/HCN/BSS 锁指配置（CN轴 ${r[6]}），按住长条时不必死守完全固定，允许空余手拇指/食指跨手代按相邻键；BSS 期间切 3:5 或手首皿极稳。`,
        optHint: optGain >= 0.04 ? `优先固定系 ${chart.fixedOpt || bestOpt}，减少随机抽到同手锁指` : '',
      });
    }

    // 5. Staircases & strong option relief
    if (hasStair && styleKey === 'hokuto' && recs.length === 0) {
      recs.push({
        priority: 70,
        altGrip: '阶段段切 固定指法 + 必要时餡蜜',
        badge: '阶段切固定',
        reason: `高频楼梯/指独立配置（技术轴 ${r[1]}），固定手型顺扫稳定性远高于移动指，极高速二重楼梯可适度餡蜜保血。`,
        optHint: optShort === 'MIR' || optShort === 'R-RAN' ? `配合 ${bestOpt} (-${(optGain * 100).toFixed(1)}%) 避开弱指反手楼梯` : '',
      });
    }

    recs.sort((a, b) => b.priority - a.priority);
    const primary = recs[0] || {
      priority: 30,
      altGrip: `保持主力「${SP_GRIP_STYLES[styleKey].short}」即可`,
      badge: '主力手法适配',
      reason: optGain >= 0.04
        ? `当前主力「${SP_GRIP_STYLES[styleKey].short}」与本谱契合度良好，无需强切手势；直接切换推荐选项 ${bestOpt} 即可减负 -${(optGain * 100).toFixed(1)}%。`
        : `键位分布均衡，直接用主力「${SP_GRIP_STYLES[styleKey].short}」正常发力即可，无需刻意切变招。`,
      optHint: optGain >= 0.04 ? `推荐选项：${bestOpt} (-${(optGain * 100).toFixed(1)}%)` : '',
    };

    return {
      mainStyle: SP_GRIP_STYLES[styleKey],
      needsSwitch: primary.priority >= 70,
      primary,
      secondary: recs[1] || null,
    };
  }

  function buildCsvGripCoaching(report, mainStyleKey = '1048', spSide = '1p') {
    const styleKey = SP_GRIP_STYLES[mainStyleKey] ? mainStyleKey : '1048';
    const style = SP_GRIP_STYLES[styleKey];
    if (!report || report.mode !== 'sp') return null;

    const ax = report.axisAnalysis || [];
    const getIdx = (i) => (ax[i] ? ax[i].strengthIndex : 0);
    const streamI = getIdx(0);
    const techI = getIdx(1);
    const stamI = getIdx(2);
    const jackI = getIdx(4);
    const scrI = getIdx(5);
    const cnI = getIdx(6);

    const insights = [];
    if (styleKey === '1048' || styleKey === 'sym') {
      if (scrI <= -4) {
        insights.push({
          title: '皿复合是当前主力手型的最大瓶颈',
          action: '练「局部切 3:5 半固定」或「手首皿」',
          detail: `你在皿/皿复合轴表现偏弱（${scrI}），正是 ${style.short} 在皿侧键与转盘频繁切换时的典型天花板。建议从下方皿复合曲目开始练习来皿借中轴键（${spSide === '2p' ? '左手拇指借5键' : '右手拇指借3键'}）或手腕压盘。`,
        });
      }
      if (jackI <= -4) {
        insights.push({
          title: '固定指法硬顶纵连/轴谱易失速',
          action: '关键段允许「局部崩指 / 北斗」或开 RAN/S-RAN',
          detail: `纵连/轴轴偏弱（${jackI}），遇到单手连续同轨或奇形低速交互时不要死守固定位，尝试松开手型用强指/双手分担，或对低和弦纵连谱挂 S-RAN。`,
        });
      }
      if (cnI <= -4) {
        insights.push({
          title: '同手 CN 锁指导致失分',
          action: 'CN/BSS 期间练「跨手借键」',
          detail: `CN/HCN 轴偏弱（${cnI}），普通 CN 尾判极宽无需死盯松手，按住时允许另一只手跨过来帮按邻键。`,
        });
      }
    } else if (styleKey === 'half35') {
      if (streamI <= -4) {
        insights.push({
          title: '高速纯键乱打段中轴容易抢指',
          action: '无皿发狂段主动回切「1048式 / 对称固定」',
          detail: `乱打/高速轴偏弱（${streamI}），3:5 半固定在无皿高密段容易出现中轴键分配摇摆，养成“无皿回固定、来皿切3:5”的双态切换能明显提上限。`,
        });
      }
      if (scrI <= -4) {
        insights.push({
          title: '超密皿复合超出半固定上限',
          action: '极密皿段补练「临时手首皿」或挂 MIRROR',
          detail: `皿轴偏弱（${scrI}），高密连皿与同侧重键同时出现时可尝试临时手首皿，或利用 2P/1P 鏡将重键移离皿侧。`,
        });
      }
    } else if (styleKey === 'wrist') {
      if (scrI <= -4) {
        insights.push({
          title: '手首皿在连皿/变速皿上容易空 POOR',
          action: '连皿爆发段切「小指推拉控拍」',
          detail: `皿轴偏弱（${scrI}），手腕在 16/24 分不规则连皿中回弹惯性大，遇到灼熱系/停顿连皿建议临时切回指皿稳住推拉节奏，常规皿复合再用回手首皿。`,
        });
      }
      if (stamI <= -4 || streamI <= -4) {
        insights.push({
          title: '高物量纯键段前臂易僵硬',
          action: '纯键段「抬腕放松」回常规固定',
          detail: `物量/乱打轴偏紧（乱打 ${streamI} / 物量 ${stamI}），纯键长段无需一直压腕贴盘，抬腕放松能显著延缓后半段降速。`,
        });
      }
    } else if (styleKey === 'hokuto') {
      if (streamI <= -4 || techI <= -4) {
        insights.push({
          title: '高速乱打/阶段下移动指容易迷路',
          action: '高密主攻段切入「1048式 / 对称固定」',
          detail: `乱打/指独立轴偏弱（乱打 ${streamI} / 技术 ${techI}），建议在 160+ BPM 高密乱打与连续阶段中强行固定基准指位，保留北斗用于低速奇形与纵连。`,
        });
      }
      if (scrI <= -4) {
        insights.push({
          title: '来皿时平移手掌易丢定位',
          action: '皿复合段切「3:5 半固定」或「手首皿」',
          detail: `皿轴偏弱（${scrI}），来皿时先用固定基准位稳住键盘再兼顾转盘，避免单手找键失位。`,
        });
      }
    }

    if (insights.length === 0) {
      insights.push({
        title: `当前主力「${style.short}」与你的八维画像高度契合`,
        action: '按单曲配置局部叠用「副手法 + 减负选项」冲击更高灯',
        detail: `你的整体短板不集中于 ${style.short} 的典型结构弱点；冲击当前能力线上方谱面时，可针对下方高亮谱面在关键段落局部切变招（3:5 / 手首皿 / 崩指）并善用减负选项。`,
      });
    }

    // Pick concrete un-cleared / upgradeable charts in active focus levels where an alternate grip or strong option helps!
    const targetMinRank = report.evalGauge === 'hc' ? 5 : 4;
    const activeLvs = new Set(report.focusLevels || [report.primaryLevel]);
    const candidates = (report.enriched || [])
      .filter((r) => r.chart.ac && activeLvs.has(r.chart.lv) && r.lampRank < targetMinRank)
      .map((r) => {
        const gRec = recommendGripForChart(r.chart, styleKey, spSide);
        const sKey = report.evalGauge === 'hc' ? 's_hc' : 's_nc';
        const refTheta = report.evalGauge === 'hc'
          ? (report.irt.hc?.theta ?? report.irt.nc?.theta ?? 40)
          : (report.irt.nc?.theta ?? 40);
        const dist = Math.abs(r.chart[sKey] - refTheta);
        const nearBonus = Math.max(0, 20 - dist * 2.2);
        const optBonus = (r.chart.optGain || 0) * 140;
        const switchBonus = gRec.needsSwitch ? gRec.primary.priority * 0.45 : 0;
        const score = nearBonus + optBonus + switchBonus;
        return { rec: r, chart: r.chart, grip: gRec, score, sVal: r.chart[sKey] };
      })
      .filter((x) => x.grip.needsSwitch || (x.chart.optGain || 0) >= 0.04)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    return {
      style,
      spSide,
      targetGaugeLabel: report.evalGauge === 'hc' ? 'HC 白灯' : 'NC 蓝灯',
      insights,
      candidates,
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
    let band = '中位 (B/C)';
    if (pct >= 0.92) band = '最上位 (S+)';
    else if (pct >= 0.80) band = '上位 (S/A+)';
    else if (pct >= 0.62) band = '中上位 (A/B+)';
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
    const unmatchedRecords = matchResult.unmatchedRecords || [];
    const allPlayedRecords = matchResult.allPlayedRecords || played;
    const catalogStats = buildCatalogStats(catalogCharts);
    const axisMeta = AXIS_COACH[mode];

    // 1. Per-level lamp distribution (includes all CSV played charts, even when Textage lacks the chart yet)
    const levelSummary = [];
    for (let lv = 1; lv <= 12; lv++) {
      const lvPlayed = allPlayedRecords.filter((r) => r.chart.lv === lv);
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

    // 2. Fit 4-Gauge Clear Power (Slip-Aware 4PL IRT + inverted lower-level non-attempt & sparse-gauge censoring)
    const tauByMode = mode === 'dp' ? 3.8 : 3.2;
    const currentPlayCount = played.filter((r) => !r.isCarryover).length;
    const hasCurrentData = currentPlayCount >= 15;
    const carryoverBaseW = (r) => {
      if (!hasCurrentData || !r.isCarryover) return 1.0;
      if (r.lampRank === 1) return 0.16; // Stale previous-version FAILED (never replayed this version)
      if (r.lampRank === 2) return 0.32; // Stale previous-version ASSIST
      if (r.lampRank === 3) return 0.55; // Previous-version EC
      return 0.72; // Previous-version NC+ clear (still real historical pass, lighter than current plays)
    };

    const irt = {
      ec: fitRobustGaugeIrt(played, 'ec', 3, tauByMode, carryoverBaseW, false),
      nc: fitRobustGaugeIrt(played, 'nc', 4, tauByMode, carryoverBaseW, false),
      hc: fitRobustGaugeIrt(played, 'hc', 5, tauByMode + 0.4, carryoverBaseW, true),
      exhc: fitRobustGaugeIrt(played, 'exhc', 6, tauByMode + 0.8, carryoverBaseW, true),
    };
    for (const g of ['ec', 'nc', 'hc', 'exhc']) {
      if (irt[g]) {
        irt[g].eq = mapThetaToLevelTier(irt[g].theta, g, catalogStats);
      }
    }

    // Determine primary anchor theta & active focus levels (favoring current-version plays when available)
    const ncTheta = irt.nc?.theta ?? irt.ec?.theta ?? (
      played.length ? played.reduce((a, r) => a + r.chart.s_nc, 0) / played.length : 25
    );
    const ecTheta = irt.ec?.theta ?? ncTheta;
    const hcTheta = (irt.hc?.reliable && irt.hc.theta !== null) ? irt.hc.theta : (ncTheta - 1.5);

    const activeCandidates = levelSummary
      .filter((l) => l.played >= 5)
      .map((l) => {
        const lvRecs = allPlayedRecords.filter((r) => r.chart.lv === l.lv);
        let effN = 0, effNc = 0;
        for (const r of lvRecs) {
          const w = !hasCurrentData || !r.isCarryover ? 1.0 : 0.35;
          effN += w;
          if (r.lampRank >= 4) effNc += w;
        }
        const effNcRate = effN > 0 ? effNc / effN : l.ncRate;
        const mixScore = 1 - Math.abs(effNcRate - 0.52) * 1.4;
        return { lv: l.lv, score: effN * (0.45 + Math.max(0, mixScore)) };
      })
      .sort((a, b) => b.score - a.score);

    const primaryLevel = activeCandidates[0]?.lv || irt.nc?.eq?.lv || 8;
    const primarySummary = levelSummary.find((l) => l.lv === primaryLevel);
    const primaryHcCount = primarySummary
      ? (primarySummary.counts.HC + primarySummary.counts.EXHC + primarySummary.counts.FC)
      : 0;
    const primaryHcRate = primarySummary && primarySummary.played > 0 ? primaryHcCount / primarySummary.played : 0;
    const evalGauge = (primaryHcRate >= 0.45 && irt.hc?.reliable && irt.hc.theta !== null) ? 'hc' : 'nc';
    const evalSKey = evalGauge === 'hc' ? 's_hc' : 's_nc';
    const evalMinRank = evalGauge === 'hc' ? 5 : 4;
    const evalIrt = irt[evalGauge] || irt.nc;
    const evalRefTheta = evalGauge === 'hc' ? hcTheta : ncTheta;

    const focusLevels = [
      Math.max(1, primaryLevel - 1),
      primaryLevel,
      Math.min(12, primaryLevel + 1),
    ].filter((v, i, arr) => arr.indexOf(v) === i);
    const focusMin = focusLevels[0];
    const focusMax = focusLevels[focusLevels.length - 1];
    const focusSet = new Set(focusLevels);

    const levelFocusWeight = (lv) => {
      if (focusSet.has(lv)) return 1.0;
      const distOut = lv < focusMin ? (focusMin - lv) : (lv - focusMax);
      if (distOut === 1) return 0.22; // e.g., ★7 or ★11 when active range is ★8–★10
      return 0.06; // e.g., ≤★6 or ★12 when active range is ★8–★10
    };

    const carryoverAnalysisWeight = (r) => {
      if (!hasCurrentData || !r.isCarryover) return 1.0;
      if (r.lampRank === 1) return 0.14; // Likely stale old-version FAILED
      if (r.lampRank === 2) return 0.28; // Old-version ASSIST
      return 0.55; // Old-version EC/NC/HC/EXHC/FC
    };

    const softClearVal = (r) => {
      if (evalGauge === 'hc') {
        if (r.lampRank >= 6) return 1.0;
        if (r.lampRank === 5) return 0.92;
        if (r.lampRank === 4) return 0.52;
        if (r.lampRank === 3) return 0.28;
        if (r.lampRank === 2) return 0.10;
        return 0.0;
      }
      if (r.lampRank >= 4) return 1.0;
      if (r.lampRank === 3) return 0.62;
      if (r.lampRank === 2) return 0.30;
      return 0.0;
    };

    // 3. Frontier + Focus-Level + Slip-Aware Weighted Clear, EX% & BP% Baselines (2-pass)
    const invLvRate = evalIrt?.lvRate || [];
    const invMaxHi = evalIrt?.maxHigherRate || [];
    const evalSTop = evalIrt?.sTop ?? evalRefTheta;

    const calcInfoW = (r, refTheta) => {
      const sVal = r.chart[evalSKey];
      const p = sigmoid((refTheta - sVal) / tauByMode);
      const dist = Math.abs(sVal - refTheta);
      let frontierW = 1.0;
      if (p > 0.96 && r.lampRank >= evalMinRank) frontierW = 0.25;
      else if (p < 0.04 && r.lampRank <= 1) frontierW = 0.25;
      else if (dist > 14) frontierW = 0.45;
      // Neutralize inverted lower-level casual/ASSIST/un-retried fails (e.g. ★12 HC player with ★1-10 AC/FAILED)
      if (r.lampRank < evalMinRank) {
        const hiR = invMaxHi[r.chart.lv] || 0;
        const curR = invLvRate[r.chart.lv] || 0;
        if (hiR >= 0.45 && hiR - curR >= 0.18) frontierW *= 0.05;
        else if (sVal < evalSTop - 10.0) frontierW *= 0.16;
      }
      return frontierW * levelFocusWeight(r.chart.lv) * carryoverAnalysisWeight(r);
    };

    // Pass 2: Refit soft clear curve, frontier curve, EX baseline & BP baseline with slip-aware weights
    const weightedSoft = played.map((r) => ({
      s: r.chart[evalSKey],
      y: softClearVal(r),
      w: calcInfoW(r, evalRefTheta),
    })).filter((pt) => pt.w > 0.005);
    const softTheta = fitIrtTheta(weightedSoft, tauByMode, { gamma: 0.04, priorMu: evalRefTheta })?.theta ?? evalRefTheta;

    const weightedFrontier = played.map((r) => ({
      s: r.chart[evalSKey],
      y: r.lampRank >= evalMinRank ? 1 : 0,
      w: calcInfoW(r, softTheta),
    })).filter((pt) => pt.w > 0.005);
    const evalFrontierTheta = fitIrtTheta(weightedFrontier, tauByMode, { gamma: 0.04, priorMu: evalRefTheta })?.theta ?? evalRefTheta;

    const scoredPts = played
      .filter((r) => r.exRate !== null)
      .map((r) => ({ x: r.chart[evalSKey], y: r.exRate, w: calcInfoW(r, softTheta) }));
    const exBaseline = fitLinearBaseline(scoredPts);

    const bpPts = played
      .filter((r) => r.bpRate !== null)
      .map((r) => ({ x: r.chart[evalSKey], y: Math.min(0.40, r.bpRate), w: calcInfoW(r, softTheta) }));
    const bpBaseline = fitLinearBaseline(bpPts);

    const enriched = played.map((r) => {
      const c = r.chart;
      const sEval = c[evalSKey];
      const pEc = sigmoid((ecTheta - c.s_ec) / tauByMode);
      const pNc = sigmoid((evalFrontierTheta - sEval) / tauByMode);
      const pSoft = sigmoid((softTheta - sEval) / tauByMode);
      const actualSoft = softClearVal(r);
      const rClear = actualSoft - pSoft;

      const expEx = Math.max(0.30, Math.min(0.98, exBaseline.a + exBaseline.b * sEval));
      const rEx = r.exRate !== null ? (r.exRate - expEx) : null;

      const expBp = Math.max(0.002, Math.min(0.35, bpBaseline.a + bpBaseline.b * sEval));
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
        inFocus: focusSet.has(c.lv),
        zRadar,
        primaryBpm: parsePrimaryBpm(c.bpm),
      };
    });

    // Global baseline zero-centering
    let totW = 0, totR = 0;
    for (const r of enriched) { totW += r.infoW; totR += r.infoW * r.perfResid; }
    const globalOffset = totW > 0 ? totR / totW : 0;
    for (const r of enriched) r.perfResidCentered = r.perfResid - globalOffset;

    // 4. 8-Axis Relative Strength & Weakness Decomposition (Focus-Level & Current-Version Weighted!)
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

      let wSum = 0, infoWSum = 0, focusN = 0, resSum = 0, actNcSum = 0, expNcSum = 0;
      let exWSum = 0, rExSum = 0, exAbsSum = 0;
      let bpWSum = 0, rBpSum = 0, bpAbsSum = 0;

      for (const r of subset) {
        const zW = Math.min(2.4, Math.max(0.5, r.zRadar[d]));
        const w = r.infoW * zW;
        wSum += w;
        infoWSum += r.infoW;
        if (r.inFocus) focusN++;
        resSum += w * r.perfResidCentered;
        actNcSum += w * (r.lampRank >= evalMinRank ? 1 : 0);
        expNcSum += w * r.pNc;
        if (r.rEx !== null) { exWSum += w; rExSum += w * r.rEx; exAbsSum += w * r.exRate; }
        if (r.rBp !== null) { bpWSum += w; rBpSum += w * r.rBp; bpAbsSum += w * r.bpRate; }
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
        focusN,
        infoWSum,
        wSum,
        contrast,
        actualNcPct: wSum > 0 ? (actNcSum / wSum) * 100 : null,
        expectedNcPct: wSum > 0 ? (expNcSum / wSum) * 100 : null,
        avgExPct: exWSum > 0 ? (exAbsSum / exWSum) * 100 : null,
        deltaExPct: exWSum > 0 ? (rExSum / exWSum) * 100 : null,
        avgBpPct: bpWSum > 0 ? (bpAbsSum / bpWSum) * 100 : null,
        deltaBpPct: bpWSum > 0 ? (rBpSum / bpWSum) * 100 : null,
      });
    }

    // Center across the 8 axes by their effective sample weight so relative strengths (+) and weaknesses (-) are balanced!
    let axW = 0, axC = 0;
    for (const a of rawAxes) {
      if (a.n >= 3 && a.infoWSum > 0.4) {
        const w = Math.min(35, a.infoWSum);
        axW += w;
        axC += w * a.contrast;
      }
    }
    const meanAxisContrast = axW > 0 ? axC / axW : 0;

    const axisAnalysis = rawAxes.map((a) => {
      const d = a.d;
      const relContrast = a.contrast - meanAxisContrast;
      const shrink = a.infoWSum / (a.infoWSum + 3.5);
      const strengthIndex = Math.round(Math.max(-100, Math.min(100, relContrast * shrink * 175)));
      const deltaNcPct = (a.actualNcPct !== null && a.expectedNcPct !== null) ? (a.actualNcPct - a.expectedNcPct) : null;

      // Example relevance multiplier: strongly prefer active focus levels & current-version plays over out-of-range / carryover fails
      const exRel = (r) => {
        const lvMul = r.inFocus ? 1.0 : (Math.min(Math.abs(r.chart.lv - focusMin), Math.abs(r.chart.lv - focusMax)) === 1 ? 0.16 : 0.05);
        const carryMul = (!hasCurrentData || !r.isCarryover) ? 1.0 : (r.lampRank === 1 ? 0.08 : (r.lampRank === 2 ? 0.20 : 0.45));
        return lvMul * carryMul * Math.min(2.2, Math.max(0.5, r.zRadar[d]));
      };

      const hiScore = (r) => {
        const rel = exRel(r);
        const val = r.perfResidCentered;
        return val >= 0 ? val * rel : val / Math.max(0.05, rel);
      };
      const loScore = (r) => {
        const rel = exRel(r);
        const bad = -r.perfResidCentered;
        return bad >= 0 ? bad * rel : bad / Math.max(0.05, rel);
      };

      const highlights = [...a.subset]
        .filter((r) => r.lampRank >= Math.max(3, evalMinRank - 1) && r.infoW >= 0.15)
        .sort((x, y) => hiScore(y) - hiScore(x))
        .slice(0, 3);

      const strugglePool = a.subset.filter((r) => r.lampRank < evalMinRank && r.infoW >= 0.15 && r.perfResidCentered < 0.05);
      const struggles = [...(strugglePool.length ? strugglePool : a.subset.filter((r) => r.lampRank < evalMinRank))]
        .sort((x, y) => loScore(y) - loScore(x))
        .slice(0, 3);

      let verdict = '均衡';
      if (a.n < 3 || a.infoWSum < 1.2) verdict = '样本较少';
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
        focusN: a.focusN,
        effN: Math.round(a.infoWSum * 10) / 10,
        confidence: a.infoWSum >= 8 ? '高' : (a.infoWSum >= 3 ? '中' : '低'),
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
      let wSum = 0, resSum = 0, actNc = 0, expNc = 0, exW = 0, exSum = 0, bpW = 0, bpSum = 0;
      for (const r of items) {
        wSum += r.infoW;
        resSum += r.infoW * r.perfResidCentered;
        actNc += r.infoW * (r.lampRank >= evalMinRank ? 1 : 0);
        expNc += r.infoW * r.pNc;
        if (r.exRate !== null) { exW += r.infoW; exSum += r.infoW * r.exRate; }
        if (r.bpRate !== null) { bpW += r.infoW; bpSum += r.infoW * r.bpRate; }
      }
      const n = items.length;
      const shrink = wSum / (wSum + 3.0);
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
        avgExPct: exW > 0 ? (exSum / exW) * 100 : null,
        avgBpPct: bpW > 0 ? (bpSum / bpW) * 100 : null,
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
    const syntheticPgCount = scoredRecs.filter((r) => r.isSyntheticPgGr).length;
    const focusPgRecs = refScored.filter((r) => r.pgRatio !== null);
    const allPgRecs = scoredRecs.filter((r) => r.pgRatio !== null);
    const pgRecs = focusPgRecs.length > 0 ? focusPgRecs : allPgRecs;
    const realPgCount = pgRecs.length;
    const avgPgRatio = pgRecs.length ? (pgRecs.reduce((a, r) => a + r.pgRatio, 0) / pgRecs.length) * 100 : null;
    const bpRecs = allPlayedRecords.filter((r) => r.hasBp && r.bp !== null && focusLevels.includes(r.chart.lv));
    const avgFocusBp = bpRecs.length ? bpRecs.reduce((a, r) => a + r.bp, 0) / bpRecs.length : null;
    const djCounts = { AAA: 0, AA: 0, A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    for (const r of allPlayedRecords) {
      if (r.dj && djCounts[r.dj] !== undefined) djCounts[r.dj]++;
    }
    const latestPlayDate = allPlayedRecords
      .map((r) => r.lastPlayed)
      .filter(Boolean)
      .sort()
      .pop() || '—';

    const reliableAxes = axisAnalysis.filter((a) => a.n >= 3 && a.effN >= 1.2);
    const sortedBest = [...reliableAxes].sort((a, b) => b.strengthIndex - a.strengthIndex);
    const sortedWeak = [...reliableAxes].sort((a, b) => a.strengthIndex - b.strengthIndex);
    const topStrengths = sortedBest.filter((a) => a.strengthIndex >= 4).slice(0, 3);
    const topWeaknesses = sortedWeak.filter((a) => a.strengthIndex <= -4).slice(0, 3);
    const coachWeakAxes = topWeaknesses.length >= 2 ? topWeaknesses : sortedWeak.slice(0, 3);

    const overPool = enriched.filter((r) => r.lampRank >= evalMinRank && r.infoW >= 0.35);
    const topOverperform = [...(overPool.length >= 5 ? overPool : enriched.filter((r) => r.lampRank >= evalMinRank))]
      .sort((a, b) => (b.perfResidCentered * Math.sqrt(b.infoW)) - (a.perfResidCentered * Math.sqrt(a.infoW)))
      .slice(0, 10);

    const underPool = enriched.filter((r) => r.lampRank < evalMinRank && r.infoW >= 0.35 && r.perfResidCentered < 0);
    const topUnderperform = [...(underPool.length >= 5 ? underPool : enriched.filter((r) => r.lampRank < evalMinRank && r.infoW >= 0.15 && r.perfResidCentered < 0))]
      .sort((a, b) => (a.perfResidCentered * Math.sqrt(a.infoW)) - (b.perfResidCentered * Math.sqrt(b.infoW)))
      .slice(0, 10);

    const targetGauge = opts.targetGauge || evalGauge;
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
    const primaryIrt = irt[evalGauge] || irt.nc;
    const gaugeLabelCn = evalGauge === 'hc' ? '白灯(HC)' : '蓝灯(NC)';
    if (primaryIrt?.eq) {
      summaryLines.push(
        `当前 ${mode.toUpperCase()} ${gaugeLabelCn} 有效能力线 CP ${primaryIrt.theta.toFixed(1)}（约 ${primaryIrt.eq.label}），主攻区间集中在 ★${Math.max(1, primaryLevel - 1)}–★${Math.min(12, primaryLevel + 1)}。`
      );
    }
    if (topStrengths.length > 0 && topWeaknesses.length > 0) {
      summaryLines.push(
        `优势项在 ${topStrengths.slice(0, 2).map((a) => `${a.short}(+${a.strengthIndex})`).join('、')}，核心补强点为 ${topWeaknesses.slice(0, 2).map((a) => `${a.short}(${a.strengthIndex})`).join('、')}。`
      );
    } else if (topStrengths.length > 0) {
      summaryLines.push(
        `相对优势项：${topStrengths.slice(0, 2).map((a) => `${a.short}(+${a.strengthIndex})`).join('、')}，八维整体较均衡，可直接沿地力主线抬升上限。`
      );
    } else if (topWeaknesses.length > 0) {
      summaryLines.push(
        `核心提分短板：${topWeaknesses.slice(0, 2).map((a) => `${a.short}(${a.strengthIndex})`).join('、')}，建议结合下方「手法建议」与三阶梯歌单针对补强。`
      );
    } else {
      summaryLines.push('八维配置发展均衡，没有明显偏科短板，建议直接通过地力主线梯队稳步抬升密度上限。');
    }
    if (coreVsKj.kojinsa.n >= 10 && coreVsKj.core.score - coreVsKj.kojinsa.score >= 12) {
      summaryLines.push(`配置倾向：地力谱明显稳于个人差谱（地力 ${coreVsKj.core.score > 0 ? '+' : ''}${coreVsKj.core.score} vs 个人差 ${coreVsKj.kojinsa.score}），补齐个人差短板后清灯数将快速跳升。`);
    } else if (coreVsKj.kojinsa.n >= 10 && coreVsKj.kojinsa.score - coreVsKj.core.score >= 12) {
      summaryLines.push(`配置倾向：个人差谱面适应力突出（个人差 +${coreVsKj.kojinsa.score}），当前突破瓶颈的关键是多刷常规高密地力乱打抬升物量上限。`);
    }
    if (lastKillStat.n >= 5 && lastKillStat.score <= -10) {
      summaryLines.push('结构诊断：尾杀谱（ラス殺し）失分偏多，后段体力/控血偏紧，建议多打 1,000N+ 持续物量谱稳住后半段手速。');
    }

    const reportObj = {
      mode,
      evalGauge,
      filename: matchResult.filename,
      totalCsvSongs: matchResult.totalCsvSongs,
      matchedSongs: matchResult.matchedSongs,
      unmatchedSongs: matchResult.unmatchedSongs,
      totalCsvPlayedCharts: matchResult.totalCsvPlayedCharts,
      missingTextageDiffs: matchResult.missingTextageDiffs,
      playedCount: allPlayedRecords.length,
      matchedChartCount: played.length,
      unmatchedChartCount: unmatchedRecords.length,
      scoredCount: allPlayedRecords.filter((r) => r.hasScore).length,
      carryoverCount: allPlayedRecords.filter((r) => r.isCarryover).length,
      latestPlayDate,
      levelSummary,
      irt,
      primaryLevel,
      primaryHcRate,
      focusLevels,
      avgExPct,
      avgPgRatio,
      realPgCount,
      syntheticPgCount,
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
      unmatchedRecords,
      allPlayedRecords,
    };

    if (mode === 'sp') {
      reportObj.gripCoach = buildCsvGripCoaching(reportObj, opts.spStyle || '1048', opts.spSide || '1p');
    }
    return reportObj;
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
    SP_GRIP_STYLES,
    recommendGripForChart,
    buildCsvGripCoaching,
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
