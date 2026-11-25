(function () {
  'use strict';

  const BASE_URL = 'https://textage.cc/score/';
  const PRACTICE_BASE_URL = 'https://iidx-play.cee.ee/';
  const PRACTICE_TEXTAGE_PATH_RE = /^\/score\/\d{1,2}\/[a-zA-Z0-9_-]+\.html$/;
  const DIFF_LET = ['B', 'N', 'H', 'A', 'L'];
  const ALL_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const TIER_ORDER_12 = ['S+', 'S', 'A+', 'A', 'B+', 'B', 'C', 'D', 'E', 'F'];
  const TIER_ORDER_MID = ['S', 'A+', 'A', 'B+', 'B', 'C', 'D', 'E'];
  const TIER_ORDER_LOW = ['S', 'A', 'B', 'C', 'D', 'E'];
  const CSV_STORAGE_KEY = 'iidx_textage_csv_v1';
  const THEME_STORAGE_KEY = 'iidx_textage_theme_v1';
  const SP_SIDE_STORAGE_KEY = 'iidx_textage_sp_side_v1';
  const SP_STYLE_STORAGE_KEY = 'iidx_textage_sp_style_v1';
  const LEVELS_STORAGE_KEY = 'iidx_textage_levels_v1';
  const UI_PREFS_STORAGE_KEY = 'iidx_textage_ui_prefs_v1';
  const SNAPSHOT_DB_NAME = 'iidx_textage_local_v1';
  const SNAPSHOT_STORE_NAME = 'csv_snapshots';
  const SNAPSHOT_FALLBACK_KEY = 'iidx_textage_csv_snapshots_fb_v1';

  const RADAR_CFG = {
    sp: {
      labels: ['乱打/高速', '階段/指独立', '物量/体力', '認識/ズレ', '縦連/軸', '皿/皿複合', 'CN/HCN', '变速/ソフラン'],
      cols:   ['#38bdf8', '#60a5fa', '#22c55e', '#14b8a6', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'],
      fill:   'rgba(59,130,246,0.22)',
      stroke: '#3b82f6',
    },
    dp: {
      labels: ['片手力/复用', '両手物量', '認識/左右振り', '無理押し/移動', '縦連/軸', '着地/皿', '片手CN', '变速/ソフラン'],
      cols:   ['#14b8a6', '#22c55e', '#38bdf8', '#f97316', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'],
      fill:   'rgba(20,184,166,0.22)',
      stroke: '#14b8a6',
    },
  };

  const TAG_OPTS = {
    sp: [
      ['ALL', '特征：全部谱面'], ['JIRIKI', '仅地力 (Core)'], ['KOJINSA', '仅个人差'],
      ['OPT_EFF', '选项显著减负 (≥4%)'],
      ['高速乱打', '含 高速乱打'], ['二重乱打', '含 16分二重乱打'], ['階段', '含 階段/二重階段'],
      ['同時押し', '含 同時押し'], ['縦連', '含 縦連/微縦連'], ['皿', '含 皿/皿複合'],
      ['HCN', '含 HCN'], ['CN/BSS', '含 CN/BSS'], ['ソフラン', '含 ソフラン'],
      ['ラス殺し', '含 ラス殺し (尾杀)'], ['局所難', '含 局所難'],
    ],
    dp: [
      ['ALL', '特征：全部谱面'], ['JIRIKI', '仅地力 (Core)'], ['KOJINSA', '仅个人差'],
      ['OPT_EFF', '选项显著减负 (≥4%)'],
      ['片手発狂', '含 片手発狂/复用'], ['着地難', '含 着地難 (皿↔鍵盤)'], ['DB同時押し', '含 DB同時押し'], ['左右振り', '含 左右振り/横認識'],
      ['無理押し', '含 無理押し/三角押し'], ['片手移動', '含 片手遠距離移動'], ['階段', '含 片手階段'],
      ['無理皿/隣接皿', '含 無理皿/隣接皿'], ['両皿', '含 両皿/交互皿'], ['連皿', '含 連皿'],
      ['縦連', '含 片手縦連'], ['HCN', '含 HCN'], ['片手CN', '含 片手CN/BSS'],
      ['ソフラン', '含 ソフラン'], ['ラス殺し', '含 ラス殺し'], ['局所難', '含 局所難'],
    ],
  };

  const ERA_DEFS = [
    { key: 'ALL',    label: '全部历代',        codes: null },
    { key: 'OLD',    label: '1st–10th',       codes: ['01','SS','02','03','04','05','06','07','08','09','10'] },
    { key: 'PS2',    label: '11 RED–16 EMP',  codes: ['11','12','13','14','15','16'] },
    { key: 'MID',    label: '17 SIR–23 cop',  codes: ['17','18','19','20','21','22','23'] },
    { key: 'MOD',    label: '24 SINO–29 CH',  codes: ['24','25','26','27','28','29'] },
    { key: 'NEW',    label: '30 RES–34 ZIN',  codes: ['30','31','32','33','34'] },
    { key: 'CS',     label: '仅 CS',           codes: ['CS'] },
  ];

  let P = null;
  let DATASETS = { sp: [], dp: [] };
  let CHART_BY_ID = { sp: new Map(), dp: new Map() };
  let VER_INFO = []; // [{ idx, code, name }]
  let cpDomain = { min: 0, max: 100, preCpList: [], bins: 32 };
  let cpBarReady = false;
  let cpDragRaf = 0;
  let prefsRestored = false;
  const mobileInspectorMQ = window.matchMedia('(max-width: 1180px)');
  const mobileSmallMQ = window.matchMedia('(max-width: 768px)');
  const fineHoverMQ = window.matchMedia('(hover: hover) and (pointer: fine)');
  function isCompactInspector() {
    return mobileInspectorMQ.matches;
  }

  const state = {
    tab: location.hash === '#dp' ? 'dp' : (location.hash === '#csv' ? 'csv' : 'sp'),
    lastExplorerMode: location.hash === '#dp' ? 'dp' : 'sp',
    spSide: '1p', // '1p' (left turntable) | '2p' (right turntable)
    spStyle: '1048', // '1048' | 'sym' | 'half35' | 'wrist' | 'hokuto'
    levels: new Set([12]),
    levelsByMode: { sp: new Set([12]), dp: new Set([12]) },
    levelsSourceByMode: { sp: 'default', dp: 'default' }, // 'default' | 'csv' | 'user'
    levelMulti: false,
    diffs: new Set(['B', 'N', 'H', 'A', 'L']),
    tiers: new Set(), // empty = ALL tiers
    cpMin: null, // null = full lower bound in multi-level mode
    cpMax: null, // null = full upper bound in multi-level mode
    selectedVers: new Set(), // empty = ALL versions
    verPanelOpen: false,
    mobileFiltersOpen: false,
    gauge: 'hc',
    scope: 'ac',
    view: 'board',
    multiBoardGroup: 'level', // 'level' | 'cp'
    expandedGroups: new Set(),
    tag: 'ALL',
    tagByMode: { sp: 'ALL', dp: 'ALL' },
    spOpt: 'ALL',
    dpOpt: 'ALL',
    lampFilter: 'ALL',
    search: '',
    selectedId: null,
    sortCol: 's_hc',
    sortDir: -1,
    tablePage: 1,
    tablePageSize: 100,

    // CSV Analyzer state
    csvRawText: null,
    csvFilename: null,
    csvMode: 'sp',
    csvParsed: null,
    csvReport: null,
    csvSectionTab: 'overview', // 'overview' | 'grip' | 'coach' | 'lamps' | 'songs'
    csvTargetGauge: 'nc',
    csvTargetGaugeManual: false,
    csvTargetLevel: 0, // 0 = auto
    csvCoachTab: 'quick', // 'quick' | 'weak' | 'core' | 'outliers'
    csvTableLevels: new Set(), // empty = ALL played levels
    csvTableLevelMulti: false,
    csvTableDiffs: new Set(['B', 'N', 'H', 'A', 'L']),
    csvTableLamps: new Set(), // empty = ALL lamps ('FC'|'EXHC'|'HC'|'NC'|'EC'|'AC'|'FAILED')
    csvTableDjs: new Set(), // empty = ALL DJ ranks ('AAA'..'F'|'NONE')
    csvTableMobileFiltersOpen: false,
    csvTableExMin: '',
    csvTableExMax: '',
    csvTableBpMin: '',
    csvTableBpMax: '',
    csvTableSearch: '',
    csvTableSortCol: 'lv', // 'lv' | 'title' | 'lamp' | 'dj' | 'score' | 'exRate' | 'bp' | 'cp' | 'lastPlayed'
    csvTableSortDir: -1,
    csvTablePage: 1,
    csvTablePageSize: 100,
    csvSnapshots: [],
    csvSnapshotsLoaded: false,
    csvActiveSnapshotId: null,
    csvHistBaseId: null,
    csvHistTargetId: null,
    csvHistFilter: 'all', // 'all' | 'lampUp' | 'newPlay' | 'scoreUp' | 'bpDown' | 'djUp'
    csvHistLevel: 0, // 0 = all
    csvHistSort: 'impact', // 'impact' | 'lv' | 'scoreDelta' | 'bpDelta' | 'title'
    csvHistSearch: '',
    csvHistPage: 1,
    csvHistSongKey: null,
    csvHistSongFk: null,
    csvHistSongQuery: '',
    csvHistNotice: null,
    csvError: null,
  };

  const DJ_RANK_VAL = { AAA: 8, AA: 7, A: 6, B: 5, C: 4, D: 3, E: 2, F: 1 };
  function getDjRankVal(dj) {
    return DJ_RANK_VAL[String(dj || '').toUpperCase()] || 0;
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const LAMP_LEGEND_ITEMS = [
    { key: 'fc',   countKey: 'FC',     label: 'FC',     title: 'FULLCOMBO（黄蓝白三色彩灯）' },
    { key: 'exhc', countKey: 'EXHC',   label: 'EXHC',   title: 'EX HARD（红黄交替闪）' },
    { key: 'hc',   countKey: 'HC',     label: 'HC',     title: 'HARD（纯白灯）' },
    { key: 'nc',   countKey: 'NC',     label: 'NC',     title: 'CLEAR（蓝灯）' },
    { key: 'ec',   countKey: 'EC',     label: 'EC',     title: 'EASY CLEAR（绿灯）' },
    { key: 'ac',   countKey: 'ASSIST', label: 'AC',     title: 'ASSIST CLEAR（紫灯）' },
    { key: 'f',    countKey: 'FAILED', label: 'FAILED', title: 'FAILED（红灯）' },
  ];

  function renderLampBadge(lampMeta, opts) {
    if (!lampMeta) return '';
    const k = lampMeta.key || 'f';
    const text = (opts && opts.full) ? lampMeta.label : lampMeta.short;
    const extraStyle = (opts && opts.style) ? ` style="${opts.style}"` : '';
    const showDot = k === 'fc' || k === 'exhc' || k === 'hc';
    return `<span class="lamp-badge lamp-badge-${k}"${extraStyle}>${showDot ? `<span class="lamp-dot lamp-${k}"></span>` : ''}${esc(text)}</span>`;
  }

  function tierCls(t) { return 'tier-' + String(t || 'D').replace('+', 'p'); }
  function tierPillCls(t) { return 'tp-' + String(t || 'D').replace('+', 'p'); }

  function buildPracticeUrl(c) {
    if (!c || c.mode !== 'sp') return null;
    const url = new URL(PRACTICE_BASE_URL);
    url.searchParams.set('song', c.title);
    url.searchParams.set('chart', c.diff);
    // Always pass canonical 1P Textage URL (?1P/1N/1H/1A/1X...) so iidx-play.cee.ee's
    // matchServerChart() & textageExtract() (1P scratch at left:0) auto-import cleanly.
    const textage1p = (c._1p && c._1p.url) || c.url;
    let hasDirectTextage = false;
    try {
      const parsed = new URL(textage1p);
      if (PRACTICE_TEXTAGE_PATH_RE.test(parsed.pathname)) {
        url.searchParams.set('textage', textage1p);
        hasDirectTextage = true;
      }
    } catch (_) {}
    const title = hasDirectTextage
      ? '在 iidx-play.cee.ee 自动载入此 SP 谱面（若已有共享视频/偏移配置将自动恢复；固定传入 1P 源谱面，2P 玩家可在练习页切换右皿）'
      : '在 iidx-play.cee.ee 带入曲名与难度（substream /score/s/ 暂不支持代理自动抓取，可在 Textage 页使用导入书签）';
    return { href: url.href, hasDirectTextage, title };
  }

  function renderPracticeLink(c, compact) {
    const info = buildPracticeUrl(c);
    if (!info) return '';
    if (compact) {
      return `<a href="${esc(info.href)}" target="_blank" rel="noopener" class="rec-play-link" title="${esc(info.title)}">练习 ↗</a>`;
    }
    return `<a href="${esc(info.href)}" target="_blank" rel="noopener" class="btn btn-sm btn-practice" title="${esc(info.title)}">去 iidx-play 练习 ↗</a>`;
  }

  function resetCpRange() {
    state.cpMin = null;
    state.cpMax = null;
  }

  function activeExplorerMode() {
    return state.tab === 'dp' ? 'dp' : 'sp';
  }

  function sanitizeLevels(arr) {
    if (!Array.isArray(arr)) return null;
    const set = new Set();
    for (const v of arr) {
      const n = Number(v);
      if (Number.isInteger(n) && n >= 1 && n <= 12) set.add(n);
    }
    if (!set.size) return null;
    return [...set].sort((a, b) => a - b);
  }

  function getCsvFocusLevels(rep) {
    const focus = sanitizeLevels(rep?.focusLevels);
    if (focus) return focus;
    const prim = Number(rep?.primaryLevel);
    if (Number.isInteger(prim) && prim >= 1 && prim <= 12) return [prim];
    return [12];
  }

  function persistUiPrefs() {
    if (!prefsRestored) return;
    try {
      const verCodes = [...state.selectedVers]
        .map((idx) => VER_INFO[idx]?.code)
        .filter(Boolean);
      const levelsPayload = {
        sp: {
          levels: [...state.levelsByMode.sp].sort((a, b) => a - b),
          source: state.levelsSourceByMode.sp,
        },
        dp: {
          levels: [...state.levelsByMode.dp].sort((a, b) => a - b),
          source: state.levelsSourceByMode.dp,
        },
        levelMulti: !!state.levelMulti,
      };
      const uiPayload = {
        v: 1,
        tab: state.tab,
        lastExplorerMode: state.lastExplorerMode,
        gauge: state.gauge,
        scope: state.scope,
        view: state.view,
        diffs: [...state.diffs],
        tiers: [...state.tiers],
        verCodes,
        multiBoardGroup: state.multiBoardGroup,
        cpMin: state.cpMin,
        cpMax: state.cpMax,
        tagByMode: { sp: state.tagByMode.sp, dp: state.tagByMode.dp },
        spOpt: state.spOpt,
        dpOpt: state.dpOpt,
        lampFilter: state.lampFilter,
        sortCol: state.sortCol,
        sortDir: state.sortDir,
        csvSectionTab: state.csvSectionTab,
        csvCoachTab: state.csvCoachTab,
        csvTargetGauge: state.csvTargetGauge,
        csvTargetGaugeManual: !!state.csvTargetGaugeManual,
        csvTargetLevel: state.csvTargetLevel,
        csvTableLevels: [...state.csvTableLevels].sort((a, b) => a - b),
        csvTableLevelMulti: !!state.csvTableLevelMulti,
        csvTableDiffs: [...state.csvTableDiffs],
        csvTableLamps: [...state.csvTableLamps],
        csvTableDjs: [...state.csvTableDjs],
        csvTableExMin: state.csvTableExMin,
        csvTableExMax: state.csvTableExMax,
        csvTableBpMin: state.csvTableBpMin,
        csvTableBpMax: state.csvTableBpMax,
        csvTableSortCol: state.csvTableSortCol,
        csvTableSortDir: state.csvTableSortDir,
        csvHistFilter: state.csvHistFilter,
        csvHistLevel: state.csvHistLevel,
        csvHistSort: state.csvHistSort,
        levelsByMode: { sp: levelsPayload.sp, dp: levelsPayload.dp },
        levelMulti: levelsPayload.levelMulti,
      };
      localStorage.setItem(UI_PREFS_STORAGE_KEY, JSON.stringify(uiPayload));
      localStorage.setItem(LEVELS_STORAGE_KEY, JSON.stringify(levelsPayload));
    } catch (_) {}
  }

  function persistLevelPrefs() {
    persistUiPrefs();
  }

  function applySavedLevelsObj(levelsObj, fallbackMulti) {
    if (!levelsObj || typeof levelsObj !== 'object') return;
    for (const m of ['sp', 'dp']) {
      const entry = levelsObj[m];
      const lvs = sanitizeLevels(Array.isArray(entry) ? entry : entry?.levels);
      if (lvs) {
        state.levelsByMode[m] = new Set(lvs);
        state.levelsSourceByMode[m] = (entry && (entry.source === 'user' || entry.source === 'csv')) ? entry.source : 'user';
      }
    }
    if (typeof fallbackMulti === 'boolean') {
      state.levelMulti = fallbackMulti;
    }
  }

  function loadUiPrefs() {
    const validGauges = new Set(['ec', 'nc', 'hc', 'exhc']);
    const validViews = new Set(['board', 'table', 'delta', 'opt']);
    const validDiffs = new Set(DIFF_LET);
    const validTiers = new Set(TIER_ORDER_12);
    const validCsvSec = new Set(['overview', 'grip', 'coach', 'lamps', 'songs', 'history']);
    const validCoachTab = new Set(['quick', 'weak', 'core', 'outliers']);
    const validCsvSort = new Set(['lv', 'title', 'lamp', 'dj', 'score', 'exRate', 'bp', 'cp', 'lastPlayed']);
    const validCsvLamps = new Set(['FC', 'EXHC', 'HC', 'NC', 'EC', 'AC', 'FAILED']);
    const validCsvDjs = new Set(['AAA', 'AA', 'A', 'B', 'C', 'D', 'E', 'F', 'NONE']);
    const validHistFilter = new Set(['all', 'lampUp', 'newPlay', 'scoreUp', 'bpDown', 'djUp']);
    const validHistSort = new Set(['impact', 'lv', 'scoreDelta', 'bpDelta', 'title']);
    const hasExplicitHash = location.hash === '#sp' || location.hash === '#dp' || location.hash === '#csv';

    // Backward-compatible legacy level prefs fallback
    try {
      const legacyLvRaw = localStorage.getItem(LEVELS_STORAGE_KEY);
      if (legacyLvRaw) {
        const legacyObj = JSON.parse(legacyLvRaw);
        applySavedLevelsObj(legacyObj, legacyObj?.levelMulti);
      }
    } catch (_) {}

    try {
      const raw = localStorage.getItem(UI_PREFS_STORAGE_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return;

      if (!hasExplicitHash && (obj.tab === 'sp' || obj.tab === 'dp' || obj.tab === 'csv')) {
        state.tab = obj.tab;
      }
      if (obj.lastExplorerMode === 'sp' || obj.lastExplorerMode === 'dp') {
        state.lastExplorerMode = obj.lastExplorerMode;
      }
      if (validGauges.has(obj.gauge)) {
        state.gauge = obj.gauge;
        state.sortCol = 's_' + obj.gauge;
      }
      if (obj.scope === 'ac' || obj.scope === 'all') {
        state.scope = obj.scope;
      }
      if (validViews.has(obj.view)) {
        state.view = obj.view;
      }
      if (Array.isArray(obj.diffs)) {
        const cleanDiffs = obj.diffs.filter((d) => validDiffs.has(d));
        if (cleanDiffs.length) state.diffs = new Set(cleanDiffs);
      }
      if (Array.isArray(obj.tiers)) {
        state.tiers = new Set(obj.tiers.filter((t) => validTiers.has(t)));
      }
      if (Array.isArray(obj.verCodes) && VER_INFO.length) {
        const codeSet = new Set(obj.verCodes);
        const idxs = new Set();
        for (const v of VER_INFO) {
          if (codeSet.has(v.code)) idxs.add(v.idx);
        }
        state.selectedVers = idxs;
      }
      if (obj.multiBoardGroup === 'level' || obj.multiBoardGroup === 'cp') {
        state.multiBoardGroup = obj.multiBoardGroup;
      }
      state.cpMin = (typeof obj.cpMin === 'number' && Number.isFinite(obj.cpMin)) ? obj.cpMin : null;
      state.cpMax = (typeof obj.cpMax === 'number' && Number.isFinite(obj.cpMax)) ? obj.cpMax : null;
      if (obj.tagByMode && typeof obj.tagByMode === 'object') {
        if (typeof obj.tagByMode.sp === 'string') state.tagByMode.sp = obj.tagByMode.sp;
        if (typeof obj.tagByMode.dp === 'string') state.tagByMode.dp = obj.tagByMode.dp;
      }
      if (typeof obj.spOpt === 'string') state.spOpt = obj.spOpt;
      if (typeof obj.dpOpt === 'string') state.dpOpt = obj.dpOpt;
      if (typeof obj.lampFilter === 'string') state.lampFilter = obj.lampFilter;
      if (typeof obj.sortCol === 'string' && obj.sortCol.trim()) state.sortCol = obj.sortCol;
      if (obj.sortDir === 1 || obj.sortDir === -1) state.sortDir = obj.sortDir;
      if (validCsvSec.has(obj.csvSectionTab)) state.csvSectionTab = obj.csvSectionTab;
      if (validCoachTab.has(obj.csvCoachTab)) state.csvCoachTab = obj.csvCoachTab;
      if (validGauges.has(obj.csvTargetGauge)) state.csvTargetGauge = obj.csvTargetGauge;
      if (typeof obj.csvTargetGaugeManual === 'boolean') state.csvTargetGaugeManual = obj.csvTargetGaugeManual;
      if (Number.isInteger(obj.csvTargetLevel) && obj.csvTargetLevel >= 0 && obj.csvTargetLevel <= 12) {
        state.csvTargetLevel = obj.csvTargetLevel;
      }
      if (Array.isArray(obj.csvTableLevels)) {
        const clean = sanitizeLevels(obj.csvTableLevels);
        state.csvTableLevels = clean ? new Set(clean) : new Set();
      }
      if (typeof obj.csvTableLevelMulti === 'boolean') state.csvTableLevelMulti = obj.csvTableLevelMulti;
      if (Array.isArray(obj.csvTableDiffs)) {
        const cleanDiffs = obj.csvTableDiffs.filter((d) => validDiffs.has(d));
        if (cleanDiffs.length) state.csvTableDiffs = new Set(cleanDiffs);
      }
      if (Array.isArray(obj.csvTableLamps)) {
        state.csvTableLamps = new Set(obj.csvTableLamps.filter((l) => validCsvLamps.has(l)));
      }
      if (Array.isArray(obj.csvTableDjs)) {
        state.csvTableDjs = new Set(obj.csvTableDjs.filter((d) => validCsvDjs.has(d)));
      }
      if (typeof obj.csvTableExMin === 'string') state.csvTableExMin = obj.csvTableExMin;
      if (typeof obj.csvTableExMax === 'string') state.csvTableExMax = obj.csvTableExMax;
      if (typeof obj.csvTableBpMin === 'string') state.csvTableBpMin = obj.csvTableBpMin;
      if (typeof obj.csvTableBpMax === 'string') state.csvTableBpMax = obj.csvTableBpMax;
      if (validCsvSort.has(obj.csvTableSortCol)) state.csvTableSortCol = obj.csvTableSortCol;
      if (obj.csvTableSortDir === 1 || obj.csvTableSortDir === -1) state.csvTableSortDir = obj.csvTableSortDir;
      if (validHistFilter.has(obj.csvHistFilter)) state.csvHistFilter = obj.csvHistFilter;
      if (Number.isInteger(obj.csvHistLevel) && obj.csvHistLevel >= 0 && obj.csvHistLevel <= 12) {
        state.csvHistLevel = obj.csvHistLevel;
      }
      if (validHistSort.has(obj.csvHistSort)) state.csvHistSort = obj.csvHistSort;
      if (obj.levelsByMode) {
        applySavedLevelsObj(obj.levelsByMode, obj.levelMulti);
      } else if (typeof obj.levelMulti === 'boolean') {
        state.levelMulti = obj.levelMulti;
      }
    } catch (_) {}
  }

  function setModeLevels(mode, levelsIterable, source = 'user', save = true) {
    const m = mode === 'dp' ? 'dp' : 'sp';
    const clean = sanitizeLevels([...levelsIterable]) || [12];
    state.levelsByMode[m] = new Set(clean);
    state.levelsSourceByMode[m] = source;
    if (activeExplorerMode() === m) {
      state.levels = new Set(clean);
    }
    if (save) persistUiPrefs();
  }

  function getUserRecord(mode, chartId) {
    if (!state.csvReport || state.csvReport.mode !== mode) return null;
    return state.csvReport.recordMap.get(chartId) || null;
  }

  function unpackCharts(rawArr, mode) {
    const pref = mode === 'sp' ? 'SP' : 'DP';
    const tiers = P.tiers;
    return rawArr.map((a) => {
      const s = P.songs[a[0]];
      const dChar = DIFF_LET[a[1]];
      const diff = pref + dChar;
      const verIdx = s[1];
      const obj = {
        mode,
        id: s[0] + '_' + diff,
        tag: s[0],
        verIdx,
        verCode: (P.verCodes && P.verCodes[verIdx]) || '',
        ver: P.vers[verIdx],
        title: s[2],
        artist: s[3],
        diff,
        dChar,
        lv: a[2],
        ac: a[3] === 1,
        bpm: a[4],
        notes: a[5],
        time: a[6],
        avgNps: a[7] / 10,
        peakNps: a[8] / 10,
        kj: a[9] === 1,
        tags: a[10].map((idx) => P.tags[idx]),
        bestOpt: P.opts[a[11]],
        tier_ec: tiers[a[12]], rate_ec: a[13] / 100, s_ec: a[14] / 10,
        tier_nc: tiers[a[15]], rate_nc: a[16] / 100, s_nc: a[17] / 10,
        tier_hc: tiers[a[18]], rate_hc: a[19] / 100, s_hc: a[20] / 10,
        tier_exhc: tiers[a[21]], rate_exhc: a[22] / 100, s_exhc: a[23] / 10,
        lastKill: a[24] / 100,
        spike: a[25] / 100,
        radar: a[26],
        url: BASE_URL + a[27],
        curve: a[28],
      };
      if (mode === 'dp') {
        obj.optShort = P.optShorts[a[29]];
        obj.fixedOpt = P.opts[a[30]];
        obj.optGain = a[31] / 1000;
        obj.optReason = P.optReasons[a[32]];
        obj.p1Notes = a[33];
        obj.p2Notes = a[34];
      } else {
        const url1p = obj.url;
        const url2p = url1p.replace(/\?1/, '?2');
        const p1 = a.length > 29 ? {
          bestOpt: obj.bestOpt,
          optShort: P.optShorts[a[29]],
          fixedOpt: P.opts[a[30]],
          optGain: a[31] / 1000,
          optReason: P.optReasons[a[32]],
          leftNotes: a[33],
          rightNotes: a[34],
          url: url1p,
        } : {
          bestOpt: '正規 (-)',
          optShort: '-',
          fixedOpt: '正規 (-)',
          optGain: 0,
          optReason: '正規手型与皿键分配均衡',
          leftNotes: 0,
          rightNotes: 0,
          url: url1p,
        };
        const p2 = a.length > 35 ? {
          bestOpt: P.opts[a[35]],
          optShort: P.optShorts[a[36]],
          fixedOpt: P.opts[a[37]],
          optGain: a[38] / 1000,
          optReason: P.optReasons[a[39]],
          leftNotes: a[40],
          rightNotes: a[41],
          url: url2p,
        } : { ...p1, url: url2p };
        obj._1p = p1;
        obj._2p = p2;
        applySpSideToChart(obj, state.spSide);
      }
      return obj;
    });
  }

  function applySpSideToChart(c, side) {
    const src = side === '2p' ? c._2p : c._1p;
    if (!src) return;
    c.bestOpt = src.bestOpt;
    c.optShort = src.optShort;
    c.fixedOpt = src.fixedOpt;
    c.optGain = src.optGain;
    c.optReason = src.optReason;
    c.leftNotes = src.leftNotes;
    c.rightNotes = src.rightNotes;
    c.url = src.url;
  }

  function applySpSide() {
    for (const c of DATASETS.sp) applySpSideToChart(c, state.spSide);
  }

  function setSpSide(nextSide) {
    const normalized = nextSide === '2p' ? '2p' : '1p';
    if (state.spSide === normalized) return;
    state.spSide = normalized;
    try { localStorage.setItem(SP_SIDE_STORAGE_KEY, normalized); } catch (_) {}
    applySpSide();
    if (state.csvReport && state.csvReport.mode === 'sp' && window.IIDXCsvAnalyzer?.buildCsvGripCoaching) {
      state.csvReport.gripCoach = window.IIDXCsvAnalyzer.buildCsvGripCoaching(state.csvReport, state.spStyle, state.spSide);
    }
    state.tablePage = 1;
    renderAll();
  }

  function setSpStyle(nextStyle, opts) {
    const styles = window.IIDXCsvAnalyzer?.SP_GRIP_STYLES;
    const normalized = (styles && styles[nextStyle]) ? nextStyle : '1048';
    if (state.spStyle === normalized) return;
    state.spStyle = normalized;
    try { localStorage.setItem(SP_STYLE_STORAGE_KEY, normalized); } catch (_) {}
    if (state.csvReport && state.csvReport.mode === 'sp' && window.IIDXCsvAnalyzer?.buildCsvGripCoaching) {
      state.csvReport.gripCoach = window.IIDXCsvAnalyzer.buildCsvGripCoaching(state.csvReport, state.spStyle, state.spSide);
    }
    if (opts && opts.modalMode && opts.modalChartId) {
      openChartModal(opts.modalMode, opts.modalChartId);
      if (state.tab === 'csv') renderCsvWorkspace();
      else renderInspector();
      return;
    }
    renderAll();
  }

  function matchSpOptFilter(c, f) {
    if (f === 'ALL') return true;
    const o = c.optShort || '-';
    if (f === 'NONREG') return o !== '-';
    return o === f;
  }

  function matchDpOptFilter(c, f) {
    if (f === 'ALL') return true;
    const o = c.optShort || '-';
    if (f === 'NONREG') return o !== '-';
    if (f === 'FLIP') return o.startsWith('F');
    if (f === 'RR') return o.includes('RR');
    if (f === 'RAN') return o.includes('R') && !o.includes('RR') && !o.includes('SR');
    if (f === 'SR') return o.includes('SR');
    return o === f;
  }

  function matchLampFilter(c, rec, f) {
    if (f === 'ALL') return true;
    const r = rec ? rec.lampRank : 0;
    if (f === 'PLAYED') return r >= 1;
    if (f === 'UNPLAYED') return r === 0;
    if (f === 'FAILED_ONLY') return r === 1;
    if (f === 'BELOW_NC') return r >= 1 && r <= 3;
    if (f === 'NC_PLUS') return r >= 4;
    if (f === 'HC_PLUS') return r >= 5;
    return true;
  }

  function getPreTierFiltered() {
    const mode = activeExplorerMode();
    const list = DATASETS[mode];
    const q = state.search.trim().toLowerCase();
    const hasVerFilter = state.selectedVers.size > 0;
    const hasLampData = !!(state.csvReport && state.csvReport.mode === mode);

    return list.filter((c) => {
      if (!state.levels.has(c.lv)) return false;
      if (!state.diffs.has(c.dChar)) return false;
      if (state.scope === 'ac' && !c.ac) return false;
      if (hasVerFilter && !state.selectedVers.has(c.verIdx)) return false;
      if (mode === 'sp' && !matchSpOptFilter(c, state.spOpt)) return false;
      if (mode === 'dp' && !matchDpOptFilter(c, state.dpOpt)) return false;
      if (hasLampData && state.lampFilter !== 'ALL') {
        const rec = state.csvReport.recordMap.get(c.id);
        if (!matchLampFilter(c, rec, state.lampFilter)) return false;
      }
      if (state.tag === 'JIRIKI' && c.kj) return false;
      else if (state.tag === 'KOJINSA' && !c.kj) return false;
      else if (state.tag === 'OPT_EFF' && (c.optGain || 0) < 0.04) return false;
      else if (state.tag !== 'ALL' && state.tag !== 'JIRIKI' && state.tag !== 'KOJINSA' && state.tag !== 'OPT_EFF') {
        if (!c.tags.includes(state.tag)) return false;
      }
      if (q) {
        const hay = (c.title + ' ' + c.artist + ' ' + c.ver + ' ' + c.verCode + ' ' + c.diff + ' ' + (c.optShort || '') + ' ' + (c.bestOpt || '')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function getValidTierOrder() {
    if (state.levels.has(12)) return TIER_ORDER_12;
    for (const lv of state.levels) {
      if (lv >= 8) return TIER_ORDER_MID;
    }
    return TIER_ORDER_LOW;
  }

  function applyTierFilter(list) {
    if (state.tiers.size === 0) return list;
    const tKey = 'tier_' + state.gauge;
    return list.filter((c) => state.tiers.has(c[tKey]));
  }

  function applyCpRangeFilter(list) {
    if (state.levels.size <= 1) return list;
    if (state.cpMin === null && state.cpMax === null) return list;
    const sKey = 's_' + state.gauge;
    const lo = state.cpMin !== null ? state.cpMin - 1e-6 : -Infinity;
    const hi = state.cpMax !== null ? state.cpMax + 1e-6 : Infinity;
    return list.filter((c) => c[sKey] >= lo && c[sKey] <= hi);
  }

  function describeSelectedLevels() {
    const arr = [...state.levels].sort((a, b) => a - b);
    if (arr.length === 12) return '全部 ★1–★12';
    if (arr.length === 1) return `★${arr[0]}`;
    // Detect contiguous range
    if (arr.length >= 3 && arr[arr.length - 1] - arr[0] === arr.length - 1) {
      return `★${arr[0]}–★${arr[arr.length - 1]}`;
    }
    return arr.map((x) => `★${x}`).join('·');
  }

  function syncNavChrome() {
    const isSp = state.tab === 'sp';
    const isDp = state.tab === 'dp';
    const isCsv = state.tab === 'csv';
    const showSpSide = isSp || (isCsv && (!state.csvReport || state.csvReport.mode === 'sp'));

    document.getElementById('mode-sp').className = 'mode-tab' + (isSp ? ' active-sp' : '');
    document.getElementById('mode-dp').className = 'mode-tab' + (isDp ? ' active-dp' : '');
    document.getElementById('mode-csv').className = 'mode-tab' + (isCsv ? ' active-csv' : '');

    document.getElementById('app-root').classList.toggle('dp-theme', isDp);
    document.getElementById('explorer-workspace').classList.toggle('hidden', isCsv);
    document.getElementById('csv-workspace').classList.toggle('hidden', !isCsv);
    document.getElementById('scope-group').classList.toggle('hidden', isCsv);

    const spSideGrp = document.getElementById('sp-side-group');
    if (spSideGrp) {
      spSideGrp.classList.toggle('hidden', !showSpSide);
      document.getElementById('btn-sp-1p').className = 'seg-btn' + (state.spSide === '1p' ? ' active' : '');
      document.getElementById('btn-sp-2p').className = 'seg-btn' + (state.spSide === '2p' ? ' active' : '');
    }

    const csvBadge = document.getElementById('nav-csv-cnt');
    if (state.csvReport) {
      csvBadge.textContent = `${state.csvReport.mode.toUpperCase()} · ${state.csvReport.playedCount}谱`;
    } else {
      csvBadge.textContent = '未导入';
    }

    document.getElementById('btn-scope-ac').className = 'seg-btn' + (state.scope === 'ac' ? ' active' : '');
    document.getElementById('btn-scope-all').className = 'seg-btn' + (state.scope === 'all' ? ' active' : '');
  }

  function syncMobileFilterButton() {
    const mode = activeExplorerMode();
    const hdr = document.getElementById('explorer-header');
    const btn = document.getElementById('btn-mobile-filters');
    if (!hdr || !btn) return;
    let activeCnt = 0;
    if (state.diffs.size < 5) activeCnt++;
    if (state.selectedVers.size > 0) activeCnt++;
    if (state.csvReport && state.csvReport.mode === mode && state.lampFilter !== 'ALL') activeCnt++;
    if ((mode === 'sp' ? state.spOpt : state.dpOpt) !== 'ALL') activeCnt++;
    if (state.tag !== 'ALL') activeCnt++;

    hdr.classList.toggle('mobile-filters-open', state.mobileFiltersOpen);
    btn.classList.toggle('has-active', activeCnt > 0 || state.mobileFiltersOpen);
    btn.setAttribute('aria-expanded', state.mobileFiltersOpen ? 'true' : 'false');
    btn.textContent = `筛选${activeCnt > 0 ? ` (${activeCnt})` : ''} ${state.mobileFiltersOpen ? '▴' : '▾'}`;
  }

  function syncExplorerChrome() {
    const mode = activeExplorerMode();
    const isDp = mode === 'dp';
    const sideLabel = state.spSide === '2p' ? '2P 右皿' : '1P 左皿';

    document.getElementById('page-title').innerHTML = isDp
      ? '<span class="lbl-full">Beatmania IIDX DP 全谱面 EC / NC / HC / EXHC 难度表</span><span class="lbl-short">DP 物理难度表</span> <span class="ver-tag dp">DP v7 · 14K+双皿·合法多选项</span>'
      : `<span class="lbl-full">Beatmania IIDX SP 全谱面 EC / NC / HC / EXHC 难度表</span><span class="lbl-short">SP 物理难度表</span> <span class="ver-tag">SP v8 · ${sideLabel} · 官方AC四血条·多选项减负</span>`;

    document.getElementById('page-desc').innerHTML = isDp
      ? `Textage.cc 全量 DP 谱面（共 <b>${P.meta.dpTotal.toLocaleString()}</b> 谱 / AC 在库 <b>${P.meta.dpAc.toLocaleString()}</b> 谱）· 支持难度全选/多选、分档筛选、历代版本筛选、AC 标准 DP 选项求解与 Konami CSV 个人清灯叠加。`
      : `Textage.cc 全量 SP 谱面（共 <b>${P.meta.spTotal.toLocaleString()}</b> 谱 / AC 在库 <b>${P.meta.spAc.toLocaleString()}</b> 谱）· 当前为 <b>${sideLabel}</b> 视角，支持 1P/2P 切换、分档与跨级 CP 细选、SP 多选项减负与一键导入 <b>iidx-play.cee.ee</b> 练习。`;

    const optBtn = document.getElementById('v-btn-opt');
    optBtn.innerHTML = `<span class="lbl-full">${isDp ? 'DP 选项减负榜' : 'SP 选项减负榜'}</span><span class="lbl-short">选项榜</span>`;
    const spOptSel = document.getElementById('sp-opt-filter');
    const dpOptSel = document.getElementById('dp-opt-filter');
    spOptSel.classList.toggle('hidden', isDp);
    dpOptSel.classList.toggle('hidden', !isDp);
    spOptSel.value = state.spOpt;
    if (spOptSel.selectedIndex < 0) { state.spOpt = 'ALL'; spOptSel.value = 'ALL'; }
    dpOptSel.value = state.dpOpt;
    if (dpOptSel.selectedIndex < 0) { state.dpOpt = 'ALL'; dpOptSel.value = 'ALL'; }

    const hasLampData = !!(state.csvReport && state.csvReport.mode === mode);
    const lampSel = document.getElementById('lamp-filter');
    lampSel.classList.toggle('hidden', !hasLampData);
    lampSel.value = state.lampFilter;
    if (lampSel.selectedIndex < 0) { state.lampFilter = 'ALL'; lampSel.value = 'ALL'; }

    const sel = document.getElementById('tag-filter');
    state.tag = state.tagByMode[mode] || 'ALL';
    sel.innerHTML = TAG_OPTS[mode].map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    sel.value = state.tag;
    if (sel.selectedIndex < 0) {
      state.tag = 'ALL';
      state.tagByMode[mode] = 'ALL';
      sel.value = 'ALL';
    }

    document.querySelectorAll('.v-btn').forEach((b) => {
      b.className = 'v-btn' + (b.dataset.v === state.view ? ' active' : '');
    });
    syncMobileFilterButton();
  }

  let lastCenteredLvKey = '';
  function renderLevelAndDiffBars() {
    const mode = activeExplorerMode();
    const list = DATASETS[mode];
    const hasVerFilter = state.selectedVers.size > 0;

    // Count charts per level under current scope, diffs & version filter
    const countsByLv = new Array(13).fill(0);
    let totalAcrossAll = 0;
    for (const c of list) {
      if (state.scope === 'ac' && !c.ac) continue;
      if (!state.diffs.has(c.dChar)) continue;
      if (hasVerFilter && !state.selectedVers.has(c.verIdx)) continue;
      countsByLv[c.lv]++;
      totalAcrossAll++;
    }

    const isAllSelected = state.levels.size === 12;
    let html = `<button id="btn-lv-all" type="button" class="lv-btn all-btn mono ${isAllSelected ? 'active' : ''}">全选 ★1–12 <span class="lv-cnt">(${totalAcrossAll})</span></button>`;
    for (let lv = 1; lv <= 12; lv++) {
      const active = !isAllSelected && state.levels.has(lv);
      const allHighlight = isAllSelected ? 'active' : (active ? 'active' : '');
      html += `<button data-lv="${lv}" type="button" class="lv-btn mono ${allHighlight}" title="点击单选；开启多选或按住 Shift 可组合多等级">★${lv}<span class="lv-cnt">(${countsByLv[lv]})</span></button>`;
    }
    html += `<button id="btn-lv-multi" type="button" class="lv-btn multi-toggle ${state.levelMulti ? 'active' : ''}" title="开启后可点击任意多个等级组合查看">${state.levelMulti ? '多选: 开' : '+ 多选'}</button>`;

    const bar = document.getElementById('level-bar');
    const prevScrollLeft = bar.scrollLeft;
    bar.innerHTML = html;

    if (mobileSmallMQ.matches) {
      const sortedLvs = [...state.levels].sort((a, b) => a - b);
      const lvKey = isAllSelected ? 'all' : `lvs_${sortedLvs.join('_')}`;
      if (lvKey !== lastCenteredLvKey) {
        lastCenteredLvKey = lvKey;
        const midLv = sortedLvs[Math.floor(sortedLvs.length / 2)];
        const targetBtn = isAllSelected
          ? document.getElementById('btn-lv-all')
          : bar.querySelector(`[data-lv="${midLv}"]`);
        if (targetBtn) {
          bar.scrollLeft = Math.max(0, targetBtn.offsetLeft - (bar.clientWidth - targetBtn.offsetWidth) / 2);
        }
      } else {
        bar.scrollLeft = prevScrollLeft;
      }
    }

    document.getElementById('btn-lv-all').addEventListener('click', () => {
      if (state.levels.size === 12) {
        const fallback = (state.csvReport && state.csvReport.mode === mode)
          ? getCsvFocusLevels(state.csvReport)
          : [12];
        setModeLevels(mode, fallback, 'user');
      } else {
        setModeLevels(mode, ALL_LEVELS, 'user');
      }
      resetCpRange();
      state.selectedId = null;
      state.tablePage = 1;
      state.expandedGroups.clear();
      renderAll();
    });

    document.getElementById('btn-lv-multi').addEventListener('click', () => {
      state.levelMulti = !state.levelMulti;
      persistLevelPrefs();
      renderLevelAndDiffBars();
    });

    bar.querySelectorAll('[data-lv]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const lv = Number(btn.dataset.lv);
        let nextSet = new Set(state.levels);
        if (state.levelMulti || e.shiftKey || e.ctrlKey || e.metaKey) {
          if (nextSet.size === 12 && !state.levelMulti) {
            nextSet = new Set([lv]);
          } else if (nextSet.has(lv)) {
            if (nextSet.size > 1) nextSet.delete(lv);
          } else {
            nextSet.add(lv);
          }
        } else {
          nextSet = new Set([lv]);
        }
        setModeLevels(mode, nextSet, 'user');
        resetCpRange();
        state.selectedId = null;
        state.tablePage = 1;
        state.expandedGroups.clear();
        renderAll();
      });
    });

    // Difficulty type filter pills (B/N/H/A/L)
    const allDiffsOn = state.diffs.size === 5;
    const diffBar = document.getElementById('diff-bar');
    const diffNames = { B: 'B', N: 'N', H: 'H', A: 'A', L: 'L†' };
    let dHtml = `<button id="btn-diff-all" type="button" class="diff-pill ${allDiffsOn ? 'active' : ''}">全难度</button>`;
    for (const d of DIFF_LET) {
      const on = state.diffs.has(d);
      dHtml += `<button data-diff="${d}" type="button" class="diff-pill ${on ? 'active' : ''}"><span class="diff-${d}">${diffNames[d]}</span></button>`;
    }
    diffBar.innerHTML = dHtml;

    document.getElementById('btn-diff-all').addEventListener('click', () => {
      state.diffs = new Set(DIFF_LET);
      state.tablePage = 1;
      renderAll();
    });
    diffBar.querySelectorAll('[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = btn.dataset.diff;
        if (state.diffs.has(d)) {
          if (state.diffs.size === 1) state.diffs = new Set(DIFF_LET);
          else state.diffs.delete(d);
        } else {
          state.diffs.add(d);
        }
        state.tablePage = 1;
        renderAll();
      });
    });
  }

  function getVerIndicesForCodes(codes) {
    if (!codes) return new Set();
    const codeSet = new Set(codes);
    const out = new Set();
    for (const v of VER_INFO) {
      if (codeSet.has(v.code)) out.add(v.idx);
    }
    return out;
  }

  function isSameSet(a, b) {
    if (a.size !== b.size) return false;
    for (const x of a) if (!b.has(x)) return false;
    return true;
  }

  function renderVersionFilter() {
    const mode = activeExplorerMode();
    const list = DATASETS[mode];

    // Live counts per version under current mode, scope, levels & diffs
    const verCounts = new Map();
    for (const c of list) {
      if (state.scope === 'ac' && !c.ac) continue;
      if (!state.levels.has(c.lv)) continue;
      if (!state.diffs.has(c.dChar)) continue;
      verCounts.set(c.verIdx, (verCounts.get(c.verIdx) || 0) + 1);
    }

    // Summary button text
    const toggleBtn = document.getElementById('btn-ver-toggle');
    let summary = `全部历代 (${VER_INFO.length}代)`;
    if (state.selectedVers.size > 0) {
      const names = [...state.selectedVers]
        .sort((a, b) => a - b)
        .map((idx) => `${VER_INFO[idx].code} ${VER_INFO[idx].name}`);
      summary = names.length <= 2
        ? `已选: ${names.join(' / ')}`
        : `已选 ${names.length} 代 (${names[0]} 等)`;
    }
    toggleBtn.textContent = `${summary} ${state.verPanelOpen ? '▴ 收起' : '▾ 按代多选'}`;

    // Era quick presets
    const eraEl = document.getElementById('era-presets');
    eraEl.innerHTML = ERA_DEFS.map((era) => {
      const targetSet = getVerIndicesForCodes(era.codes);
      const active = era.codes === null
        ? state.selectedVers.size === 0
        : isSameSet(state.selectedVers, targetSet);
      return `<button type="button" data-era="${era.key}" class="era-btn ${active ? 'active' : ''}">${era.label}</button>`;
    }).join('');

    eraEl.querySelectorAll('[data-era]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const era = ERA_DEFS.find((e) => e.key === btn.dataset.era);
        if (!era) return;
        if (era.key === 'CS' && state.scope === 'ac') {
          state.scope = 'all';
        }
        state.selectedVers = getVerIndicesForCodes(era.codes);
        state.tablePage = 1;
        state.expandedGroups.clear();
        renderAll();
      });
    });

    // Individual chronological IIDX generation grid
    const grid = document.getElementById('ver-grid-panel');
    grid.classList.toggle('hidden', !state.verPanelOpen);
    if (!state.verPanelOpen) return;

    const allSelected = state.selectedVers.size === 0;
    grid.innerHTML = VER_INFO.map((v) => {
      const cnt = verCounts.get(v.idx) || 0;
      const isSelected = !allSelected && state.selectedVers.has(v.idx);
      const dimmed = cnt === 0 ? 'dimmed' : '';
      return `
        <button type="button" data-ver="${v.idx}" class="ver-chip ${isSelected ? 'active' : ''} ${dimmed}" title="${esc(v.code + ' ' + v.name)}">
          <span class="truncate"><span class="ver-chip-num mono">${esc(v.code)}</span>${esc(v.name)}</span>
          <span class="ver-chip-cnt mono">(${cnt})</span>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('[data-ver]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.ver);
        if (VER_INFO[idx]?.code === 'CS' && state.scope === 'ac') {
          state.scope = 'all';
        }
        if (state.selectedVers.has(idx)) {
          state.selectedVers.delete(idx);
        } else {
          state.selectedVers.add(idx);
        }
        if (state.selectedVers.size === VER_INFO.length) {
          state.selectedVers.clear();
        }
        state.tablePage = 1;
        state.expandedGroups.clear();
        renderAll();
      });
    });
  }

  function renderGaugeBar() {
    document.querySelectorAll('.g-btn').forEach((btn) => {
      const g = btn.dataset.g;
      btn.className = 'g-btn' + (g === state.gauge ? ` g-${g}` : '');
    });
  }

  function renderTierFilter(preTierList) {
    const row = document.getElementById('tier-filter-row');
    if (!row) return;
    const order = getValidTierOrder();
    const orderSet = new Set(order);
    for (const t of [...state.tiers]) {
      if (!orderSet.has(t)) state.tiers.delete(t);
    }

    const tKey = 'tier_' + state.gauge;
    const counts = new Map();
    for (const t of order) counts.set(t, 0);
    for (const c of preTierList) {
      const t = c[tKey];
      if (counts.has(t)) counts.set(t, counts.get(t) + 1);
    }

    const isAll = state.tiers.size === 0;
    const gUpper = state.gauge.toUpperCase();
    const pillsHtml = [
      `<button type="button" id="btn-tier-all" class="tier-pill all-tier mono ${isAll ? 'active' : ''}">全部档位 <span class="tp-cnt">(${preTierList.length})</span></button>`,
      ...order.map((tier) => {
        const cnt = counts.get(tier) || 0;
        const on = !isAll && state.tiers.has(tier);
        const dimmed = cnt === 0 && !on ? 'dimmed' : '';
        return `<button type="button" data-tier="${tier}" class="tier-pill mono ${tierPillCls(tier)} ${on ? 'active' : ''} ${dimmed}" title="筛选 ${gUpper} ${tier} 档位（支持多选叠加）"><span class="tier-dot"></span>${tier}<span class="tp-cnt">(${cnt})</span></button>`;
      }),
    ].join('');

    const rightHtml = isAll
      ? `<span class="tier-filter-hint">点击档位可单选 / 多选叠加</span>`
      : `<span class="tier-filter-hint"><span>已选 <b class="mono" style="color:var(--ink);">${state.tiers.size}</b> 档</span><button type="button" id="btn-tier-reset" class="btn btn-sm">重置档位</button></span>`;

    row.innerHTML = `
      <span class="filter-label">${gUpper} 档位</span>
      <div class="tier-filter-pills">${pillsHtml}</div>
      ${rightHtml}
    `;

    const clearTiers = () => {
      state.tiers.clear();
      state.tablePage = 1;
      state.expandedGroups.clear();
      renderAll();
    };
    document.getElementById('btn-tier-all').addEventListener('click', clearTiers);
    const resetBtn = document.getElementById('btn-tier-reset');
    if (resetBtn) resetBtn.addEventListener('click', clearTiers);

    row.querySelectorAll('[data-tier]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.tier;
        if (state.tiers.has(t)) {
          state.tiers.delete(t);
        } else {
          state.tiers.add(t);
          if (state.tiers.size >= order.length) state.tiers.clear();
        }
        state.tablePage = 1;
        state.expandedGroups.clear();
        renderAll();
      });
    });
  }

  function getPlayerThetaForGauge() {
    const mode = activeExplorerMode();
    if (!state.csvReport || state.csvReport.mode !== mode || !state.csvReport.irt) return null;
    const irt = state.csvReport.irt;
    if (irt[state.gauge] && Number.isFinite(irt[state.gauge].theta)) {
      return { theta: irt[state.gauge].theta, gauge: state.gauge };
    }
    if (irt.nc && Number.isFinite(irt.nc.theta)) {
      return { theta: irt.nc.theta, gauge: 'nc' };
    }
    return null;
  }

  function snapHalf(v) {
    return Math.round(v * 2) / 2;
  }

  function ensureCpRangeBarDom() {
    if (cpBarReady) return;
    const bar = document.getElementById('cp-range-bar');
    if (!bar) return;
    bar.innerHTML = `
      <div class="cp-range-head">
        <div class="cp-range-meta">
          <span id="cp-range-summary"></span>
          <span id="cp-window-badge" class="cp-window-badge mono"></span>
        </div>
        <div class="seg-group" id="cp-mgrp-group" role="group" aria-label="跨级分组方式">
          <button type="button" data-mgrp="level" class="seg-btn cp-mgrp-btn">按官方等级分组 (★12→★1)</button>
          <button type="button" data-mgrp="cp" class="seg-btn cp-mgrp-btn" id="btn-mgrp-cp">按跨级 CP 区间</button>
        </div>
      </div>
      <div class="cp-slider-body">
        <label class="cp-num-box">
          <span class="cp-num-label">下限 CP</span>
          <input id="cp-num-min" class="cp-num-input mono" type="number" step="0.5" />
        </label>
        <div class="dual-range-col">
          <div id="cp-hist" class="cp-hist" aria-hidden="true"></div>
          <div class="dual-range-wrap">
            <div class="dual-range-track"></div>
            <div id="cp-range-fill" class="dual-range-fill"></div>
            <div id="cp-theta-pin" class="cp-theta-pin hidden"></div>
            <input id="cp-slider-min" class="dual-range-input" type="range" step="0.5" aria-label="跨级 CP 下限" />
            <input id="cp-slider-max" class="dual-range-input" type="range" step="0.5" aria-label="跨级 CP 上限" />
          </div>
          <div id="cp-range-ticks" class="cp-range-ticks mono"></div>
        </div>
        <label class="cp-num-box">
          <span class="cp-num-label">上限 CP</span>
          <input id="cp-num-max" class="cp-num-input mono" type="number" step="0.5" />
        </label>
      </div>
      <div class="cp-range-foot">
        <span id="cp-range-foot-note">拖动左右滑块可实时细选跨级 CP 窗口，窄区间自动加密分档步长。</span>
        <div class="cp-quick-btns">
          <button type="button" id="btn-cp-my-theta" class="btn btn-sm btn-coach hidden"></button>
          <button type="button" id="btn-cp-reset" class="btn btn-sm">重置全区间</button>
        </div>
      </div>
    `;
    cpBarReady = true;

    const minSlider = document.getElementById('cp-slider-min');
    const maxSlider = document.getElementById('cp-slider-max');
    const minNum = document.getElementById('cp-num-min');
    const maxNum = document.getElementById('cp-num-max');

    const applyRangeBounds = (rawLo, rawHi) => {
      const dMin = cpDomain.min;
      const dMax = cpDomain.max;
      let lo = Math.max(dMin, Math.min(dMax, snapHalf(rawLo)));
      let hi = Math.max(dMin, Math.min(dMax, snapHalf(rawHi)));
      if (lo > hi) { const t = lo; lo = hi; hi = t; }
      state.cpMin = lo <= dMin + 1e-6 ? null : lo;
      state.cpMax = hi >= dMax - 1e-6 ? null : hi;
      state.tablePage = 1;
      state.expandedGroups.clear();
      persistUiPrefs();
      const filtered = applyCpRangeFilter(cpDomain.preCpList);
      updateCpRangeVisuals(filtered.length);
      scheduleCpLiveUpdate();
    };

    minSlider.addEventListener('input', () => {
      const curHi = state.cpMax !== null ? state.cpMax : cpDomain.max;
      let val = Number(minSlider.value);
      if (val > curHi) {
        val = curHi;
        minSlider.value = String(val);
      }
      applyRangeBounds(val, curHi);
    });

    maxSlider.addEventListener('input', () => {
      const curLo = state.cpMin !== null ? state.cpMin : cpDomain.min;
      let val = Number(maxSlider.value);
      if (val < curLo) {
        val = curLo;
        maxSlider.value = String(val);
      }
      applyRangeBounds(curLo, val);
    });

    minNum.addEventListener('change', () => {
      const v = Number(minNum.value);
      const curHi = state.cpMax !== null ? state.cpMax : cpDomain.max;
      applyRangeBounds(Number.isFinite(v) ? v : cpDomain.min, curHi);
    });

    maxNum.addEventListener('change', () => {
      const v = Number(maxNum.value);
      const curLo = state.cpMin !== null ? state.cpMin : cpDomain.min;
      applyRangeBounds(curLo, Number.isFinite(v) ? v : cpDomain.max);
    });

    bar.querySelectorAll('.cp-mgrp-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.multiBoardGroup = btn.dataset.mgrp;
        state.expandedGroups.clear();
        persistUiPrefs();
        const filtered = applyCpRangeFilter(cpDomain.preCpList);
        updateCpRangeVisuals(filtered.length);
        renderMainView(filtered);
      });
    });

    document.getElementById('btn-cp-my-theta').addEventListener('click', () => {
      const info = getPlayerThetaForGauge();
      if (!info) return;
      if (state.view === 'board') state.multiBoardGroup = 'cp';
      applyRangeBounds(info.theta - 6, info.theta + 6);
    });

    document.getElementById('btn-cp-reset').addEventListener('click', () => {
      resetCpRange();
      state.tablePage = 1;
      state.expandedGroups.clear();
      persistUiPrefs();
      const filtered = applyCpRangeFilter(cpDomain.preCpList);
      updateCpRangeVisuals(filtered.length);
      scheduleCpLiveUpdate();
    });
  }

  function updateCpRangeVisuals(matchedCount) {
    const dMin = cpDomain.min;
    const dMax = cpDomain.max;
    const span = Math.max(0.5, dMax - dMin);
    const effMin = state.cpMin !== null ? state.cpMin : dMin;
    const effMax = state.cpMax !== null ? state.cpMax : dMax;
    const isNarrowed = state.cpMin !== null || state.cpMax !== null;
    const gUpper = state.gauge.toUpperCase();
    const totalCount = cpDomain.preCpList.length;

    const minSlider = document.getElementById('cp-slider-min');
    const maxSlider = document.getElementById('cp-slider-max');
    const minNum = document.getElementById('cp-num-min');
    const maxNum = document.getElementById('cp-num-max');
    const fill = document.getElementById('cp-range-fill');
    const summaryEl = document.getElementById('cp-range-summary');
    const badgeEl = document.getElementById('cp-window-badge');
    const resetBtn = document.getElementById('btn-cp-reset');
    const mgrpGroup = document.getElementById('cp-mgrp-group');
    const btnMgrpCp = document.getElementById('btn-mgrp-cp');

    minSlider.value = String(effMin);
    maxSlider.value = String(effMax);
    minNum.value = effMin.toFixed(1);
    maxNum.value = effMax.toFixed(1);

    // Keep overlapping thumbs separable at both ends
    if (effMin > dMin + span * 0.5) {
      minSlider.style.zIndex = '4';
      maxSlider.style.zIndex = '3';
    } else {
      minSlider.style.zIndex = '3';
      maxSlider.style.zIndex = '4';
    }

    const pMin = Math.max(0, Math.min(1, (effMin - dMin) / span));
    const pMax = Math.max(0, Math.min(1, (effMax - dMin) / span));
    fill.style.left = `calc(8px + (100% - 16px) * ${pMin.toFixed(5)})`;
    fill.style.width = `calc((100% - 16px) * ${Math.max(0, pMax - pMin).toFixed(5)})`;

    // Highlight density bars inside [effMin, effMax]
    const histEl = document.getElementById('cp-hist');
    const bins = cpDomain.bins;
    const step = span / bins;
    for (let i = 0; i < histEl.children.length; i++) {
      const bLo = dMin + i * step;
      const bHi = bLo + step;
      const inside = bHi >= effMin - 1e-6 && bLo <= effMax + 1e-6;
      histEl.children[i].classList.toggle('in-range', inside);
    }

    summaryEl.innerHTML = `已选 <b style="color:var(--ink);">${describeSelectedLevels()}</b> · <b class="mono" style="color:var(--ink);">${matchedCount.toLocaleString()}</b> / ${totalCount.toLocaleString()} 谱`;
    badgeEl.textContent = `${gUpper} CP ${effMin.toFixed(1)} ~ ${effMax.toFixed(1)}${isNarrowed ? ` (宽 ${(effMax - effMin).toFixed(1)})` : ' · 全区间'}`;
    resetBtn.disabled = !isNarrowed;
    resetBtn.style.opacity = isNarrowed ? '1' : '0.5';

    mgrpGroup.classList.toggle('hidden', state.view !== 'board');
    btnMgrpCp.textContent = `按跨级 ${gUpper} CP 区间`;
    mgrpGroup.querySelectorAll('.cp-mgrp-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.mgrp === state.multiBoardGroup);
    });
  }

  function syncCpRangeBar(preCpList) {
    const bar = document.getElementById('cp-range-bar');
    if (!bar) return;
    if (state.levels.size <= 1) {
      bar.classList.add('hidden');
      return;
    }
    bar.classList.remove('hidden');
    ensureCpRangeBarDom();

    const sKey = 's_' + state.gauge;
    let rawMin = Infinity;
    let rawMax = -Infinity;
    for (const c of preCpList) {
      const v = c[sKey];
      if (v < rawMin) rawMin = v;
      if (v > rawMax) rawMax = v;
    }
    const empty = !Number.isFinite(rawMin) || !Number.isFinite(rawMax);
    const dMin = empty ? 0 : Math.floor(rawMin * 2) / 2;
    let dMax = empty ? 100 : Math.ceil(rawMax * 2) / 2;
    if (dMax <= dMin) dMax = dMin + 0.5;
    cpDomain = { min: dMin, max: dMax, preCpList, bins: 32 };

    // Clamp active range into new domain
    if (state.cpMin !== null) {
      state.cpMin = Math.max(dMin, Math.min(dMax, snapHalf(state.cpMin)));
      if (state.cpMin <= dMin + 1e-6) state.cpMin = null;
    }
    if (state.cpMax !== null) {
      state.cpMax = Math.max(dMin, Math.min(dMax, snapHalf(state.cpMax)));
      if (state.cpMax >= dMax - 1e-6) state.cpMax = null;
    }
    if (state.cpMin !== null && state.cpMax !== null && state.cpMin > state.cpMax) {
      resetCpRange();
    }

    const minSlider = document.getElementById('cp-slider-min');
    const maxSlider = document.getElementById('cp-slider-max');
    const minNum = document.getElementById('cp-num-min');
    const maxNum = document.getElementById('cp-num-max');
    minSlider.min = maxSlider.min = minNum.min = maxNum.min = String(dMin);
    minSlider.max = maxSlider.max = minNum.max = maxNum.max = String(dMax);
    minSlider.disabled = maxSlider.disabled = minNum.disabled = maxNum.disabled = empty;

    // Build mini CP density histogram behind the slider track
    const bins = cpDomain.bins;
    const span = Math.max(0.5, dMax - dMin);
    const histCounts = new Array(bins).fill(0);
    for (const c of preCpList) {
      const idx = Math.min(bins - 1, Math.max(0, Math.floor(((c[sKey] - dMin) / span) * bins)));
      histCounts[idx]++;
    }
    const maxBin = Math.max(1, ...histCounts);
    document.getElementById('cp-hist').innerHTML = histCounts.map((cnt, i) => {
      const pct = cnt === 0 ? 8 : Math.max(14, Math.round((cnt / maxBin) * 100));
      const bLo = (dMin + (i / bins) * span).toFixed(1);
      const bHi = (dMin + ((i + 1) / bins) * span).toFixed(1);
      return `<div class="cp-hist-bar" style="height:${pct}%;" title="CP ${bLo}–${bHi}: ${cnt} 谱"></div>`;
    }).join('');

    // Build scale ticks
    const tickCount = 5;
    const ticks = [];
    for (let i = 0; i < tickCount; i++) {
      const val = dMin + (span * i) / (tickCount - 1);
      ticks.push(`<span>${val.toFixed(0)}</span>`);
    }
    document.getElementById('cp-range-ticks').innerHTML = ticks.join('');

    // Optional personal IRT capability line pin & quick preset when CSV is loaded
    const thetaInfo = getPlayerThetaForGauge();
    const pin = document.getElementById('cp-theta-pin');
    const thetaBtn = document.getElementById('btn-cp-my-theta');
    if (thetaInfo && !empty && thetaInfo.theta >= dMin && thetaInfo.theta <= dMax) {
      const pTheta = (thetaInfo.theta - dMin) / span;
      pin.style.left = `calc(8px + (100% - 16px) * ${pTheta.toFixed(5)})`;
      pin.title = `我的 ${thetaInfo.gauge.toUpperCase()} 能力线: CP ${thetaInfo.theta.toFixed(1)}`;
      pin.classList.remove('hidden');
      thetaBtn.textContent = `我的能力线 ±6 (CP ${thetaInfo.theta.toFixed(1)})`;
      thetaBtn.classList.remove('hidden');
    } else {
      pin.classList.add('hidden');
      thetaBtn.classList.add('hidden');
    }

    const filtered = applyCpRangeFilter(preCpList);
    updateCpRangeVisuals(filtered.length);
  }

  function scheduleCpLiveUpdate() {
    if (cpDragRaf) return;
    cpDragRaf = requestAnimationFrame(() => {
      cpDragRaf = 0;
      const filtered = applyCpRangeFilter(cpDomain.preCpList);
      renderKpis(filtered);
      if (!state.selectedId || !filtered.some((x) => x.id === state.selectedId)) {
        const gKey = 's_' + state.gauge;
        const top = [...filtered].sort((a, b) => b[gKey] - a[gKey])[0];
        state.selectedId = top ? top.id : null;
      }
      renderMainView(filtered);
      renderInspector();
    });
  }

  function renderMainView(list) {
    if (state.view === 'board') renderBoard(list);
    else if (state.view === 'table') renderTable(list);
    else if (state.view === 'delta') renderDelta(list);
    else if (activeExplorerMode() === 'dp') renderDpOptionView(list);
    else renderSpOptionView(list);
  }

  function renderKpis(list) {
    const mode = activeExplorerMode();
    const strip = document.getElementById('kpi-strip');
    const n = list.length || 1;
    const mean = (fn) => list.reduce((a, b) => a + fn(b), 0) / n;
    const kjCnt = list.filter((c) => c.kj).length;
    const gKey = 's_' + state.gauge;
    const sorted = [...list].sort((a, b) => b[gKey] - a[gKey]);
    const topChart = sorted[0];
    const isDp = mode === 'dp';
    const nonRegCnt = list.filter((c) => c.optShort && c.optShort !== '-').length;

    // Optional personal lamp progress KPI when CSV is loaded
    let fourthCard;
    if (state.csvReport && state.csvReport.mode === mode && list.length > 0) {
      let playedN = 0, ncN = 0, hcN = 0;
      for (const c of list) {
        const rec = state.csvReport.recordMap.get(c.id);
        if (rec) {
          playedN++;
          if (rec.lampRank >= 4) ncN++;
          if (rec.lampRank >= 5) hcN++;
        }
      }
      fourthCard = {
        label: '当前筛选清灯进度',
        val: `${ncN} / ${playedN} NC+`,
        sub: `已游玩 ${playedN} 谱 · HC+ ${hcN} 谱`,
      };
    } else if (isDp) {
      fourthCard = {
        label: '非正规 DP 选项推荐率',
        val: ((nonRegCnt / n) * 100).toFixed(1) + '%',
        sub: `${nonRegCnt} 谱推荐 FLIP/鏡/乱`,
      };
    } else if (state.view === 'opt') {
      fourthCard = {
        label: '非正规 SP 选项推荐率',
        val: ((nonRegCnt / n) * 100).toFixed(1) + '%',
        sub: `${nonRegCnt} 谱推荐 鏡/R乱/乱/S乱`,
      };
    } else {
      fourthCard = {
        label: '个人差谱面占比',
        val: ((kjCnt / n) * 100).toFixed(1) + '%',
        sub: `${kjCnt} 个人差 / ${list.length - kjCnt} 地力`,
      };
    }

    const cards = [
      { label: `${mode.toUpperCase()} ${describeSelectedLevels()} 匹配谱面`, val: list.length.toLocaleString(), sub: state.scope === 'ac' ? '当前 AC 在库' : '含削除/CS' },
      { label: '平均物量 / 时长', val: Math.round(mean((c) => c.notes)) + ' N', sub: mean((c) => c.time).toFixed(1) + 's 均值' },
      { label: '均值 / 峰值密度', val: mean((c) => c.avgNps).toFixed(2) + ' NPS', sub: '峰值均值 ' + mean((c) => c.peakNps).toFixed(2) + ' NPS' },
      fourthCard,
      { label: state.gauge.toUpperCase() + ' 综合指数均值', val: list.length ? mean((c) => c[gKey]).toFixed(1) : '—', sub: list.length ? `范围 ${(sorted[sorted.length - 1]?.[gKey] ?? 0).toFixed(1)} ~ ${(topChart?.[gKey] ?? 0).toFixed(1)}` : '' },
      { label: state.gauge.toUpperCase() + ' 榜首谱面', val: topChart ? topChart.title : '—', sub: topChart ? `${topChart.diff} ★${topChart.lv} · CP ${topChart[gKey].toFixed(1)}` : '' },
    ];

    strip.innerHTML = cards.map((c) => `
      <div class="card kpi-card">
        <div class="kpi-label truncate" title="${esc(c.label)}">${esc(c.label)}</div>
        <div class="kpi-val mono truncate" title="${esc(c.val)}">${esc(c.val)}</div>
        <div class="kpi-sub truncate" title="${esc(c.sub)}">${esc(c.sub)}</div>
      </div>
    `).join('');
  }

  function renderChip(c, showLvBadge) {
    const diffShort = c.dChar === 'L' ? '†' : c.dChar;
    const sel = c.id === state.selectedId ? 'selected' : '';
    const rec = getUserRecord(c.mode, c.id);
    const lampCls = rec ? `has-lamp lamp-edge-${rec.lampMeta.key}` : '';

    const lvPill = showLvBadge ? `<span class="chip-lv mono">★${c.lv}</span>` : '';
    const extraTag = c.kj ? `<span class="chip-tag">[${esc(c.tags.filter((t) => t !== '地力')[0] || '個人差')}]</span>` : '';
    const optPill = (c.optShort && c.optShort !== '-' && c.optGain >= (c.mode === 'dp' ? 0.03 : 0.04))
      ? `<span class="${c.mode === 'dp' ? 'chip-opt' : 'chip-opt-sp'}">${esc(c.optShort)}</span>` : '';
    const acMark = !c.ac ? '<span class="chip-old">旧</span>' : '';
    const optTitle = c.optShort && c.optShort !== '-' ? ` | 推荐:${c.bestOpt} (-${(c.optGain * 100).toFixed(1)}%)` : '';
    const recTitle = rec
      ? ` | 我的灯:${rec.lamp}${rec.hasScore ? ` (${rec.dj || ''} ${(rec.exRate * 100).toFixed(1)}%)` : ''}${rec.hasBp ? ` BP:${rec.bp}` : ''}`
      : '';

    return `<button type="button" class="chip ${sel} ${lampCls}" data-id="${c.id}" title="${esc(c.title)} [${c.diff} ★${c.lv} · ${c.ver}] | EC:${c.tier_ec} NC:${c.tier_nc} HC:${c.tier_hc} EX:${c.tier_exhc}${optTitle}${recTitle}">
      ${lvPill}
      <span class="diff-${c.dChar}">${diffShort}</span>
      <span class="chip-title">${esc(c.title)}</span>
      ${optPill}${extraTag}${acMark}
    </button>`;
  }

  function renderBoard(list) {
    const mode = activeExplorerMode();
    const main = document.getElementById('main-panel');
    const tKey = 'tier_' + state.gauge;
    const sKey = 's_' + state.gauge;
    const kjLabel = mode === 'dp' ? '个人差 (無理皿/連皿/ソフラン/片手CN/縦連)' : '个人差 (皿/ソフラン/縦連/CN)';

    if (list.length === 0) {
      main.innerHTML = '<div class="card" style="padding:36px;text-align:center;color:var(--muted);">没有符合当前筛选条件的谱面。可尝试放宽历代版本、难度类型或搜索关键词。</div>';
      return;
    }

    const hasLampData = !!(state.csvReport && state.csvReport.mode === mode);
    const lampLegendHtml = hasLampData ? `
      <div class="card" style="padding:8px 14px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;font-size:11.5px;color:var(--muted);">
        <span><b style="color:var(--coach-ink);">已叠加个人清灯</b>（曲目卡片左侧色条代表官方清灯状态）</span>
        <div style="display:flex;flex-wrap:wrap;gap:9px;">
          ${LAMP_LEGEND_ITEMS.map((item) => `<span style="display:inline-flex;align-items:center;gap:4px;" title="${item.title}"><span class="lamp-dot lamp-${item.key}"></span>${item.label}</span>`).join('')}
        </div>
      </div>
    ` : '';

    // Single-level classic tier board (S+ .. F, Core vs Kojinsa)
    if (state.levels.size === 1) {
      const lv = [...state.levels][0];
      const order = lv === 12 ? TIER_ORDER_12 : (lv >= 8 ? TIER_ORDER_MID : TIER_ORDER_LOW);
      let html = lampLegendHtml;
      for (const tier of order) {
        const bucket = list.filter((c) => c[tKey] === tier).sort((a, b) => b[sKey] - a[sKey]);
        if (bucket.length === 0) continue;
        const jiriki = bucket.filter((c) => !c.kj);
        const kojinsa = bucket.filter((c) => c.kj);

        html += `
          <div class="card tier-section">
            <div class="tier-section-head">
              <div class="tier-head-left">
                <span class="tier-badge ${tierCls(tier)}">${tier}</span>
                <span>${mode.toUpperCase()} ★${lv} ${state.gauge.toUpperCase()} 档位 ${tier}</span>
              </div>
              <div class="tier-head-right mono">共 ${bucket.length} 谱面（地力 ${jiriki.length} · 个人差 ${kojinsa.length}）</div>
            </div>
            <div class="tier-split">
              <div class="tier-col">
                <div class="tier-col-title">地力 (Core) · ${jiriki.length}</div>
                <div class="chip-wrap">${jiriki.length ? jiriki.map((c) => renderChip(c, false)).join('') : '<span style="color:var(--muted);font-size:12px;">—</span>'}</div>
              </div>
              <div class="tier-col">
                <div class="tier-col-title">${kjLabel} · ${kojinsa.length}</div>
                <div class="chip-wrap">${kojinsa.length ? kojinsa.map((c) => renderChip(c, false)).join('') : '<span style="color:var(--muted);font-size:12px;">—</span>'}</div>
              </div>
            </div>
          </div>
        `;
      }
      main.innerHTML = html;
      bindChipClicks();
      return;
    }

    // Multi-level / All-levels board (controls & draggable CP range slider live in persistent #cp-range-bar)
    let groups = [];
    if (state.multiBoardGroup === 'level') {
      const lvs = [...state.levels].sort((a, b) => b - a);
      for (const lv of lvs) {
        const items = list.filter((c) => c.lv === lv).sort((a, b) => b[sKey] - a[sKey]);
        if (items.length === 0) continue;
        groups.push({ key: 'lv_' + lv, badge: `★${lv}`, badgeCls: lv >= 11 ? 'tier-Sp' : (lv >= 9 ? 'tier-Ap' : 'tier-Bp'), title: `${mode.toUpperCase()} 官方等级 ★${lv}`, items, showLv: false });
      }
    } else {
      const sorted = [...list].sort((a, b) => b[sKey] - a[sKey]);
      const dataMax = sorted[0]?.[sKey] ?? 50;
      const dataMin = sorted[sorted.length - 1]?.[sKey] ?? 0;
      const effMin = state.cpMin !== null ? state.cpMin : dataMin;
      const effMax = state.cpMax !== null ? state.cpMax : dataMax;
      const span = Math.max(0.5, effMax - effMin);
      const step = span <= 6 ? 1 : (span <= 14 ? 2 : (span <= 28 ? 4 : (state.gauge === 'exhc' ? 10 : 8)));
      const topCp = Math.max(step, Math.ceil(Math.max(effMax, dataMax) / step) * step);
      const botCp = Math.max(0, Math.floor(Math.min(effMin, dataMin) / step) * step);
      const cpBadgeCls = (lo) => (lo >= 56 ? 'tier-Sp' : (lo >= 44 ? 'tier-S' : (lo >= 34 ? 'tier-Ap' : (lo >= 24 ? 'tier-A' : (lo >= 14 ? 'tier-Bp' : 'tier-C')))));

      for (let hi = topCp; hi > botCp; hi -= step) {
        const lo = Math.max(0, hi - step);
        const items = sorted.filter((c) => c[sKey] >= lo && (hi === topCp ? c[sKey] <= hi + 100 : c[sKey] < hi));
        if (items.length === 0) continue;
        groups.push({ key: `cp_${lo}_${hi}`, badge: `${lo}–${hi}`, badgeCls: cpBadgeCls(lo), title: `${state.gauge.toUpperCase()} 综合指数 CP ${lo} ~ ${hi}`, items, showLv: true });
      }
      if (groups.length === 0 && sorted.length > 0) {
        groups.push({ key: `cp_${botCp}_${topCp}`, badge: `${botCp}–${topCp}`, badgeCls: cpBadgeCls(botCp), title: `${state.gauge.toUpperCase()} 综合指数 CP ${botCp} ~ ${topCp}`, items: sorted, showLv: true });
      }
    }

    const CHIP_CAP = 90;
    let html = lampLegendHtml;
    for (const g of groups) {
      const isExpanded = state.expandedGroups.has(g.key);
      const visible = isExpanded ? g.items : g.items.slice(0, CHIP_CAP);
      const remaining = g.items.length - visible.length;
      const jiriki = visible.filter((c) => !c.kj);
      const kojinsa = visible.filter((c) => c.kj);

      let lampStat = '';
      if (state.csvReport && state.csvReport.mode === mode) {
        let p = 0, nc = 0;
        for (const c of g.items) {
          const rec = state.csvReport.recordMap.get(c.id);
          if (rec) { p++; if (rec.lampRank >= 4) nc++; }
        }
        if (p > 0) lampStat = ` · 已清 ${nc}/${p}`;
      }

      html += `
        <div class="card tier-section">
          <div class="tier-section-head">
            <div class="tier-head-left">
              <span class="tier-badge ${g.badgeCls}">${g.badge}</span>
              <span>${esc(g.title)}</span>
            </div>
            <div class="tier-head-right mono">
              <span>共 ${g.items.length} 谱${lampStat}</span>
              ${remaining > 0 ? `<button type="button" class="btn btn-sm btn-expand-grp" data-grp="${g.key}">展开全部 (+${remaining})</button>` : ''}
              ${isExpanded && g.items.length > CHIP_CAP ? `<button type="button" class="btn btn-sm btn-expand-grp" data-grp="${g.key}">收起</button>` : ''}
            </div>
          </div>
          <div class="tier-split">
            <div class="tier-col">
              <div class="tier-col-title">地力 (Core) · ${jiriki.length}</div>
              <div class="chip-wrap">${jiriki.length ? jiriki.map((c) => renderChip(c, g.showLv)).join('') : '<span style="color:var(--muted);font-size:12px;">—</span>'}</div>
            </div>
            <div class="tier-col">
              <div class="tier-col-title">${kjLabel} · ${kojinsa.length}</div>
              <div class="chip-wrap">${kojinsa.length ? kojinsa.map((c) => renderChip(c, g.showLv)).join('') : '<span style="color:var(--muted);font-size:12px;">—</span>'}</div>
            </div>
          </div>
        </div>
      `;
    }

    main.innerHTML = html;
    main.querySelectorAll('.btn-expand-grp').forEach((btn) => {
      btn.addEventListener('click', () => {
        const k = btn.dataset.grp;
        if (state.expandedGroups.has(k)) state.expandedGroups.delete(k);
        else state.expandedGroups.add(k);
        renderBoard(list);
      });
    });
    bindChipClicks();
  }

  function renderTable(list) {
    const mode = activeExplorerMode();
    const main = document.getElementById('main-panel');
    const col = state.sortCol;
    const isDp = mode === 'dp';
    const hasLampData = !!(state.csvReport && state.csvReport.mode === mode);

    const sorted = [...list].sort((a, b) => {
      if (col === 'myLamp') {
        const ra = getUserRecord(mode, a.id)?.lampRank ?? -1;
        const rb = getUserRecord(mode, b.id)?.lampRank ?? -1;
        return (ra - rb) * state.sortDir;
      }
      const va = a[col] ?? 0;
      const vb = b[col] ?? 0;
      if (typeof va === 'string') return va.localeCompare(vb) * state.sortDir;
      return (va - vb) * state.sortDir;
    });

    const totalPages = Math.max(1, Math.ceil(sorted.length / state.tablePageSize));
    state.tablePage = Math.max(1, Math.min(state.tablePage, totalPages));
    const startIdx = (state.tablePage - 1) * state.tablePageSize;
    const pageRows = sorted.slice(startIdx, startIdx + state.tablePageSize);

    const th = (label, key) => `<th data-sort="${key}" class="sort-th">${label}${col === key ? (state.sortDir < 0 ? ' ↓' : ' ↑') : ''}</th>`;

    main.innerHTML = `
      <div class="card table-wrap">
        <div class="table-mobile-hint">可左右滑动查看全部列 · 点击任意行弹出谱面详情</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              ${th('★', 'lv')}
              ${th('版本', 'verIdx')}
              ${th('曲名 / 难度', 'title')}
              ${th('Notes', 'notes')}
              ${th('峰NPS', 'peakNps')}
              ${th('EC', 's_ec')}
              ${th('NC', 's_nc')}
              ${th('HC', 's_hc')}
              ${th('EXHC', 's_exhc')}
              ${hasLampData ? th('我的成绩', 'myLamp') : ''}
              ${th(isDp ? 'DP推荐选项' : 'SP推荐选项', 'optGain')}
            </tr>
          </thead>
          <tbody>
            ${pageRows.length ? pageRows.map((c, idx) => {
              const rec = hasLampData ? state.csvReport.recordMap.get(c.id) : null;
              const recCell = hasLampData
                ? `<td class="mono">${rec
                    ? `${renderLampBadge(rec.lampMeta)}${rec.exRate !== null ? ` <span style="opacity:0.8;">${(rec.exRate * 100).toFixed(1)}%</span>` : ''}${rec.hasBp ? ` <span style="color:var(--muted);">BP${rec.bp}</span>` : ''}`
                    : '<span style="color:var(--muted);">—</span>'}</td>`
                : '';
              const optCol = isDp ? 'var(--dp-ink)' : 'var(--accent-ink)';
              return `
                <tr data-id="${c.id}" class="row-click ${c.id === state.selectedId ? 'selected' : ''}">
                  <td class="mono" style="color:var(--muted);">${startIdx + idx + 1}</td>
                  <td class="mono" style="font-weight:700;">★${c.lv}</td>
                  <td class="mono" style="color:var(--muted);white-space:nowrap;" title="${esc(c.ver)}">${esc(c.verCode)}</td>
                  <td style="font-weight:600;">
                    <span class="diff-${c.dChar}" style="margin-right:4px;">[${c.dChar}]</span>${esc(c.title)}
                    ${!c.ac ? '<span class="chip-old" style="margin-left:4px;">(旧)</span>' : ''}
                  </td>
                  <td class="mono">${c.notes}</td>
                  <td class="mono">${c.peakNps.toFixed(1)}</td>
                  <td class="mono" style="white-space:nowrap;"><span class="tier-badge ${tierCls(c.tier_ec)}">${c.tier_ec}</span> <span style="opacity:0.75;">${c.s_ec.toFixed(1)}</span></td>
                  <td class="mono" style="white-space:nowrap;"><span class="tier-badge ${tierCls(c.tier_nc)}">${c.tier_nc}</span> <span style="opacity:0.75;">${c.s_nc.toFixed(1)}</span></td>
                  <td class="mono" style="white-space:nowrap;"><span class="tier-badge ${tierCls(c.tier_hc)}">${c.tier_hc}</span> <span style="opacity:0.75;">${c.s_hc.toFixed(1)}</span></td>
                  <td class="mono" style="white-space:nowrap;"><span class="tier-badge ${tierCls(c.tier_exhc)}">${c.tier_exhc}</span> <span style="opacity:0.75;">${c.s_exhc.toFixed(1)}</span></td>
                  ${recCell}
                  <td style="color:var(--muted);"><span style="color:${optCol};font-weight:700;">${esc(c.optShort)}</span>${c.optGain >= 0.02 ? ` (-${(c.optGain * 100).toFixed(1)}%)` : ''} · ${esc(c.tags.slice(0, 2).join('/'))}</td>
                </tr>
              `;
            }).join('') : `<tr><td colspan="${hasLampData ? 12 : 11}" style="text-align:center;padding:28px;color:var(--muted);">没有符合当前筛选条件的谱面。</td></tr>`}
          </tbody>
        </table>
        ${sorted.length > state.tablePageSize ? `
          <div class="pagination-bar mono">
            <span>第 ${startIdx + 1}–${Math.min(sorted.length, startIdx + state.tablePageSize)} 条 / 共 ${sorted.length.toLocaleString()} 条</span>
            <div style="display:flex;align-items:center;gap:6px;">
              <button type="button" id="pg-prev" class="btn btn-sm" ${state.tablePage <= 1 ? 'disabled' : ''}>上一页</button>
              <span>${state.tablePage} / ${totalPages}</span>
              <button type="button" id="pg-next" class="btn btn-sm" ${state.tablePage >= totalPages ? 'disabled' : ''}>下一页</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    main.querySelectorAll('.sort-th').forEach((el) => {
      el.addEventListener('click', () => {
        const k = el.dataset.sort;
        if (state.sortCol === k) state.sortDir *= -1;
        else { state.sortCol = k; state.sortDir = -1; }
        state.tablePage = 1;
        persistUiPrefs();
        renderTable(list);
      });
    });
    main.querySelectorAll('.row-click').forEach((el) => {
      el.addEventListener('click', () => {
        main.querySelectorAll('.row-click.selected').forEach((r) => r.classList.remove('selected'));
        el.classList.add('selected');
        selectChart(el.dataset.id, true);
      });
    });
    const prevBtn = document.getElementById('pg-prev');
    const nextBtn = document.getElementById('pg-next');
    if (prevBtn) prevBtn.addEventListener('click', () => { state.tablePage--; renderTable(list); });
    if (nextBtn) nextBtn.addEventListener('click', () => { state.tablePage++; renderTable(list); });
  }

  function renderDelta(list) {
    const main = document.getElementById('main-panel');
    const blocks = [
      {
        title: 'HC 局所难 / 地雷跳档 Top 15 (HC 定数 − EC 定数最大)',
        desc: '中段高强度发狂、片手纵连、连皿/無理皿、HCN 或突然变速，EC/NC 靠后半段可回血，HC 极易暴毙。',
        items: [...list].sort((a, b) => (b.rate_hc - b.rate_ec) - (a.rate_hc - a.rate_ec)).slice(0, 15),
        metric: (c) => `EC ${c.tier_ec}(${c.rate_ec.toFixed(2)}) → HC ${c.tier_hc}(${c.rate_hc.toFixed(2)}) [+${(c.rate_hc - c.rate_ec).toFixed(2)}]`,
      },
      {
        title: 'EXHC 瞬间杀伤跳档 Top 15 (EXHC 定数 − HC 定数最大)',
        desc: '失去 30% 红血补正且双倍扣血后，极短爆发、微纵连、無理皿/両皿、HCN 或突然ソフラン的致死率陡增。',
        items: [...list].sort((a, b) => (b.rate_exhc - b.rate_hc) - (a.rate_exhc - a.rate_hc)).slice(0, 15),
        metric: (c) => `HC ${c.tier_hc}(${c.rate_hc.toFixed(2)}) → EX ${c.tier_exhc}(${c.rate_exhc.toFixed(2)}) [+${(c.rate_exhc - c.rate_hc).toFixed(2)}]`,
      },
      {
        title: 'NC 尾杀 (ラス殺し) 跳档 Top 15 (NC 定数 − EC 定数最大)',
        desc: '结尾 25% 密度显著高于前中段或 TOTAL 紧缺，NC 80% 结算线压力远高于 EC。',
        items: [...list].sort((a, b) => (b.rate_nc - b.rate_ec) - (a.rate_nc - a.rate_ec)).slice(0, 15),
        metric: (c) => `EC ${c.tier_ec}(${c.rate_ec.toFixed(2)}) → NC ${c.tier_nc}(${c.rate_nc.toFixed(2)}) · 尾段比 ${c.lastKill.toFixed(2)}x`,
      },
    ];

    main.innerHTML = blocks.map((b) => `
      <div class="card rank-card">
        <div>
          <h3>${b.title}</h3>
          <p class="sub">${b.desc}</p>
        </div>
        <div>
          ${b.items.length ? b.items.map((c, idx) => `
            <div data-id="${c.id}" class="rank-row">
              <div style="font-weight:600;">
                <span class="mono" style="color:var(--muted);margin-right:6px;">${String(idx + 1).padStart(2, '0')}.</span>
                <span class="chip-lv mono" style="margin-right:4px;">★${c.lv}</span>
                <span class="diff-${c.dChar}" style="margin-right:4px;">[${c.dChar}]</span>
                ${esc(c.title)}
                <span style="color:var(--muted);font-weight:400;margin-left:5px;">[${esc(c.tags.slice(0, 2).join('/'))}]</span>
              </div>
              <div class="mono" style="font-weight:700;">${b.metric(c)}</div>
            </div>
          `).join('') : '<div style="color:var(--muted);font-size:12px;padding:8px 0;">当前筛选条件下暂无谱面。</div>'}
        </div>
      </div>
    `).join('');

    main.querySelectorAll('.rank-row').forEach((el) => {
      el.addEventListener('click', () => selectChart(el.dataset.id, true));
    });
  }

  function renderSpOptionView(list) {
    const main = document.getElementById('main-panel');
    const is2p = state.spSide === '2p';
    const sideLabel = is2p ? '2P 右皿' : '1P 左皿';
    const handKeyLabel = is2p ? '1-4/5-7键' : '1-3/4-7键';

    const groups = [
      {
        title: is2p
          ? '鏡 (MIRROR) 减负 Top 15（2P 皿侧 5/6/7 键移至左手 / 右手弱指减负）'
          : '鏡 (MIRROR) 减负 Top 15（1P 皿侧 1/2/3 键移至右手 / 左手弱指减负）',
        desc: is2p
          ? '2P 右皿侧 5/6/7 键与右手偏重谱面翻转后把高密键位交给 4 指左手承接，0 随机方差、稳定提灯首选。'
          : '1P 左皿侧 1/2/3 键与左手偏重谱面翻转后把高密键位交给 4 指右手承接，0 随机方差、稳定提灯首选。',
        items: list.filter((c) => c.optShort === 'MIR').sort((a, b) => b.optGain - a.optGain).slice(0, 15),
      },
      {
        title: 'R乱 (R-RANDOM) 减负 Top 15（移开皿侧冲突与边缘轴，同时保留阶段流）',
        desc: '12 种循环位移与镜像位移在保留自然阶段顺手度的前提下，把 1/2/6/7 边缘压力移向中轴强指。',
        items: list.filter((c) => c.optShort === 'R-RAN').sort((a, b) => b.optGain - a.optGain).slice(0, 15),
      },
      {
        title: '乱 (RANDOM) 减负 Top 15（拆同手颤音 / 单手发狂 / 糟糕固定二重阶段）',
        desc: '把 1-2/6-7 同手颤音转为双手交互、均衡左右手密度，是中高星地力谱与固定坏手型的核心减负手段。',
        items: list.filter((c) => c.optShort === 'RAN').sort((a, b) => b.optGain - a.optGain).slice(0, 15),
      },
      {
        title: 'S乱 (S-RANDOM) 拆纵连减负 Top 15（高密固定縦連 / 单键轴专治 · 低和弦防误连）',
        desc: '逐音打散同轨连打，彻底解除固定縦連与单键轴压迫（仅在和弦密度足够低、不会引发严重随机误连的谱面上推荐）。',
        items: list.filter((c) => c.optShort === 'S-RAN').sort((a, b) => b.optGain - a.optGain).slice(0, 15),
      },
    ];

    const nonRegCnt = list.filter((c) => c.optShort && c.optShort !== '-').length;
    const summaryBanner = `
      <div class="card board-toolbar">
        <div style="font-size:12px;color:var(--muted);">
          当前筛选共 <b class="mono" style="color:var(--ink);">${list.length.toLocaleString()}</b> 张 SP 谱面，其中 <b class="mono" style="color:var(--accent-ink);">${nonRegCnt.toLocaleString()}</b> 谱（${list.length ? ((nonRegCnt / list.length) * 100).toFixed(1) : '0.0'}%）推荐非正规选项（按 <b>${sideLabel}</b> 1048/対称固定 生物力学求解）
        </div>
        <div class="seg-group sp-side-group">
          <button type="button" data-sp-side="1p" class="seg-btn sp-side-inline-btn ${!is2p ? 'active' : ''}">1P 左皿视角</button>
          <button type="button" data-sp-side="2p" class="seg-btn sp-side-inline-btn ${is2p ? 'active' : ''}">2P 右皿视角</button>
        </div>
      </div>
      <details class="card opt-explain-banner">
        <summary>什么是「手型减负 -X%」？点击查看生物力学算法与选型说明</summary>
        <div class="opt-explain-body">
          <p><b>含义：</b>以当前 <b>${sideLabel}</b> 的「正規 (-)」手型综合负荷为 100%，切换到推荐选项后，预计可降低的<b>手指与手型综合负荷百分比</b>（并非直接降低总物量，而是缓解卡手/偏手/弱指/皿侧冲突）。</p>
          <ul>
            <li><b>计算维度：</b>综合评估 ① 皿侧手按键压迫（1P 1-3键 / 2P 5-7键 + 转盘切换） ② 1-2 / 6-7 边缘弱指连打与同手颤音 ③ 生物力学手指耦合阻力 ④ 黑白键交替顺手度 ⑤ 固定纵连与单键轴压迫。</li>
            <li><b>幅度参考：</b><code>-8% 以上</code> 属于正规极易卡手的强烈推荐；<code>-4% ~ -8%</code> 属于明显顺手的优先尝试；<code>-2% 以内</code> 表示正规已较均衡。随机系（R乱/乱/S乱）按多组合法排列的期望平均减负计算。</li>
          </ul>
        </div>
      </details>
    `;

    main.innerHTML = summaryBanner + groups.map((g) => `
      <div class="card rank-card">
        <div>
          <h3>${g.title}</h3>
          <p class="sub">${g.desc}</p>
        </div>
        <div>
          ${g.items.length ? g.items.map((c, i) => {
            const rec = getUserRecord('sp', c.id);
            const lampPill = rec ? renderLampBadge(rec.lampMeta, { style: 'margin-left:5px;' }) : '';
            return `
              <div data-id="${c.id}" class="rank-row">
                <div style="font-weight:600;">
                  <span class="mono" style="color:var(--muted);margin-right:6px;">${String(i + 1).padStart(2, '0')}.</span>
                  <span class="chip-lv mono" style="margin-right:4px;">★${c.lv}</span>
                  <span class="diff-${c.dChar}" style="margin-right:4px;">[${c.dChar}]</span>
                  ${esc(c.title)}
                  <span class="chip-opt-sp" style="margin-left:6px;">${esc(c.bestOpt)}</span>
                  ${lampPill}
                </div>
                <div class="mono" style="color:var(--muted);">
                  减负 <b style="color:var(--pos);">-${(c.optGain * 100).toFixed(1)}%</b> · ${handKeyLabel} ${c.leftNotes}/${c.rightNotes} · ${esc(c.optReason)}
                </div>
              </div>
            `;
          }).join('') : '<div style="color:var(--muted);font-size:12px;padding:8px 0;">当前筛选条件下暂无此类推荐谱面。</div>'}
        </div>
      </div>
    `).join('');

    main.querySelectorAll('.sp-side-inline-btn').forEach((btn) => {
      btn.addEventListener('click', () => setSpSide(btn.dataset.spSide));
    });
    main.querySelectorAll('.rank-row').forEach((el) => {
      el.addEventListener('click', () => selectChart(el.dataset.id, true));
    });
  }

  function renderDpOptionView(list) {
    const main = document.getElementById('main-panel');
    const groups = [
      { title: '1M / 2M / M/M 单双镜减负 Top 12（平行转对称 / 小指减负）', items: list.filter((c) => ['1M', '2M', 'M/M'].includes(c.optShort)).sort((a, b) => b.optGain - a.optGain).slice(0, 12) },
      { title: 'FLIP 系 (F / F1M / F2M / 逆正規 FM/M) 减负 Top 12（右利手承重 P1>P2）', items: list.filter((c) => c.optShort && c.optShort.startsWith('F')).sort((a, b) => b.optGain - a.optGain).slice(0, 12) },
      { title: 'R乱 / 両乱 / S乱 随机系推荐 Top 12（避开無理押し/無理皿/縦連）', items: list.filter((c) => c.optShort && c.optShort.includes('R')).sort((a, b) => b.optGain - a.optGain).slice(0, 12) },
    ];

    const nonRegCnt = list.filter((c) => c.optShort && c.optShort !== '-').length;
    const summaryBanner = `
      <div class="card board-toolbar">
        <div style="font-size:12px;color:var(--muted);">
          当前筛选共 <b class="mono" style="color:var(--ink);">${list.length.toLocaleString()}</b> 张 DP 谱面，其中 <b class="mono" style="color:var(--dp-ink);">${nonRegCnt.toLocaleString()}</b> 谱（${list.length ? ((nonRegCnt / list.length) * 100).toFixed(1) : '0.0'}%）推荐非正规选项（仅限标准 AC DP 合法选项）
        </div>
      </div>
      <details class="card opt-explain-banner">
        <summary>什么是 DP「手型减负 -X%」？点击查看说明</summary>
        <div class="opt-explain-body">
          <p><b>含义：</b>仅在标准 AC 合法 DP 选项（<code>FLIP</code> + 1P/2P 独立 <code>OFF/MIR/R-RAN/RAN/S-RAN</code>）中求解，量化相对正規降低的单手弱指、無理押し、無理皿及左右盘不均衡负荷百分比。</p>
        </div>
      </details>
    `;

    main.innerHTML = summaryBanner + groups.map((g) => `
      <div class="card rank-card">
        <h3>${g.title}</h3>
        <div>
          ${g.items.length ? g.items.map((c, i) => {
            const rec = getUserRecord('dp', c.id);
            const lampPill = rec ? renderLampBadge(rec.lampMeta, { style: 'margin-left:5px;' }) : '';
            return `
              <div data-id="${c.id}" class="rank-row">
                <div style="font-weight:600;">
                  <span class="mono" style="color:var(--muted);margin-right:6px;">${String(i + 1).padStart(2, '0')}.</span>
                  <span class="chip-lv mono" style="margin-right:4px;">★${c.lv}</span>
                  <span class="diff-${c.dChar}" style="margin-right:4px;">[${c.dChar}]</span>
                  ${esc(c.title)}
                  <span class="chip-opt" style="margin-left:6px;">${esc(c.bestOpt)}</span>
                  ${lampPill}
                </div>
                <div class="mono" style="color:var(--muted);">
                  减负 <b style="color:var(--pos);">-${(c.optGain * 100).toFixed(1)}%</b> · P1/P2 ${c.p1Notes}/${c.p2Notes} · ${esc(c.optReason)}
                </div>
              </div>
            `;
          }).join('') : '<div style="color:var(--muted);font-size:12px;padding:8px 0;">当前筛选条件下暂无此类推荐谱面。</div>'}
        </div>
      </div>
    `).join('');

    main.querySelectorAll('.rank-row').forEach((el) => {
      el.addEventListener('click', () => selectChart(el.dataset.id, true));
    });
  }

  function renderRadarSvg(vals, mode, baselineRing) {
    const cfg = RADAR_CFG[mode];
    const cx = 148, cy = 108, R = 68, n = 8;
    const pt = (i, r) => {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r];
    };
    let grid = '', axes = '', labels = '';
    for (const frac of [0.25, 0.5, 0.75, 1.0]) {
      const poly = Array.from({ length: n }, (_, i) => pt(i, R * frac).map((v) => v.toFixed(1)).join(',')).join(' ');
      grid += `<polygon points="${poly}" fill="none" stroke="currentColor" opacity="${frac === 1 ? 0.24 : 0.12}" stroke-width="1" />`;
    }
    if (baselineRing) {
      const basePoly = Array.from({ length: n }, (_, i) => pt(i, R * baselineRing).map((v) => v.toFixed(1)).join(',')).join(' ');
      grid += `<polygon points="${basePoly}" fill="none" stroke="#f59e0b" stroke-dasharray="4 3" opacity="0.7" stroke-width="1.4" />`;
    }
    for (let i = 0; i < n; i++) {
      const [x2, y2] = pt(i, R);
      axes += `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="currentColor" opacity="0.16" />`;
      const [lx, ly] = pt(i, R + 17);
      const anchor = Math.abs(lx - cx) < 8 ? 'middle' : (lx > cx ? 'start' : 'end');
      labels += `<text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="${anchor}" font-size="9.5" fill="currentColor" opacity="0.86">${cfg.labels[i]}</text>`;
    }
    const polyPts = vals.map((v, i) => pt(i, R * Math.max(0.06, Math.min(1, v / 100))).map((x) => x.toFixed(1)).join(',')).join(' ');
    const dots = vals.map((v, i) => {
      const [dx, dy] = pt(i, R * Math.max(0.06, Math.min(1, v / 100)));
      const dotCol = baselineRing ? (v >= baselineRing * 100 + 3 ? '#22c55e' : (v <= baselineRing * 100 - 3 ? '#f43f5e' : '#94a3b8')) : cfg.cols[i];
      return `<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="3.4" fill="${dotCol}" />`;
    }).join('');
    const fill = baselineRing ? 'rgba(245, 158, 11, 0.18)' : cfg.fill;
    const stroke = baselineRing ? '#f59e0b' : cfg.stroke;
    return `
      <svg viewBox="0 0 296 216" style="width:100%;height:206px;display:block;">
        ${grid}${axes}
        <polygon points="${polyPts}" fill="${fill}" stroke="${stroke}" stroke-width="2" />
        ${dots}${labels}
      </svg>
    `;
  }

  function renderSparkline(curve, mode) {
    const w = 320, h = 72;
    const maxV = Math.max(5, ...curve);
    const bw = w / curve.length;
    const barCol = mode === 'dp' ? '#14b8a6' : '#3b82f6';
    const bars = curve.map((v, i) => {
      const bh = Math.max(2, (v / maxV) * (h - 14));
      const isLast20 = i >= Math.floor(curve.length * 0.8);
      const fill = isLast20 ? '#f97316' : barCol;
      return `<rect x="${(i * bw + 0.8).toFixed(1)}" y="${(h - bh - 10).toFixed(1)}" width="${Math.max(2, bw - 1.6).toFixed(1)}" height="${bh.toFixed(1)}" rx="1.5" fill="${fill}" opacity="${isLast20 ? 0.92 : 0.78}"></rect>`;
    }).join('');
    return `
      <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:74px;display:block;">
        <line x1="${(w * 0.8).toFixed(1)}" y1="2" x2="${(w * 0.8).toFixed(1)}" y2="${h - 10}" stroke="#f97316" stroke-dasharray="3 2" stroke-width="1" opacity="0.6" />
        ${bars}
        <text x="2" y="${h - 1}" font-size="9" fill="currentColor" opacity="0.55">0%</text>
        <text x="${(w * 0.5 - 10).toFixed(0)}" y="${h - 1}" font-size="9" fill="currentColor" opacity="0.55">50%</text>
        <text x="${(w * 0.8 - 2).toFixed(0)}" y="${h - 1}" font-size="9" fill="#f97316">尾杀区(80%+)</text>
      </svg>
    `;
  }

  function buildInspectorHtml(c) {
    if (!c) {
      return '<div style="font-size:12px;color:var(--muted);text-align:center;padding:18px 0;">点击左侧任意谱面查看八维能力雷达、推荐选项、难度曲线与四血条评分。</div>';
    }
    const cfg = RADAR_CFG[c.mode];
    const isDp = c.mode === 'dp';
    const rec = getUserRecord(c.mode, c.id);

    let playerCard = '';
    if (rec) {
      const scoreText = rec.hasScore
        ? `${rec.score.toLocaleString()} (${(rec.exRate * 100).toFixed(1)}% · ${rec.dj || '-'})`
        : '旧代继承灯 (本代未刷新分数)';
      const bpText = rec.hasBp ? `${rec.bp} BP (${(rec.bpRate * 100).toFixed(1)}%)` : '—';
      const eg = state.csvReport?.evalGauge || 'nc';
      const egShort = eg.toUpperCase();
      const egReqRank = eg === 'hc' ? 5 : 4;
      const egTheta = state.csvReport?.irt?.[eg]?.theta;
      let diffHint = '';
      if (egTheta !== null && egTheta !== undefined) {
        const gap = c['s_' + eg] - egTheta;
        if (rec.lampRank >= egReqRank && gap >= 2.0) diffHint = `超越个人 ${egShort} 能力线 +${gap.toFixed(1)} CP 的高光过关！`;
        else if (rec.lampRank < egReqRank && gap <= 0.5) diffHint = `定数低于/紧贴你的 ${egShort} 能力线 (${gap >= 0 ? '+' : ''}${gap.toFixed(1)} CP)，极佳推灯目标！`;
        else diffHint = `相对个人 ${egShort} 能力线：${gap >= 0 ? '+' : ''}${gap.toFixed(1)} CP`;
      }
      let histHtml = '';
      const modeSnaps = state.csvSnapshots.filter((s) => s.mode === c.mode);
      if (modeSnaps.length >= 2 && window.IIDXCsvAnalyzer?.buildSongTimeline) {
        const A = window.IIDXCsvAnalyzer;
        const fk = A.getRecordFallbackKey(c);
        const pts = A.buildSongTimeline(modeSnaps, c.id, fk);
        const milestones = pts.filter((p, idx) => idx === 0 || p.changed || idx === pts.length - 1);
        if (milestones.some((p, idx) => idx > 0 && p.changed)) {
          const shown = milestones.slice(-4);
          histHtml = `
            <div class="player-ins-hist">
              <div class="player-ins-hist-head">本地快照变化（${milestones.length} 个节点）</div>
              <div class="player-ins-hist-rows mono">
                ${shown.map((p) => {
                  const sDelta = p.scoreDelta > 0 ? `<span class="hist-delta-pos">+${p.scoreDelta}</span>` : '';
                  const bDelta = p.bpDelta !== null && p.bpDelta < 0 ? `<span class="hist-delta-pos">${p.bpDelta}</span>` : '';
                  return `
                    <div class="player-ins-hist-row">
                      <span class="hist-dt">${esc(p.snapDate.slice(0, 10))}</span>
                      ${renderLampBadge(p.rec.lampMeta)}
                      <span>${p.rec.hasScore ? `EX ${p.rec.score.toLocaleString()} ${sDelta}` : '旧代灯'}</span>
                      <span>${p.rec.hasBp ? `BP ${p.rec.bp} ${bDelta}` : ''}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }
      }
      playerCard = `
        <div class="player-ins-card">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span style="font-weight:800;color:var(--coach-ink);">我的实测记录</span>
            ${renderLampBadge(rec.lampMeta, { full: true })}
          </div>
          <div class="mono" style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
            <div>EX: <b>${esc(scoreText)}</b></div>
            <div>Miss: <b>${esc(bpText)}</b></div>
            ${rec.hasScore ? (rec.isSyntheticPgGr ? '<div title="源 CSV 中该谱面 PGreat=⌊EX/2⌋、Great=EX%2，属于未保存真实判定细分的占位导出值">PG / GR: <b style="color:var(--muted);">未记录 (EX推算)</b></div>' : `<div>PG / GR: <b>${rec.pg} / ${rec.gr}</b></div>`) : ''}
            <div>游玩: <b>${rec.playCount} 次</b> · ${esc(rec.lastPlayed || '—')}</div>
          </div>
          ${diffHint ? `<div style="font-size:11.5px;color:var(--ink-2);">${esc(diffHint)}</div>` : ''}
          ${histHtml}
        </div>
      `;
    }

    let optCard = '';
    let gripCard = '';
    const optGainVerdict = (gain) => {
      if (gain >= 0.08) return '正规极易卡手，强烈建议优先切此选项';
      if (gain >= 0.04) return '能明显改善顺手度，卡灯时优先尝试';
      if (gain >= 0.02) return '有一定手型优化空间，按个人习惯选择';
      return '正规手型已较均衡，按习惯选即可';
    };

    if (isDp) {
      const pTot = Math.max(1, c.p1Notes + c.p2Notes);
      const p1Pct = (c.p1Notes / pTot * 100).toFixed(1);
      const p2Pct = (c.p2Notes / pTot * 100).toFixed(1);
      const diffStr = c.p1Notes === c.p2Notes ? '完全均衡' : (c.p1Notes > c.p2Notes ? `P1 偏重 +${c.p1Notes - c.p2Notes}` : `P2 偏重 +${c.p2Notes - c.p1Notes}`);
      const dpGainPct = (c.optGain * 100).toFixed(1);
      optCard = `
        <div class="inset-box" style="display:flex;flex-direction:column;gap:8px;font-size:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
            <span style="font-weight:800;color:var(--dp-ink);">DP 多选项生物力学推荐</span>
            <div class="opt-gain-wrap">
              <span class="opt-gain-badge mono">手型减负 -${dpGainPct}%</span>
              <span class="help-tip-wrap">
                <button type="button" class="help-tip-btn" aria-label="查看手型减负说明">?</button>
                <div class="help-tip-pop" role="tooltip">
                  <div class="help-tip-title">什么是 DP「手型减负 -${dpGainPct}%」？</div>
                  <p>仅在标准 AC 合法 DP 选项中求解，量化相对「正規 (-)」预计降低的单手弱指、無理押し、無理皿与左右盘承重失衡比例（仅改善顺手度，不减少总物量）。</p>
                  <div class="help-tip-foot">-8%以上 强烈推荐 · -4%~-8% 明显顺手 · -2%以内 正規已均衡</div>
                </div>
              </span>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:6px 8px;">
              <div style="font-size:10.5px;color:var(--muted);">全局最优选项</div>
              <div style="font-weight:800;color:var(--dp-ink);margin-top:2px;">${esc(c.bestOpt)}</div>
            </div>
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:6px 8px;">
              <div style="font-size:10.5px;color:var(--muted);">最优固定(非随机)</div>
              <div style="font-weight:800;margin-top:2px;">${esc(c.fixedOpt)}</div>
            </div>
          </div>
          <div style="font-size:11.5px;color:var(--ink-2);">依据：${esc(c.optReason)} · <span style="color:var(--muted);">${optGainVerdict(c.optGain)}</span></div>
          <div>
            <div class="mono" style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
              <span>左盘 P1: <b>${c.p1Notes}</b> (${p1Pct}%)</span>
              <span style="color:var(--muted);">${diffStr}</span>
              <span>右盘 P2: <b>${c.p2Notes}</b> (${p2Pct}%)</span>
            </div>
            <div style="height:7px;border-radius:4px;overflow:hidden;display:flex;background:var(--border);">
              <div style="width:${p1Pct}%;background:#38bdf8;"></div>
              <div style="width:${p2Pct}%;background:#14b8a6;"></div>
            </div>
          </div>
        </div>
      `;
    } else if ((c.leftNotes || 0) + (c.rightNotes || 0) > 0) {
      const is2p = state.spSide === '2p';
      const kTot = Math.max(1, c.leftNotes + c.rightNotes);
      const lPct = (c.leftNotes / kTot * 100).toFixed(1);
      const rPct = (c.rightNotes / kTot * 100).toFixed(1);
      const lRatio = c.leftNotes / kTot;
      const balStr = is2p
        ? (lRatio < 0.53 ? '2P 皿侧偏重' : (lRatio > 0.63 ? '左手 1–4 偏重' : '2P 键位均衡'))
        : (lRatio > 0.47 ? '1P 皿侧偏重' : (lRatio < 0.37 ? '右手 4–7 偏重' : '1P 键位均衡'));
      const leftLabel = is2p ? '左手 1–4键' : '左手 1–3键(皿)';
      const rightLabel = is2p ? '右手 5–7键(皿)' : '右手 4–7键';
      const leftCol = is2p ? '#3b82f6' : '#f59e0b';
      const rightCol = is2p ? '#f59e0b' : '#3b82f6';
      const spGainPct = (c.optGain * 100).toFixed(1);
      optCard = `
        <div class="inset-box" style="display:flex;flex-direction:column;gap:8px;font-size:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
            <span style="font-weight:800;color:var(--accent-ink);">SP 多选项生物力学推荐 (${is2p ? '2P 右皿' : '1P 左皿'})</span>
            <div class="opt-gain-wrap">
              <span class="opt-gain-badge mono">手型减负 -${spGainPct}%</span>
              <span class="help-tip-wrap">
                <button type="button" class="help-tip-btn" aria-label="查看手型减负说明">?</button>
                <div class="help-tip-pop" role="tooltip">
                  <div class="help-tip-title">什么是「手型减负 -${spGainPct}%」？</div>
                  <p>基于当前 ${is2p ? '2P 右皿' : '1P 左皿'} 指法模型，综合计算皿侧按键压迫、1-2/6-7 弱指连打、手指耦合阻力、黑白键顺手度与固定纵连五项负荷；相对「正規 (-)」预计降低的手型负荷比例（随机系按多组排列期望均值估算，不减少总物量）。</p>
                  <div class="help-tip-foot">-8%以上 强烈推荐 · -4%~-8% 明显顺手 · -2%以内 正規已均衡</div>
                </div>
              </span>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:6px 8px;">
              <div style="font-size:10.5px;color:var(--muted);">全局最优选项</div>
              <div style="font-weight:800;color:var(--accent-ink);margin-top:2px;">${esc(c.bestOpt)}</div>
            </div>
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:6px 8px;">
              <div style="font-size:10.5px;color:var(--muted);">最优固定(非随机)</div>
              <div style="font-weight:800;margin-top:2px;">${esc(c.fixedOpt)}</div>
            </div>
          </div>
          <div style="font-size:11.5px;color:var(--ink-2);">依据：${esc(c.optReason)} · <span style="color:var(--muted);">${optGainVerdict(c.optGain)}</span></div>
          <div>
            <div class="mono" style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
              <span>${leftLabel}: <b>${c.leftNotes}</b> (${lPct}%)</span>
              <span style="color:var(--muted);">${balStr}</span>
              <span>${rightLabel}: <b>${c.rightNotes}</b> (${rPct}%)</span>
            </div>
            <div style="height:7px;border-radius:4px;overflow:hidden;display:flex;background:var(--border);">
              <div style="width:${lPct}%;background:${leftCol};"></div>
              <div style="width:${rPct}%;background:${rightCol};"></div>
            </div>
          </div>
        </div>
      `;

      // SP Alternate-Grip Technique Recommendation based on player's chosen main grip
      const A = window.IIDXCsvAnalyzer;
      if (A && A.recommendGripForChart && A.SP_GRIP_STYLES) {
        const gRec = A.recommendGripForChart(c, state.spStyle, state.spSide);
        const styleOpts = Object.values(A.SP_GRIP_STYLES).map((st) =>
          `<option value="${st.key}" ${state.spStyle === st.key ? 'selected' : ''}>${esc(st.short)}</option>`
        ).join('');
        gripCard = `
          <div class="inset-box grip-ins-card">
            <div class="grip-ins-head">
              <span style="font-weight:800;font-size:12px;">手法通关建议</span>
              <label class="grip-inline-pick">
                <span>主力:</span>
                <select class="select-input ins-grip-select" aria-label="选择你的常用手法">${styleOpts}</select>
              </label>
            </div>
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;">
              <span class="grip-pill ${gRec.needsSwitch ? 'grip-pill-switch' : 'grip-pill-ok'}">${esc(gRec.primary.altGrip)}</span>
              ${gRec.secondary ? `<span class="grip-pill grip-pill-alt">备选: ${esc(gRec.secondary.badge)}</span>` : ''}
            </div>
            <div style="font-size:11.5px;color:var(--ink-2);line-height:1.5;">${esc(gRec.primary.reason)}</div>
            ${gRec.primary.optHint ? `<div style="font-size:11px;color:var(--accent-ink);font-weight:600;">${esc(gRec.primary.optHint)}</div>` : ''}
          </div>
        `;
      }
    }

    const textageBtnLabel = isDp ? 'Textage DP ↗' : `Textage ${state.spSide.toUpperCase()} ↗`;
    const practiceBtnHtml = isDp ? '' : renderPracticeLink(c, false);
    const sidePracticeNote = (!isDp && state.spSide === '2p')
      ? '<span class="ins-action-note">自动导入 1P 源谱，练习页可切右皿</span>'
      : '';

    return `
      <div class="ins-head">
        <div style="min-width:0;flex:1;">
          <div class="ins-badges">
            <span class="pill diff-${c.dChar}">${c.diff} ★${c.lv}</span>
            <span class="pill">${c.kj ? '個人差' : '地力'}</span>
            <span class="pill" style="color:${isDp ? 'var(--dp-ink)' : 'var(--accent-ink)'};">推荐: ${esc(c.bestOpt)}</span>
            ${!c.ac ? '<span class="pill" style="background:var(--warn-soft);color:var(--warn);border-color:transparent;">非当前AC</span>' : ''}
          </div>
          <h2 class="ins-title">${esc(c.title)}</h2>
          <p class="ins-meta">${esc(c.artist)} · ${esc(c.verCode)} ${esc(c.ver)}</p>
        </div>
      </div>

      <div class="ins-action-row">
        ${practiceBtnHtml}
        <a href="${esc(c.url)}" target="_blank" rel="noopener" class="btn btn-sm">${textageBtnLabel}</a>
        ${sidePracticeNote}
      </div>

      ${playerCard}

      <div class="gauge-grid-4">
        ${[
          ['EC', c.tier_ec, c.rate_ec, c.s_ec, '#22c55e'],
          ['NC', c.tier_nc, c.rate_nc, c.s_nc, '#38bdf8'],
          ['HC', c.tier_hc, c.rate_hc, c.s_hc, '#ef4444'],
          ['EXHC', c.tier_exhc, c.rate_exhc, c.s_exhc, '#eab308'],
        ].map(([lbl, t, r, s, col]) => `
          <div class="gauge-box">
            <div style="font-size:11px;font-weight:800;color:${col};">${lbl}</div>
            <div style="margin-top:4px;"><span class="tier-badge ${tierCls(t)}">${t}</span></div>
            <div class="mono" style="font-size:12px;font-weight:800;margin-top:4px;">${r.toFixed(2)}</div>
            <div class="mono" style="font-size:10.5px;color:var(--muted);">CP ${s.toFixed(1)}</div>
          </div>
        `).join('')}
      </div>

      ${optCard}
      ${gripCard}

      <div class="stat-grid-3 mono">
        <div><span style="color:var(--muted);">BPM:</span> <b>${esc(c.bpm)}</b></div>
        <div><span style="color:var(--muted);">Notes:</span> <b>${c.notes}</b></div>
        <div><span style="color:var(--muted);">时长:</span> <b>${c.time}s</b></div>
        <div><span style="color:var(--muted);">均密:</span> <b>${c.avgNps.toFixed(1)}</b>/s</div>
        <div><span style="color:var(--muted);">峰密:</span> <b>${c.peakNps.toFixed(1)}</b>/s</div>
        <div><span style="color:var(--muted);">尾/峰:</span> <b>${c.lastKill.toFixed(2)}x/${c.spike.toFixed(2)}x</b></div>
      </div>

      <div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;">
          <span style="font-weight:700;">${isDp ? 'DP 八维平衡能力雷达' : 'SP 八维平衡能力雷达'} (0–100)</span>
          <span style="color:var(--muted);">${esc(c.tags.join(' / '))}</span>
        </div>
        <div class="inset-box">
          ${renderRadarSvg(c.radar, c.mode, null)}
          <div class="radar-legend-grid mono">
            ${c.radar.map((v, i) => `<div style="display:flex;justify-content:space-between;padding:0 3px;"><span class="truncate" style="color:var(--muted);">${cfg.labels[i].split('/')[0]}</span><b style="color:${cfg.cols[i]};">${v}</b></div>`).join('')}
          </div>
        </div>
      </div>

      <div>
        <div style="font-size:12px;font-weight:700;margin-bottom:5px;">全曲实时物理压力曲线（橙色为尾杀区 80%–100%）</div>
        <div class="inset-box">${renderSparkline(c.curve, c.mode)}</div>
      </div>
    `;
  }

  let helpTipOutsideBound = false;
  function bindInspectorInteractive(container, modalCtx) {
    if (!container) return;
    const sel = container.querySelector('.ins-grip-select');
    if (sel) {
      sel.addEventListener('change', (e) => setSpStyle(e.target.value, modalCtx));
    }
    container.querySelectorAll('.help-tip-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wrap = btn.closest('.help-tip-wrap');
        if (!wrap) return;
        const willOpen = !wrap.classList.contains('is-open');
        document.querySelectorAll('.help-tip-wrap.is-open').forEach((el) => el.classList.remove('is-open'));
        if (willOpen) wrap.classList.add('is-open');
      });
    });
    if (!helpTipOutsideBound) {
      helpTipOutsideBound = true;
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.help-tip-wrap')) {
          document.querySelectorAll('.help-tip-wrap.is-open').forEach((el) => el.classList.remove('is-open'));
        }
      });
    }
  }

  function renderInspector() {
    const mode = activeExplorerMode();
    const panel = document.getElementById('inspector');
    const c = CHART_BY_ID[mode].get(state.selectedId);
    panel.innerHTML = buildInspectorHtml(c);
    bindInspectorInteractive(panel, null);
  }

  function selectChart(chartId, openPopup) {
    state.selectedId = chartId;
    renderInspector();
    if (openPopup && isCompactInspector()) {
      openChartModal(activeExplorerMode(), chartId);
    }
  }

  function isModalOpen() {
    const m = document.getElementById('chart-modal');
    return !!(m && !m.classList.contains('hidden'));
  }

  function openChartModal(mode, chartId) {
    const c = CHART_BY_ID[mode].get(chartId);
    if (!c) return;
    hideLampTooltip();
    const body = document.getElementById('modal-inspector-body');
    const card = document.getElementById('chart-modal-card');
    body.innerHTML = buildInspectorHtml(c);
    bindInspectorInteractive(body, { modalMode: mode, modalChartId: chartId });
    body.scrollTop = 0;
    if (card) card.style.transform = '';
    document.getElementById('chart-modal').classList.remove('hidden');
    document.body.classList.add('modal-open');
    syncMobileFab();
  }

  function closeChartModal() {
    const modal = document.getElementById('chart-modal');
    const card = document.getElementById('chart-modal-card');
    if (modal) modal.classList.add('hidden');
    if (card) card.style.transform = '';
    document.body.classList.remove('modal-open');
    syncMobileFab();
  }

  function bindChipClicks() {
    document.querySelectorAll('.chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.chip.selected').forEach((x) => x.classList.remove('selected'));
        btn.classList.add('selected');
        selectChart(btn.dataset.id, true);
      });
    });
  }

  // ==================== Local CSV Snapshot Store (IndexedDB + Fallback) ====================

  let _snapDbPromise = null;
  function openSnapshotDb() {
    if (_snapDbPromise) return _snapDbPromise;
    _snapDbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      try {
        const req = indexedDB.open(SNAPSHOT_DB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(SNAPSHOT_STORE_NAME)) {
            db.createObjectStore(SNAPSHOT_STORE_NAME, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('IDB open error'));
      } catch (err) {
        reject(err);
      }
    });
    return _snapDbPromise;
  }

  function readFallbackSnapshots() {
    try {
      const raw = localStorage.getItem(SNAPSHOT_FALLBACK_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function writeFallbackSnapshots(list) {
    try {
      const trimmed = list.slice(-8).map((s, idx, arr) => (
        idx < arr.length - 2 ? { ...s, rawText: null } : s
      ));
      localStorage.setItem(SNAPSHOT_FALLBACK_KEY, JSON.stringify(trimmed));
    } catch (_) {}
  }

  const SnapshotStore = {
    async loadAll() {
      const A = window.IIDXCsvAnalyzer;
      try {
        const db = await openSnapshotDb();
        const rows = await new Promise((resolve, reject) => {
          const tx = db.transaction(SNAPSHOT_STORE_NAME, 'readonly');
          const req = tx.objectStore(SNAPSHOT_STORE_NAME).getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
        return A?.sortSnapshotsChrono ? A.sortSnapshotsChrono(rows) : rows;
      } catch (_) {
        const fb = readFallbackSnapshots();
        return A?.sortSnapshotsChrono ? A.sortSnapshotsChrono(fb) : fb;
      }
    },
    async put(snap) {
      try {
        const db = await openSnapshotDb();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(SNAPSHOT_STORE_NAME, 'readwrite');
          tx.objectStore(SNAPSHOT_STORE_NAME).put(snap);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch (_) {
        const fb = readFallbackSnapshots().filter((x) => x.id !== snap.id);
        fb.push(snap);
        writeFallbackSnapshots(fb);
      }
    },
    async remove(id) {
      try {
        const db = await openSnapshotDb();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(SNAPSHOT_STORE_NAME, 'readwrite');
          tx.objectStore(SNAPSHOT_STORE_NAME).delete(id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch (_) {
        const fb = readFallbackSnapshots().filter((x) => x.id !== id);
        writeFallbackSnapshots(fb);
      }
    },
  };

  function getModeSnapshots(mode) {
    const m = mode || state.csvMode || 'sp';
    const A = window.IIDXCsvAnalyzer;
    const list = state.csvSnapshots.filter((s) => s.mode === m);
    return A?.sortSnapshotsChrono ? A.sortSnapshotsChrono(list) : list;
  }

  function ensureHistoryPairSelection(mode, preferLatest = false) {
    const modeSnaps = getModeSnapshots(mode);
    if (modeSnaps.length < 2) {
      state.csvHistBaseId = null;
      state.csvHistTargetId = modeSnaps[0]?.id || null;
      return;
    }
    const idSet = new Set(modeSnaps.map((s) => s.id));
    if (preferLatest || !idSet.has(state.csvHistTargetId) || !idSet.has(state.csvHistBaseId) || state.csvHistBaseId === state.csvHistTargetId) {
      state.csvHistBaseId = modeSnaps[modeSnaps.length - 2].id;
      state.csvHistTargetId = modeSnaps[modeSnaps.length - 1].id;
    }
  }

  async function saveSnapshotWithDedup(snap) {
    const A = window.IIDXCsvAnalyzer;
    const existing = state.csvSnapshots.find((s) => s.mode === snap.mode && s.contentHash === snap.contentHash);
    if (existing) {
      if (!existing.rawText && snap.rawText) {
        existing.rawText = snap.rawText;
        await SnapshotStore.put(existing);
      }
      return { status: 'duplicate', snapshot: existing };
    }
    await SnapshotStore.put(snap);
    state.csvSnapshots = A.sortSnapshotsChrono([...state.csvSnapshots, snap]);
    return { status: 'saved', snapshot: snap };
  }

  async function autoArchiveCurrentReport(report, rawText, silent = false) {
    if (!report || !window.IIDXCsvAnalyzer?.buildCsvSnapshot) return null;
    try {
      const snap = window.IIDXCsvAnalyzer.buildCsvSnapshot(report, rawText);
      const res = await saveSnapshotWithDedup(snap);
      state.csvActiveSnapshotId = res.snapshot.id;
      ensureHistoryPairSelection(report.mode, res.status === 'saved');
      if (!silent) {
        const modeCnt = getModeSnapshots(report.mode).length;
        state.csvHistNotice = res.status === 'saved'
          ? `已自动备份到本地快照库（${report.mode.toUpperCase()} 共 ${modeCnt} 份）`
          : `本机快照库中已存在完全相同的成绩记录（跳过重复存档）`;
      }
      if (state.tab === 'csv' && state.csvReport) {
        renderCsvWorkspace();
      }
      return res;
    } catch (_) {
      return null;
    }
  }

  async function loadSnapshotsOnBoot() {
    const loaded = await SnapshotStore.loadAll();
    state.csvSnapshots = loaded;
    state.csvSnapshotsLoaded = true;
    if (state.csvReport && state.csvRawText) {
      await autoArchiveCurrentReport(state.csvReport, state.csvRawText, true);
    } else if (loaded.length > 0) {
      ensureHistoryPairSelection(state.csvMode, true);
      if (state.tab === 'csv') renderCsvWorkspace();
    }
  }

  function loadSnapshotIntoWorkspace(snap) {
    if (!snap) return;
    if (!snap.rawText) {
      state.csvHistNotice = '该快照仅含统计摘要（无原始 CSV 文本），无法切换主报告，但可直接用于下方历史对比与单曲轨迹查询。';
      renderCsvWorkspace();
      return;
    }
    state.csvHistNotice = `已载入历史快照：${snap.latestPlayDate || snap.savedAt.slice(0, 10)}${snap.label ? `（${snap.label}）` : ''}`;
    handleCsvText(snap.rawText, snap.filename, snap.mode, {
      skipSaveSnapshot: true,
      activeSnapshotId: snap.id,
      preserveSection: true,
    });
  }

  async function deleteLocalSnapshot(id) {
    const target = state.csvSnapshots.find((s) => s.id === id);
    if (!target) return;
    await SnapshotStore.remove(id);
    state.csvSnapshots = state.csvSnapshots.filter((s) => s.id !== id);
    if (state.csvActiveSnapshotId === id) state.csvActiveSnapshotId = null;
    ensureHistoryPairSelection(target.mode, true);
    state.csvHistNotice = `已删除本地快照（${target.latestPlayDate || target.filename}）`;
    renderCsvWorkspace();
  }

  async function updateLocalSnapshotLabel(id, nextLabel) {
    const target = state.csvSnapshots.find((s) => s.id === id);
    if (!target) return;
    target.label = String(nextLabel || '').trim().slice(0, 32);
    await SnapshotStore.put(target);
    renderCsvWorkspace();
  }

  function readFileAsTextAsync(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(window.IIDXCsvAnalyzer.decodeCsvBuffer(reader.result));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  }

  async function batchImportCsvFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const A = window.IIDXCsvAnalyzer;
    let added = 0;
    let dup = 0;
    let failed = 0;
    let newestSnap = null;
    const currentMode = state.csvReport?.mode || null;

    for (const f of files) {
      try {
        const txt = await readFileAsTextAsync(f);
        const parsed = A.parseKonamiCsv(txt, f.name);
        const mode = A.detectBestMode(parsed, DATASETS);
        const matched = A.matchCsvToCatalog(parsed, DATASETS[mode], mode);
        const rep = A.analyzePlayerPerformance(matched, DATASETS[mode], RADAR_CFG[mode], {
          spStyle: state.spStyle,
          spSide: state.spSide,
        });
        const snap = A.buildCsvSnapshot(rep, txt);
        const res = await saveSnapshotWithDedup(snap);
        if (res.status === 'saved') added++;
        else dup++;
        if (!newestSnap || A.getSnapshotSortKey(res.snapshot) > A.getSnapshotSortKey(newestSnap)) {
          if (!currentMode || res.snapshot.mode === currentMode) newestSnap = res.snapshot;
        }
      } catch (_) {
        failed++;
      }
    }

    const activeMode = currentMode || newestSnap?.mode || state.csvMode || 'sp';
    ensureHistoryPairSelection(activeMode, true);
    const parts = [];
    if (added) parts.push(`新增 ${added} 份快照`);
    if (dup) parts.push(`跳过 ${dup} 份重复`);
    if (failed) parts.push(`${failed} 份解析失败`);
    state.csvHistNotice = `批量导入完成：${parts.join('，') || '无新增'}`;

    if (!state.csvReport && newestSnap?.rawText) {
      handleCsvText(newestSnap.rawText, newestSnap.filename, newestSnap.mode, {
        skipSaveSnapshot: true,
        activeSnapshotId: newestSnap.id,
        preserveSection: true,
      });
      return;
    }
    state.csvSectionTab = 'history';
    renderCsvWorkspace();
  }

  function exportLocalSnapshotsJson() {
    if (!state.csvSnapshots.length) {
      state.csvHistNotice = '当前没有可导出的本地快照。';
      renderCsvWorkspace();
      return;
    }
    const payload = {
      schema: 'iidx-textage-snapshots-v1',
      exportedAt: new Date().toISOString(),
      count: state.csvSnapshots.length,
      snapshots: state.csvSnapshots,
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.href = url;
    a.download = `iidx-csv-snapshots-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    state.csvHistNotice = `已导出 ${state.csvSnapshots.length} 份本地快照备份 JSON 文件。`;
    renderCsvWorkspace();
  }

  async function importLocalSnapshotsJson(text) {
    try {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.snapshots) ? parsed.snapshots : null);
      if (!arr) throw new Error('JSON 格式不正确（缺少 snapshots 数组）。');
      let added = 0;
      let dup = 0;
      for (const s of arr) {
        if (!s || (s.mode !== 'sp' && s.mode !== 'dp') || !Array.isArray(s.records) || !s.contentHash) continue;
        const cleanSnap = {
          ...s,
          id: s.id || `snap_${s.mode}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        };
        const res = await saveSnapshotWithDedup(cleanSnap);
        if (res.status === 'saved') added++;
        else dup++;
      }
      ensureHistoryPairSelection(state.csvMode, true);
      state.csvHistNotice = `本地备份恢复完成：新增 ${added} 份快照${dup ? `，跳过 ${dup} 份重复` : ''}。`;
      if (!state.csvReport) {
        const latestWithRaw = [...state.csvSnapshots].reverse().find((s) => s.rawText);
        if (latestWithRaw) {
          handleCsvText(latestWithRaw.rawText, latestWithRaw.filename, latestWithRaw.mode, {
            skipSaveSnapshot: true,
            activeSnapshotId: latestWithRaw.id,
            preserveSection: true,
          });
          return;
        }
      }
      renderCsvWorkspace();
    } catch (err) {
      state.csvHistNotice = `备份文件导入失败：${err.message || err}`;
      renderCsvWorkspace();
    }
  }

  // ==================== CSV Import & Coaching Workspace ====================

  function handleCsvText(text, filename, forcedMode, opts = {}) {
    try {
      const A = window.IIDXCsvAnalyzer;
      const parsed = A.parseKonamiCsv(text, filename);
      const mode = forcedMode || A.detectBestMode(parsed, DATASETS);
      state.csvRawText = text;
      state.csvFilename = filename;
      state.csvMode = mode;
      state.csvParsed = parsed;
      state.csvTargetGaugeManual = false;
      state.csvTargetLevel = 0;
      state.csvError = null;
      if (opts.activeSnapshotId) state.csvActiveSnapshotId = opts.activeSnapshotId;
      recomputeCsvReport();

      if (state.csvReport) {
        setModeLevels(mode, getCsvFocusLevels(state.csvReport), 'csv');
        state.tiers.clear();
        resetCpRange();
        state.selectedId = null;
        state.tablePage = 1;
        state.expandedGroups.clear();
      }

      try {
        localStorage.setItem(CSV_STORAGE_KEY, JSON.stringify({ text, filename, mode }));
      } catch (_) {}

      if (state.csvReport && !opts.skipSaveSnapshot) {
        autoArchiveCurrentReport(state.csvReport, text, false);
      }
    } catch (err) {
      state.csvError = err.message || String(err);
      state.csvReport = null;
    }
    state.tab = 'csv';
    history.replaceState(null, '', '#csv');
    renderAll();
  }

  function recomputeCsvReport() {
    if (!state.csvParsed) return;
    const A = window.IIDXCsvAnalyzer;
    const mode = state.csvMode;
    const matched = A.matchCsvToCatalog(state.csvParsed, DATASETS[mode], mode);
    state.csvReport = A.analyzePlayerPerformance(matched, DATASETS[mode], RADAR_CFG[mode], {
      targetGauge: state.csvTargetGaugeManual ? state.csvTargetGauge : undefined,
      targetLevel: state.csvTargetLevel,
      spStyle: state.spStyle,
      spSide: state.spSide,
    });
    if (!state.csvTargetGaugeManual && state.csvReport?.evalGauge) {
      state.csvTargetGauge = state.csvReport.evalGauge;
    }
  }

  function loadFileObject(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const txt = window.IIDXCsvAnalyzer.decodeCsvBuffer(reader.result);
      handleCsvText(txt, file.name, null);
    };
    reader.readAsArrayBuffer(file);
  }

  function renderBipolarBar(score) {
    const rawPct = Math.min(50, Math.abs(score) * 0.5);
    const pct = Math.max(1.6, rawPct);
    const left = score < 0 ? (50 - pct) : (score > 0 ? 50 : 50 - pct / 2);
    const col = score >= 4 ? 'var(--pos)' : (score <= -4 ? 'var(--neg)' : 'var(--muted)');
    return `
      <div class="strength-bar-wrap">
        <div class="strength-bar-mid"></div>
        <div class="strength-bar-fill" style="left:${left.toFixed(1)}%;width:${pct.toFixed(1)}%;background:${col};"></div>
      </div>
    `;
  }

  function renderMetricRows(items, evalGauge) {
    if (!items || items.length === 0) {
      return '<div style="font-size:12px;color:var(--muted);padding:10px 0;">样本数不足，暂无法统计。</div>';
    }
    const gShort = evalGauge === 'hc' ? 'HC' : 'NC';
    return items.map((item) => {
      const sign = item.score > 0 ? '+' : '';
      const dSign = item.deltaNcPct > 0 ? '+' : '';
      const col = item.score >= 4 ? 'var(--pos)' : (item.score <= -4 ? 'var(--neg)' : 'var(--muted)');
      return `
        <div class="metric-row">
          <div class="metric-label" title="${esc(item.label)} (${item.n})">
            <span class="truncate">${esc(item.label)}</span>
            <span class="metric-label-cnt mono">(${item.n})</span>
          </div>
          <div class="metric-bar-cell">${renderBipolarBar(item.score)}</div>
          <div class="mono" style="text-align:right;white-space:nowrap;">
            <b style="color:${col};">${sign}${item.score}</b>
            <span style="color:var(--muted);font-size:11px;margin-left:4px;">${gShort} ${dSign}${item.deltaNcPct.toFixed(0)}%</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderCsvSongsTableBody(rep) {
    const container = document.getElementById('csv-songs-results');
    if (!container || !rep) return;

    const evalGauge = rep.evalGauge || 'nc';
    const evalGaugeShort = evalGauge.toUpperCase();
    const sKey = evalGauge === 'hc' ? 's_hc' : 's_nc';
    const focusLvs = rep.focusLevels || [rep.primaryLevel || 12];
    const focusRangeStr = `★${focusLvs[0]}–★${focusLvs[focusLvs.length - 1]}`;
    const allRecs = rep.allPlayedRecords || Array.from(rep.recordMap.values());

    const parseOptNum = (raw) => {
      const s = String(raw ?? '').trim();
      if (!s) return null;
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    };
    const exMin = parseOptNum(state.csvTableExMin);
    const exMax = parseOptNum(state.csvTableExMax);
    const bpMin = parseOptNum(state.csvTableBpMin);
    const bpMax = parseOptNum(state.csvTableBpMax);
    const q = state.csvTableSearch.trim().toLowerCase();

    const LAMP_KEY_BY_RANK = { 7: 'FC', 6: 'EXHC', 5: 'HC', 4: 'NC', 3: 'EC', 2: 'AC', 1: 'FAILED' };
    const getLampFilterKey = (r) => LAMP_KEY_BY_RANK[r.lampRank] || 'FAILED';
    const getDjFilterKey = (r) => {
      const k = String(r.dj || '').toUpperCase();
      return DJ_RANK_VAL[k] ? k : 'NONE';
    };

    const matchBase = (r) => {
      const c = r.chart;
      if (!state.csvTableDiffs.has(c.dChar)) return false;
      if (exMin !== null && (!r.hasScore || r.score < exMin)) return false;
      if (exMax !== null && (!r.hasScore || r.score > exMax)) return false;
      if (bpMin !== null && (!r.hasBp || r.bp === null || r.bp < bpMin)) return false;
      if (bpMax !== null && (!r.hasBp || r.bp === null || r.bp > bpMax)) return false;
      if (q) {
        const noChartKw = (r.hasChart === false || c.noCatalogChart) ? ' 无谱面 未收录' : '';
        const hay = ((c.title || '') + ' ' + (c.artist || '') + ' ' + (c.ver || '') + ' ' + (c.verCode || '') + ' ' + (c.diff || '') + ' ' + (c.bestOpt || '') + noChartKw).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    };
    const matchLv = (r) => state.csvTableLevels.size === 0 || state.csvTableLevels.has(r.chart.lv);
    const matchLamp = (r) => state.csvTableLamps.size === 0 || state.csvTableLamps.has(getLampFilterKey(r));
    const matchDj = (r) => state.csvTableDjs.size === 0 || state.csvTableDjs.has(getDjFilterKey(r));

    // Faceted counts for Level, Lamp, and DJ pill ribbons
    const lvCounts = new Array(13).fill(0);
    let lvTotal = 0;
    const lampCounts = { FC: 0, EXHC: 0, HC: 0, NC: 0, EC: 0, AC: 0, FAILED: 0 };
    let lampTotal = 0;
    const djCounts = { AAA: 0, AA: 0, A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, NONE: 0 };
    let djTotal = 0;
    const filtered = [];

    for (const r of allRecs) {
      if (state.csvTableDiffs.has(r.chart.dChar)) {
        if (r.chart.lv >= 1 && r.chart.lv <= 12) lvCounts[r.chart.lv]++;
        lvTotal++;
      }
      if (!matchBase(r)) continue;
      const okLv = matchLv(r);
      const okLamp = matchLamp(r);
      const okDj = matchDj(r);
      if (okLv && okDj) {
        lampCounts[getLampFilterKey(r)]++;
        lampTotal++;
      }
      if (okLv && okLamp) {
        djCounts[getDjFilterKey(r)]++;
        djTotal++;
      }
      if (okLv && okLamp && okDj) {
        filtered.push(r);
      }
    }

    // Render Explorer-style filter pill bars (preserving horizontal scroll positions on mobile!)
    const pillsArea = document.getElementById('csv-songs-pills-area');
    if (pillsArea) {
      const prevLvScroll = pillsArea.querySelector('.csv-lv-bar')?.scrollLeft || 0;
      const prevLampScroll = pillsArea.querySelector('.csv-lamp-pills')?.scrollLeft || 0;
      const prevDjScroll = pillsArea.querySelector('.csv-dj-pills')?.scrollLeft || 0;

      const isAllLv = state.csvTableLevels.size === 0;
      const isFocusLv = !isAllLv && state.csvTableLevels.size === focusLvs.length && focusLvs.every((x) => state.csvTableLevels.has(x));
      let lvBtnsHtml = `<button id="csv-lv-all" type="button" class="lv-btn all-btn mono ${isAllLv ? 'active' : ''}">全选 <span class="lv-cnt">(${lvTotal})</span></button>`;
      lvBtnsHtml += `<button id="csv-lv-focus" type="button" class="lv-btn mono ${isFocusLv ? 'active' : ''}" title="快速选中主攻区 ${focusRangeStr}">主攻区 <span class="lv-cnt">${focusRangeStr}</span></button>`;
      for (let lv = 1; lv <= 12; lv++) {
        if (lvCounts[lv] === 0 && !state.csvTableLevels.has(lv)) continue;
        const active = !isAllLv && state.csvTableLevels.has(lv);
        lvBtnsHtml += `<button data-clv="${lv}" type="button" class="lv-btn mono ${active ? 'active' : ''}" title="点击单选；开启多选或按住 Shift 可组合多等级">★${lv}<span class="lv-cnt">(${lvCounts[lv]})</span></button>`;
      }
      lvBtnsHtml += `<button id="csv-lv-multi" type="button" class="lv-btn multi-toggle ${state.csvTableLevelMulti ? 'active' : ''}" title="开启后可点击任意多个等级组合筛选">${state.csvTableLevelMulti ? '多选: 开' : '+ 多选'}</button>`;

      const allDiffsOn = state.csvTableDiffs.size === 5;
      const diffNames = { B: 'B', N: 'N', H: 'H', A: 'A', L: 'L†' };
      let diffBtnsHtml = `<button id="csv-diff-all" type="button" class="diff-pill ${allDiffsOn ? 'active' : ''}">全难度</button>`;
      for (const d of DIFF_LET) {
        const on = state.csvTableDiffs.has(d);
        diffBtnsHtml += `<button data-cdiff="${d}" type="button" class="diff-pill ${on ? 'active' : ''}"><span class="diff-${d}">${diffNames[d]}</span></button>`;
      }

      const LAMP_PILLS = [
        { k: 'FC',     dot: 'fc',   label: 'FC' },
        { k: 'EXHC',   dot: 'exhc', label: 'EXHC' },
        { k: 'HC',     dot: 'hc',   label: 'HC' },
        { k: 'NC',     dot: 'nc',   label: 'NC' },
        { k: 'EC',     dot: 'ec',   label: 'EC' },
        { k: 'AC',     dot: 'ac',   label: 'AC' },
        { k: 'FAILED', dot: 'f',    label: 'FAILED' },
      ];
      const allLampsOn = state.csvTableLamps.size === 0;
      let lampPillsHtml = `<button id="csv-lamp-all" type="button" class="tier-pill all-tier ${allLampsOn ? 'active' : ''}">全部灯 <span class="tp-cnt mono">(${lampTotal})</span></button>`;
      for (const item of LAMP_PILLS) {
        const cnt = lampCounts[item.k] || 0;
        const on = state.csvTableLamps.has(item.k);
        if (cnt === 0 && !on) continue;
        lampPillsHtml += `<button data-clamp="${item.k}" type="button" class="tier-pill lp-${item.k} ${on ? 'active' : ''}" title="点击筛选 ${item.label}（可多选叠加）"><span class="lamp-dot lamp-static lamp-${item.dot}" style="width:7px;height:7px;"></span><span class="mono">${item.label}</span><span class="tp-cnt mono">(${cnt})</span></button>`;
      }

      const DJ_PILLS = [
        { k: 'AAA',  label: 'AAA',  cls: 'dj-dot-AAA', pillCls: 'dj-AAA' },
        { k: 'AA',   label: 'AA',   cls: 'dj-dot-AA',  pillCls: 'dj-AA' },
        { k: 'A',    label: 'A',    cls: 'dj-dot-A',   pillCls: 'dj-A' },
        { k: 'B',    label: 'B',    cls: 'dj-dot-B',   pillCls: 'dj-B' },
        { k: 'C',    label: 'C',    cls: 'dj-dot-low', pillCls: 'dj-low' },
        { k: 'D',    label: 'D',    cls: 'dj-dot-low', pillCls: 'dj-low' },
        { k: 'E',    label: 'E',    cls: 'dj-dot-low', pillCls: 'dj-low' },
        { k: 'F',    label: 'F',    cls: 'dj-dot-low', pillCls: 'dj-low' },
        { k: 'NONE', label: '旧代灯', cls: 'dj-dot-low', pillCls: 'dj-low' },
      ];
      const allDjsOn = state.csvTableDjs.size === 0;
      let djPillsHtml = `<button id="csv-dj-all" type="button" class="tier-pill all-tier ${allDjsOn ? 'active' : ''}">全评价 <span class="tp-cnt mono">(${djTotal})</span></button>`;
      for (const item of DJ_PILLS) {
        const cnt = djCounts[item.k] || 0;
        const on = state.csvTableDjs.has(item.k);
        if (cnt === 0 && !on) continue;
        djPillsHtml += `<button data-cdj="${item.k}" type="button" class="tier-pill ${item.pillCls} ${on ? 'active' : ''}" title="点击筛选评价 ${item.label}（可多选叠加）"><span class="tier-dot ${item.cls}"></span><span class="mono">${item.label}</span><span class="tp-cnt mono">(${cnt})</span></button>`;
      }

      pillsArea.innerHTML = `
        <div class="filter-row level-filter-row csv-tbl-lv-row">
          <span class="filter-label">等级</span>
          <div class="level-bar csv-lv-bar">${lvBtnsHtml}</div>
          <div class="diff-filter-bar csv-mobile-collapsible" aria-label="谱面难度类型筛选">${diffBtnsHtml}</div>
        </div>
        <div class="filter-row filter-row-divider tier-filter-row csv-tbl-pill-row">
          <span class="filter-label">点灯</span>
          <div class="tier-filter-pills csv-lamp-pills">${lampPillsHtml}</div>
          <span class="tier-filter-hint">点击单选 / 多选叠加</span>
        </div>
        <div class="filter-row filter-row-divider tier-filter-row csv-tbl-pill-row">
          <span class="filter-label">评价</span>
          <div class="tier-filter-pills csv-dj-pills">${djPillsHtml}</div>
          <span class="tier-filter-hint">支持 AAA / AA 等组合叠加</span>
        </div>
      `;

      const lvBarEl = pillsArea.querySelector('.csv-lv-bar');
      const lampBarEl = pillsArea.querySelector('.csv-lamp-pills');
      const djBarEl = pillsArea.querySelector('.csv-dj-pills');
      if (lvBarEl) lvBarEl.scrollLeft = prevLvScroll;
      if (lampBarEl) lampBarEl.scrollLeft = prevLampScroll;
      if (djBarEl) djBarEl.scrollLeft = prevDjScroll;

      const updateAndSave = () => {
        state.csvTablePage = 1;
        renderCsvSongsTableBody(rep);
        persistUiPrefs();
      };

      document.getElementById('csv-lv-all')?.addEventListener('click', () => {
        state.csvTableLevels.clear();
        updateAndSave();
      });
      document.getElementById('csv-lv-focus')?.addEventListener('click', () => {
        if (isFocusLv) state.csvTableLevels.clear();
        else state.csvTableLevels = new Set(focusLvs);
        updateAndSave();
      });
      document.getElementById('csv-lv-multi')?.addEventListener('click', () => {
        state.csvTableLevelMulti = !state.csvTableLevelMulti;
        renderCsvSongsTableBody(rep);
        persistUiPrefs();
      });
      pillsArea.querySelectorAll('[data-clv]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const lv = Number(btn.dataset.clv);
          if (state.csvTableLevelMulti || e.shiftKey || e.ctrlKey || e.metaKey) {
            if (state.csvTableLevels.has(lv)) state.csvTableLevels.delete(lv);
            else state.csvTableLevels.add(lv);
          } else {
            if (state.csvTableLevels.size === 1 && state.csvTableLevels.has(lv)) {
              state.csvTableLevels.clear();
            } else {
              state.csvTableLevels = new Set([lv]);
            }
          }
          updateAndSave();
        });
      });

      document.getElementById('csv-diff-all')?.addEventListener('click', () => {
        state.csvTableDiffs = new Set(DIFF_LET);
        updateAndSave();
      });
      pillsArea.querySelectorAll('[data-cdiff]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const d = btn.dataset.cdiff;
          if (state.csvTableDiffs.has(d)) {
            if (state.csvTableDiffs.size === 1) state.csvTableDiffs = new Set(DIFF_LET);
            else state.csvTableDiffs.delete(d);
          } else {
            state.csvTableDiffs.add(d);
          }
          updateAndSave();
        });
      });

      document.getElementById('csv-lamp-all')?.addEventListener('click', () => {
        state.csvTableLamps.clear();
        updateAndSave();
      });
      pillsArea.querySelectorAll('[data-clamp]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const k = btn.dataset.clamp;
          if (state.csvTableLamps.has(k)) state.csvTableLamps.delete(k);
          else state.csvTableLamps.add(k);
          updateAndSave();
        });
      });

      document.getElementById('csv-dj-all')?.addEventListener('click', () => {
        state.csvTableDjs.clear();
        updateAndSave();
      });
      pillsArea.querySelectorAll('[data-cdj]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const k = btn.dataset.cdj;
          if (state.csvTableDjs.has(k)) state.csvTableDjs.delete(k);
          else state.csvTableDjs.add(k);
          updateAndSave();
        });
      });
    }

    // Sync mobile collapsible secondary filters button (B/N/H/A/L + EX + BP)
    const songsCard = document.getElementById('csv-songs-card');
    const mobileBtn = document.getElementById('btn-csv-tbl-mobile-filters');
    let mobileExtraCnt = 0;
    if (state.csvTableDiffs.size < 5) mobileExtraCnt++;
    if (exMin !== null || exMax !== null) mobileExtraCnt++;
    if (bpMin !== null || bpMax !== null) mobileExtraCnt++;
    if (songsCard) songsCard.classList.toggle('csv-mobile-filters-open', state.csvTableMobileFiltersOpen);
    if (mobileBtn) {
      mobileBtn.classList.toggle('has-active', mobileExtraCnt > 0 || state.csvTableMobileFiltersOpen);
      mobileBtn.setAttribute('aria-expanded', state.csvTableMobileFiltersOpen ? 'true' : 'false');
      mobileBtn.textContent = `EX/BP${mobileExtraCnt > 0 ? ` (${mobileExtraCnt})` : ''} ${state.csvTableMobileFiltersOpen ? '▴' : '▾'}`;
    }

    const col = state.csvTableSortCol;
    const dir = state.csvTableSortDir;
    const cmpNullLast = (aVal, bVal, d) => {
      const aNull = aVal === null || aVal === undefined;
      const bNull = bVal === null || bVal === undefined;
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      return (aVal - bVal) * d;
    };

    const getCp = (r) => (r.hasChart !== false && !r.chart.noCatalogChart && Number.isFinite(r.chart[sKey])) ? r.chart[sKey] : null;

    const sorted = [...filtered].sort((a, b) => {
      let c = 0;
      if (col === 'lv') {
        c = (a.chart.lv - b.chart.lv) * dir;
        if (c === 0) c = cmpNullLast(getCp(a), getCp(b), -1);
        if (c === 0) c = b.lampRank - a.lampRank;
      } else if (col === 'title') {
        c = a.chart.title.localeCompare(b.chart.title) * dir;
        if (c === 0) c = (b.chart.lv - a.chart.lv);
      } else if (col === 'lamp') {
        c = (a.lampRank - b.lampRank) * dir;
        if (c === 0) c = (b.chart.lv - a.chart.lv);
        if (c === 0) c = cmpNullLast(getCp(a), getCp(b), -1);
      } else if (col === 'dj') {
        const da = getDjRankVal(a.dj) || null;
        const db = getDjRankVal(b.dj) || null;
        c = cmpNullLast(da, db, dir);
        if (c === 0) c = cmpNullLast(a.exRate, b.exRate, -1);
      } else if (col === 'score') {
        c = cmpNullLast(a.hasScore ? a.score : null, b.hasScore ? b.score : null, dir);
      } else if (col === 'exRate') {
        c = cmpNullLast(a.exRate, b.exRate, dir);
      } else if (col === 'bp') {
        c = cmpNullLast(a.hasBp ? a.bp : null, b.hasBp ? b.bp : null, dir);
        if (c === 0) c = (b.chart.lv - a.chart.lv);
      } else if (col === 'cp') {
        c = cmpNullLast(getCp(a), getCp(b), dir);
      } else if (col === 'lastPlayed') {
        const sa = a.lastPlayed || '';
        const sb = b.lastPlayed || '';
        if (!sa && !sb) c = 0;
        else if (!sa) c = 1;
        else if (!sb) c = -1;
        else c = sa.localeCompare(sb) * dir;
      }
      if (c === 0) c = cmpNullLast(a.hasScore ? a.score : null, b.hasScore ? b.score : null, -1);
      return c;
    });

    // Quick filtered slice summary stats
    let scoredN = 0, exRateSum = 0, bpN = 0, bpSum = 0, hcCnt = 0, aaCnt = 0, noChartCnt = 0;
    for (const r of sorted) {
      if (r.exRate !== null) { scoredN++; exRateSum += r.exRate; }
      if (r.hasBp && r.bp !== null) { bpN++; bpSum += r.bp; }
      if (r.lampRank >= 5) hcCnt++;
      if (getDjRankVal(r.dj) >= 7) aaCnt++;
      if (r.hasChart === false || r.chart.noCatalogChart) noChartCnt++;
    }
    const avgExTxt = scoredN ? `均分 ${(exRateSum / scoredN * 100).toFixed(1)}%` : '';
    const avgBpTxt = bpN ? `均BP ${(bpSum / bpN).toFixed(1)}` : '';
    const noChartTxt = noChartCnt ? `含 ${noChartCnt} 无谱面` : '';
    const sliceStats = [avgExTxt, avgBpTxt, `HC+ ${hcCnt}`, `AA+ ${aaCnt}`, noChartTxt].filter(Boolean).join(' · ');

    const hasActiveFilter = (
      state.csvTableLevels.size > 0 ||
      state.csvTableDiffs.size < 5 ||
      state.csvTableLamps.size > 0 ||
      state.csvTableDjs.size > 0 ||
      exMin !== null || exMax !== null ||
      bpMin !== null || bpMax !== null ||
      q.length > 0
    );
    const resetBtn = document.getElementById('btn-csv-tbl-reset');
    if (resetBtn) resetBtn.classList.toggle('hidden', !hasActiveFilter);
    const sortSel = document.getElementById('csv-tbl-sort-col');
    if (sortSel) sortSel.value = col;
    const dirBtn = document.getElementById('csv-tbl-sort-dir');
    if (dirBtn) dirBtn.textContent = dir < 0 ? '↓ 降序' : '↑ 升序';

    const pageSize = state.csvTablePageSize || 100;
    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    state.csvTablePage = Math.max(1, Math.min(state.csvTablePage, totalPages));
    const startIdx = (state.csvTablePage - 1) * pageSize;
    const pageRows = sorted.slice(startIdx, startIdx + pageSize);

    const th = (label, key) => `<th data-csort="${key}" class="sort-th">${label}${col === key ? (dir < 0 ? ' ↓' : ' ↑') : ''}</th>`;
    const renderDjPill = (dj) => {
      const k = String(dj || '').toUpperCase();
      if (!k) return '<span style="color:var(--muted);">—</span>';
      const cls = k === 'AAA' ? 'dj-AAA' : (k === 'AA' ? 'dj-AA' : (k === 'A' ? 'dj-A' : (k === 'B' ? 'dj-B' : 'dj-low')));
      return `<span class="dj-pill ${cls} mono">${esc(k)}</span>`;
    };

    const isSp = rep.mode === 'sp';

    container.innerHTML = `
      <div class="csv-songs-meta mono">
        <span>匹配 <b style="color:var(--ink);">${sorted.length.toLocaleString()}</b> / ${allRecs.length.toLocaleString()} 谱</span>
        <span style="color:var(--muted);">${sliceStats}</span>
      </div>
      ${sorted.length ? `
        <div class="table-wrap csv-songs-table-wrap">
          <div class="table-mobile-hint">可左右滑动查看完整列 · 点击已收录谱面行可查看详情与手法建议</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                ${th('等级', 'lv')}
                ${th('曲名 / 难度', 'title')}
                ${th('点灯', 'lamp')}
                ${th('评价', 'dj')}
                ${th('EX Score', 'score')}
                ${th('得分率', 'exRate')}
                ${th('BP', 'bp')}
                ${th(evalGaugeShort + ' CP', 'cp')}
                ${th('最近游玩', 'lastPlayed')}
                ${isSp ? '<th>练习</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${pageRows.map((r, i) => {
                const c = r.chart;
                const hasChart = r.hasChart !== false && !c.noCatalogChart;
                const lvStr = c.lv > 0 ? `★${c.lv}` : '—';
                const exStr = r.hasScore ? r.score.toLocaleString() : '<span style="color:var(--muted);">旧代灯</span>';
                const rateStr = r.exRate !== null ? `${(r.exRate * 100).toFixed(1)}%` : '<span style="color:var(--muted);">—</span>';
                const bpStr = r.hasBp && r.bp !== null ? `<b>${r.bp}</b>` : '<span style="color:var(--muted);">—</span>';
                const cpVal = getCp(r);
                const cpStr = cpVal !== null ? cpVal.toFixed(1) : '—';
                const dateStr = r.lastPlayed ? r.lastPlayed.slice(0, 10) : '—';
                const subLine = hasChart
                  ? `${esc(c.verCode)} · ${esc(c.bestOpt)} · ${c.notes}N`
                  : `${esc(c.verCode || c.ver)}${c.artist ? ` · ${esc(c.artist)}` : ''} · 仅 CSV 成绩`;
                return `
                  <tr ${hasChart ? `data-cid="${c.id}"` : ''} class="csv-song-row${hasChart ? '' : ' csv-song-row-unmatched'}"${hasChart ? '' : ' title="Textage 暂未收录此谱面，仅展示 CSV 原始成绩（不参与物理 CP 计算）"'}>
                    <td class="mono" style="color:var(--muted);">${startIdx + i + 1}</td>
                    <td class="mono" style="font-weight:700;white-space:nowrap;">${lvStr}</td>
                    <td style="max-width:260px;">
                      <div class="truncate" style="font-weight:700;" title="${esc(c.title)}">
                        <span class="diff-${c.dChar}" style="margin-right:4px;">[${c.dChar}]</span>${esc(c.title)}${hasChart ? '' : '<span class="csv-nochart-tag" title="Textage 暂未收录此谱面，仅展示 CSV 原始成绩">无谱面</span>'}
                      </div>
                      <div class="truncate" style="font-size:10.5px;color:var(--muted);">${subLine}</div>
                    </td>
                    <td>${renderLampBadge(r.lampMeta)}</td>
                    <td>${renderDjPill(r.dj)}</td>
                    <td class="mono" style="font-weight:700;white-space:nowrap;">${exStr}</td>
                    <td class="mono" style="white-space:nowrap;">${rateStr}</td>
                    <td class="mono" style="white-space:nowrap;">${bpStr}</td>
                    <td class="mono" style="color:var(--muted);white-space:nowrap;">${cpStr}</td>
                    <td class="mono" style="color:var(--muted);font-size:11px;white-space:nowrap;">${esc(dateStr)}</td>
                    ${isSp ? `<td>${hasChart ? renderPracticeLink(c, true) : '<span style="color:var(--muted);">—</span>'}</td>` : ''}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          ${totalPages > 1 ? `
            <div class="pagination-bar mono">
              <span>第 <b>${state.csvTablePage}</b> / ${totalPages} 页（显示 ${startIdx + 1}–${Math.min(sorted.length, startIdx + pageSize)} / ${sorted.length} 谱）</span>
              <div style="display:flex;gap:6px;">
                <button id="csv-pg-prev" type="button" class="btn btn-sm" ${state.csvTablePage <= 1 ? 'disabled' : ''}>上一页</button>
                <button id="csv-pg-next" type="button" class="btn btn-sm" ${state.csvTablePage >= totalPages ? 'disabled' : ''}>下一页</button>
              </div>
            </div>
          ` : ''}
        </div>
      ` : '<div style="padding:28px 14px;text-align:center;color:var(--muted);font-size:12.5px;">没有符合当前筛选条件的游玩记录，可放宽筛选条件或点击「重置筛选」。</div>'}
    `;

    const applySortCol = (k) => {
      if (state.csvTableSortCol === k) {
        state.csvTableSortDir *= -1;
      } else {
        state.csvTableSortCol = k;
        state.csvTableSortDir = (k === 'bp' || k === 'title') ? 1 : -1;
      }
      state.csvTablePage = 1;
      renderCsvSongsTableBody(rep);
      persistUiPrefs();
    };
    container.querySelectorAll('.sort-th').forEach((el) => {
      el.addEventListener('click', () => applySortCol(el.dataset.csort));
    });
    container.querySelectorAll('.csv-song-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (!row.dataset.cid || e.target.closest('.rec-play-link')) return;
        openChartModal(rep.mode, row.dataset.cid);
      });
    });
    document.getElementById('csv-pg-prev')?.addEventListener('click', () => {
      state.csvTablePage--;
      renderCsvSongsTableBody(rep);
    });
    document.getElementById('csv-pg-next')?.addEventListener('click', () => {
      state.csvTablePage++;
      renderCsvSongsTableBody(rep);
    });
  }

  function formatSnapShortLabel(snap) {
    if (!snap) return '—';
    const dt = (snap.latestPlayDate && snap.latestPlayDate !== '—')
      ? snap.latestPlayDate.slice(0, 10)
      : (snap.savedAt ? snap.savedAt.slice(0, 10) : '未知日期');
    const tag = snap.label ? `「${snap.label}」` : '';
    return `${dt}${tag} · ${snap.playedCount}谱`;
  }

  function renderCsvHistoryTrendSvg(modeSnaps) {
    if (!modeSnaps || modeSnaps.length < 2) return '';
    const seriesDef = [
      { key: 'ec',   label: 'EC',   cls: 'hist-line-ec' },
      { key: 'nc',   label: 'NC',   cls: 'hist-line-nc' },
      { key: 'hc',   label: 'HC',   cls: 'hist-line-hc' },
      { key: 'exhc', label: 'EXHC', cls: 'hist-line-exhc' },
    ];
    const allVals = [];
    for (const s of modeSnaps) {
      for (const sd of seriesDef) {
        const v = s.irt?.[sd.key];
        if (typeof v === 'number' && Number.isFinite(v)) allVals.push(v);
      }
    }
    if (allVals.length < 2) return '';
    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    const pad = Math.max(1.5, (rawMax - rawMin) * 0.16);
    const yMin = Math.floor((rawMin - pad) * 2) / 2;
    const yMax = Math.ceil((rawMax + pad) * 2) / 2;
    const ySpan = Math.max(1, yMax - yMin);

    const W = 680, H = 185;
    const ml = 38, mr = 18, mt = 14, mb = 28;
    const pw = W - ml - mr;
    const ph = H - mt - mb;
    const n = modeSnaps.length;
    const xOf = (i) => ml + (n <= 1 ? pw / 2 : (i / (n - 1)) * pw);
    const yOf = (v) => mt + ph - ((v - yMin) / ySpan) * ph;

    let gridHtml = '';
    for (let g = 0; g <= 3; g++) {
      const val = yMin + (ySpan * g) / 3;
      const y = yOf(val);
      gridHtml += `<line x1="${ml}" y1="${y.toFixed(1)}" x2="${W - mr}" y2="${y.toFixed(1)}" class="hist-svg-grid" />`;
      gridHtml += `<text x="${ml - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" class="hist-svg-tick mono">${val.toFixed(1)}</text>`;
    }

    const step = Math.max(1, Math.ceil(n / 6));
    let xTicksHtml = '';
    for (let i = 0; i < n; i++) {
      if (i !== 0 && i !== n - 1 && i % step !== 0) continue;
      const s = modeSnaps[i];
      const dt = (s.latestPlayDate && s.latestPlayDate !== '—') ? s.latestPlayDate.slice(5, 10) : (s.savedAt ? s.savedAt.slice(5, 10) : `#${i + 1}`);
      xTicksHtml += `<text x="${xOf(i).toFixed(1)}" y="${H - 7}" text-anchor="middle" class="hist-svg-tick mono">${esc(dt)}</text>`;
    }

    let linesHtml = '';
    let dotsHtml = '';
    for (const sd of seriesDef) {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const v = modeSnaps[i].irt?.[sd.key];
        if (typeof v === 'number' && Number.isFinite(v)) {
          pts.push({ i, v, x: xOf(i), y: yOf(v), snap: modeSnaps[i] });
        }
      }
      if (pts.length >= 2) {
        const dStr = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        linesHtml += `<path d="${dStr}" fill="none" class="hist-svg-line ${sd.cls}" />`;
      }
      for (const p of pts) {
        const dt = (p.snap.latestPlayDate && p.snap.latestPlayDate !== '—') ? p.snap.latestPlayDate.slice(0, 10) : p.snap.savedAt.slice(0, 10);
        dotsHtml += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.4" class="hist-svg-dot ${sd.cls}"><title>${esc(dt)} · ${sd.label} CP ${p.v.toFixed(1)}</title></circle>`;
      }
    }

    return `
      <div class="hist-trend-wrap">
        <div class="hist-trend-head">
          <span class="hist-sub-title">四血条有效能力线 (CP) 走势（${modeSnaps.length} 份本地快照）</span>
          <div class="hist-legend mono">
            <span class="hist-leg-item"><i class="hist-leg-dot hist-line-ec"></i>EC</span>
            <span class="hist-leg-item"><i class="hist-leg-dot hist-line-nc"></i>NC</span>
            <span class="hist-leg-item"><i class="hist-leg-dot hist-line-hc"></i>HC</span>
            <span class="hist-leg-item"><i class="hist-leg-dot hist-line-exhc"></i>EXHC</span>
          </div>
        </div>
        <svg viewBox="0 0 ${W} ${H}" class="hist-trend-svg" role="img" aria-label="四血条能力线 CP 走势图">
          ${gridHtml}
          ${xTicksHtml}
          ${linesHtml}
          ${dotsHtml}
        </svg>
      </div>
    `;
  }

  function renderCsvHistoryDiffArea(diffObj, mode) {
    const pillsEl = document.getElementById('csv-hist-pills-area');
    const resEl = document.getElementById('csv-hist-diff-results');
    if (!resEl || !diffObj) return;

    const q = state.csvHistSearch.trim().toLowerCase();
    const lvCounts = new Array(13).fill(0);
    const typeCounts = { all: 0, lampUp: 0, newPlay: 0, scoreUp: 0, bpDown: 0, djUp: 0 };

    const matchSearch = (ch) => {
      if (!q) return true;
      const hay = `${ch.title} ${ch.artist} ${ch.ver} ${ch.verCode} ${ch.dChar} ${ch.hasChart ? '' : '无谱面'}`.toLowerCase();
      return hay.includes(q);
    };
    const matchType = (ch, f) => {
      if (f === 'lampUp') return ch.lampUp;
      if (f === 'newPlay') return ch.isNew;
      if (f === 'scoreUp') return ch.scoreUp;
      if (f === 'bpDown') return ch.bpDown;
      if (f === 'djUp') return ch.djUp;
      return true;
    };

    const filtered = [];
    for (const ch of diffObj.changes) {
      if (!matchSearch(ch)) continue;
      if (state.csvHistLevel === 0 || ch.lv === state.csvHistLevel) {
        typeCounts.all++;
        if (ch.lampUp) typeCounts.lampUp++;
        if (ch.isNew) typeCounts.newPlay++;
        if (ch.scoreUp) typeCounts.scoreUp++;
        if (ch.bpDown) typeCounts.bpDown++;
        if (ch.djUp) typeCounts.djUp++;
      }
      if (matchType(ch, state.csvHistFilter)) {
        if (ch.lv >= 1 && ch.lv <= 12) lvCounts[ch.lv]++;
        if (state.csvHistLevel === 0 || ch.lv === state.csvHistLevel) {
          filtered.push(ch);
        }
      }
    }

    if (pillsEl) {
      const prevTypeScroll = pillsEl.querySelector('.hist-type-pills')?.scrollLeft || 0;
      const prevLvScroll = pillsEl.querySelector('.hist-lv-bar')?.scrollLeft || 0;
      const typeDefs = [
        ['all',     '全部变化', 'all-tier'],
        ['lampUp',  '推灯突破', 'lp-HC'],
        ['newPlay', '新游玩',   'lp-NC'],
        ['scoreUp', '刷新 EX',  'dj-AAA'],
        ['bpDown',  'BP 减少',  'lp-EC'],
        ['djUp',    '评价提升', 'dj-AA'],
      ];
      const typeHtml = typeDefs.map(([k, lbl, cls]) => `
        <button type="button" data-hfilter="${k}" class="tier-pill ${cls} ${state.csvHistFilter === k ? 'active' : ''}">
          <span>${lbl}</span><span class="tp-cnt mono">(${typeCounts[k]})</span>
        </button>
      `).join('');

      let lvHtml = `<button type="button" data-hlv="0" class="lv-btn all-btn mono ${state.csvHistLevel === 0 ? 'active' : ''}">全等级</button>`;
      for (let lv = 1; lv <= 12; lv++) {
        if (lvCounts[lv] === 0 && state.csvHistLevel !== lv) continue;
        lvHtml += `<button type="button" data-hlv="${lv}" class="lv-btn mono ${state.csvHistLevel === lv ? 'active' : ''}">★${lv}<span class="lv-cnt">(${lvCounts[lv]})</span></button>`;
      }

      pillsEl.innerHTML = `
        <div class="filter-row tier-filter-row">
          <span class="filter-label">变化</span>
          <div class="tier-filter-pills hist-type-pills">${typeHtml}</div>
        </div>
        <div class="filter-row filter-row-divider level-filter-row">
          <span class="filter-label">等级</span>
          <div class="level-bar hist-lv-bar">${lvHtml}</div>
        </div>
      `;
      const tpBar = pillsEl.querySelector('.hist-type-pills');
      const lvBar = pillsEl.querySelector('.hist-lv-bar');
      if (tpBar) tpBar.scrollLeft = prevTypeScroll;
      if (lvBar) lvBar.scrollLeft = prevLvScroll;

      pillsEl.querySelectorAll('[data-hfilter]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.csvHistFilter = btn.dataset.hfilter;
          state.csvHistPage = 1;
          renderCsvHistoryDiffArea(diffObj, mode);
          persistUiPrefs();
        });
      });
      pillsEl.querySelectorAll('[data-hlv]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const lv = Number(btn.dataset.hlv) || 0;
          state.csvHistLevel = (state.csvHistLevel === lv && lv !== 0) ? 0 : lv;
          state.csvHistPage = 1;
          renderCsvHistoryDiffArea(diffObj, mode);
          persistUiPrefs();
        });
      });
    }

    const sortBy = state.csvHistSort;
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'lv') return (b.lv - a.lv) || (b.impactScore - a.impactScore);
      if (sortBy === 'scoreDelta') return ((b.scoreUp && !b.wasCarryoverScore ? b.scoreDelta : -1e9) - (a.scoreUp && !a.wasCarryoverScore ? a.scoreDelta : -1e9)) || (b.impactScore - a.impactScore);
      if (sortBy === 'bpDelta') return ((a.bpDown ? a.bpDelta : 1e9) - (b.bpDown ? b.bpDelta : 1e9)) || (b.impactScore - a.impactScore);
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return b.impactScore - a.impactScore || b.lv - a.lv;
    });

    const pageSize = 80;
    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    state.csvHistPage = Math.max(1, Math.min(state.csvHistPage, totalPages));
    const startIdx = (state.csvHistPage - 1) * pageSize;
    const pageRows = sorted.slice(startIdx, startIdx + pageSize);

    const renderDjBadge = (dj) => {
      const k = String(dj || '').toUpperCase();
      if (!k) return '<span style="color:var(--muted);">—</span>';
      const cls = k === 'AAA' ? 'dj-AAA' : (k === 'AA' ? 'dj-AA' : (k === 'A' ? 'dj-A' : (k === 'B' ? 'dj-B' : 'dj-low')));
      return `<span class="dj-pill ${cls} mono">${esc(k)}</span>`;
    };

    resEl.innerHTML = `
      <div class="csv-songs-meta mono">
        <span>共 <b style="color:var(--ink);">${sorted.length.toLocaleString()}</b> 谱符合条件（两份快照间共 ${diffObj.counts.total.toLocaleString()} 谱发生变化）</span>
        <span style="color:var(--muted);">推灯 ${diffObj.counts.lampUp} · 新玩 ${diffObj.counts.newPlay} · 刷新EX ${diffObj.counts.scoreUp} · 控BP ${diffObj.counts.bpDown}</span>
      </div>
      ${sorted.length ? `
        <div class="table-wrap csv-songs-table-wrap">
          <div class="table-mobile-hint">可左右滑动查看完整对比 · 点击「轨迹」查看单曲全历史变化</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>等级</th>
                <th>曲名 / 难度</th>
                <th>点灯变化</th>
                <th>评价变化</th>
                <th>EX 变化</th>
                <th>BP 变化</th>
                <th>单曲历史</th>
              </tr>
            </thead>
            <tbody>
              ${pageRows.map((ch, i) => {
                const lvStr = ch.lv > 0 ? `★${ch.lv}` : '—';
                const lampCell = ch.isNew
                  ? `<span class="hist-new-tag">新</span> ${renderLampBadge(ch.newRec.lampMeta)}`
                  : (ch.lampUp || ch.lampDown)
                    ? `${renderLampBadge(ch.oldRec.lampMeta)}<span class="hist-arr">→</span>${renderLampBadge(ch.newRec.lampMeta)}`
                    : renderLampBadge(ch.newRec.lampMeta);

                const djCell = ch.isNew
                  ? renderDjBadge(ch.newRec.dj)
                  : (ch.oldRec.dj !== ch.newRec.dj && (ch.oldRec.dj || ch.newRec.dj))
                    ? `${renderDjBadge(ch.oldRec.dj)}<span class="hist-arr">→</span>${renderDjBadge(ch.newRec.dj)}`
                    : renderDjBadge(ch.newRec.dj);

                let exCell = '<span style="color:var(--muted);">—</span>';
                if (ch.isNew) {
                  exCell = ch.newRec.hasScore ? `<b>${ch.newRec.score.toLocaleString()}</b>` : '<span style="color:var(--muted);">旧代灯</span>';
                } else if (ch.wasCarryoverScore) {
                  exCell = `<span style="color:var(--muted);">旧代</span><span class="hist-arr">→</span><b>${ch.newRec.score.toLocaleString()}</b>`;
                } else if (ch.scoreUp) {
                  exCell = `<span style="color:var(--muted);">${ch.oldRec.score.toLocaleString()}</span><span class="hist-arr">→</span><b>${ch.newRec.score.toLocaleString()}</b> <span class="hist-delta-pos">+${ch.scoreDelta}</span>`;
                } else if (ch.oldRec.score !== ch.newRec.score && ch.newRec.hasScore) {
                  const diffS = ch.newRec.score - ch.oldRec.score;
                  exCell = `<span style="color:var(--muted);">${ch.oldRec.score.toLocaleString()}</span><span class="hist-arr">→</span><b>${ch.newRec.score.toLocaleString()}</b> <span class="hist-delta-neg">${diffS}</span>`;
                } else if (ch.newRec.hasScore) {
                  exCell = `${ch.newRec.score.toLocaleString()}`;
                }

                let bpCell = '<span style="color:var(--muted);">—</span>';
                if (ch.isNew) {
                  bpCell = ch.newRec.hasBp ? `<b>${ch.newRec.bp}</b>` : '<span style="color:var(--muted);">—</span>';
                } else if (ch.bpDown && ch.bpDelta !== null) {
                  bpCell = `<span style="color:var(--muted);">${ch.oldRec.bp}</span><span class="hist-arr">→</span><b>${ch.newRec.bp}</b> <span class="hist-delta-pos">${ch.bpDelta}</span>`;
                } else if (ch.oldRec.bp !== ch.newRec.bp && ch.newRec.hasBp) {
                  if (ch.oldRec.hasBp) {
                    const dbp = ch.newRec.bp - ch.oldRec.bp;
                    bpCell = `<span style="color:var(--muted);">${ch.oldRec.bp}</span><span class="hist-arr">→</span><b>${ch.newRec.bp}</b> <span class="hist-delta-neg">+${dbp}</span>`;
                  } else {
                    bpCell = `<b>${ch.newRec.bp}</b>`;
                  }
                } else if (ch.newRec.hasBp) {
                  bpCell = `${ch.newRec.bp}`;
                }

                return `
                  <tr ${ch.hasChart && ch.chartId ? `data-cid="${esc(ch.chartId)}"` : ''} class="csv-song-row${ch.hasChart && ch.chartId ? '' : ' csv-song-row-unmatched'}">
                    <td class="mono" style="color:var(--muted);">${startIdx + i + 1}</td>
                    <td class="mono" style="font-weight:700;white-space:nowrap;">${lvStr}</td>
                    <td style="max-width:240px;">
                      <div class="truncate" style="font-weight:700;" title="${esc(ch.title)}">
                        <span class="diff-${ch.dChar}" style="margin-right:4px;">[${ch.dChar}]</span>${esc(ch.title)}${ch.hasChart ? '' : '<span class="csv-nochart-tag">无谱面</span>'}
                      </div>
                      <div class="truncate" style="font-size:10.5px;color:var(--muted);">${esc(ch.verCode || ch.ver)}${ch.artist ? ` · ${esc(ch.artist)}` : ''}</div>
                    </td>
                    <td style="white-space:nowrap;">${lampCell}</td>
                    <td style="white-space:nowrap;">${djCell}</td>
                    <td class="mono" style="white-space:nowrap;">${exCell}</td>
                    <td class="mono" style="white-space:nowrap;">${bpCell}</td>
                    <td style="white-space:nowrap;">
                      <button type="button" class="btn btn-sm hist-song-track-btn" data-skey="${esc(ch.key)}" data-sfk="${esc(ch.fallbackKey || '')}">轨迹</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          ${totalPages > 1 ? `
            <div class="pagination-bar mono">
              <span>第 <b>${state.csvHistPage}</b> / ${totalPages} 页（显示 ${startIdx + 1}–${Math.min(sorted.length, startIdx + pageSize)} / ${sorted.length} 谱）</span>
              <div style="display:flex;gap:6px;">
                <button id="hist-pg-prev" type="button" class="btn btn-sm" ${state.csvHistPage <= 1 ? 'disabled' : ''}>上一页</button>
                <button id="hist-pg-next" type="button" class="btn btn-sm" ${state.csvHistPage >= totalPages ? 'disabled' : ''}>下一页</button>
              </div>
            </div>
          ` : ''}
        </div>
      ` : '<div style="padding:26px 14px;text-align:center;color:var(--muted);font-size:12.5px;">这两份快照在当前筛选条件下没有变化记录，可切换筛选条件或选择其他快照区间。</div>'}
    `;

    resEl.querySelectorAll('.csv-song-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.hist-song-track-btn') || !row.dataset.cid) return;
        openChartModal(mode, row.dataset.cid);
      });
    });
    resEl.querySelectorAll('.hist-song-track-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.csvHistSongKey = btn.dataset.skey;
        state.csvHistSongFk = btn.dataset.sfk;
        renderCsvSongTimelineArea(getModeSnapshots(mode), mode);
        document.getElementById('csv-hist-song-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
    document.getElementById('hist-pg-prev')?.addEventListener('click', () => {
      state.csvHistPage--;
      renderCsvHistoryDiffArea(diffObj, mode);
    });
    document.getElementById('hist-pg-next')?.addEventListener('click', () => {
      state.csvHistPage++;
      renderCsvHistoryDiffArea(diffObj, mode);
    });
  }

  function renderCsvSongTimelineArea(modeSnaps, mode) {
    const resEl = document.getElementById('csv-hist-song-results');
    if (!resEl || !modeSnaps || modeSnaps.length < 2) return;
    const A = window.IIDXCsvAnalyzer;

    const candidates = A.listSongsAcrossSnapshots(modeSnaps, state.csvHistSongQuery, 12);
    if ((!state.csvHistSongKey && !state.csvHistSongFk) && candidates.length > 0) {
      state.csvHistSongKey = candidates[0].key;
      state.csvHistSongFk = candidates[0].fallbackKey;
    }

    const chipsHtml = candidates.length ? `
      <div class="hist-song-chips">
        ${candidates.map((item) => {
          const isSel = (state.csvHistSongKey && item.key === state.csvHistSongKey) || (state.csvHistSongFk && item.fallbackKey === state.csvHistSongFk);
          return `
            <button type="button" class="tier-pill hist-song-chip ${isSel ? 'active all-tier' : ''}" data-skey="${esc(item.key)}" data-sfk="${esc(item.fallbackKey)}">
              <span class="diff-${item.dChar}">[${item.dChar}]</span>
              <span class="truncate" style="max-width:150px;">${esc(item.title)}</span>
              <span class="tp-cnt mono">★${item.lv}${item.changeCount ? ` · ${item.changeCount}变` : ''}</span>
            </button>
          `;
        }).join('')}
      </div>
    ` : `<div style="font-size:12px;color:var(--muted);padding:4px 0;">${state.csvHistSongQuery ? '未在本地快照中找到匹配曲目。' : '当前快照间暂无同一曲目的变更轨迹，可输入曲名搜索任意已玩曲目。'}</div>`;

    let timelineHtml = '';
    if (state.csvHistSongKey || state.csvHistSongFk) {
      const pts = A.buildSongTimeline(modeSnaps, state.csvHistSongKey, state.csvHistSongFk);
      if (pts.length) {
        const latest = pts[pts.length - 1].rec;
        const canOpen = latest.hasChart && latest.chartId;
        timelineHtml = `
          <div class="hist-timeline-box">
            <div class="hist-timeline-head">
              <div>
                <span class="diff-${latest.dChar}" style="font-weight:800;margin-right:4px;">[${latest.dChar}]</span>
                <b>${esc(latest.title)}</b>
                <span class="mono" style="margin-left:6px;color:var(--muted);font-size:12px;">★${latest.lv || '—'} · ${esc(latest.verCode || latest.ver)}</span>
                ${latest.hasChart ? '' : '<span class="csv-nochart-tag">无谱面</span>'}
              </div>
              ${canOpen ? `<button type="button" class="btn btn-sm" id="btn-hist-open-song-modal" data-cid="${esc(latest.chartId)}">查看谱面详情 →</button>` : ''}
            </div>
            <div class="hist-timeline-list">
              ${pts.map((p) => {
                const sDelta = p.scoreDelta !== null && p.scoreDelta !== 0
                  ? `<span class="${p.scoreDelta > 0 ? 'hist-delta-pos' : 'hist-delta-neg'}">${p.scoreDelta > 0 ? '+' : ''}${p.scoreDelta}</span>`
                  : '';
                const bDelta = p.bpDelta !== null && p.bpDelta !== 0
                  ? `<span class="${p.bpDelta < 0 ? 'hist-delta-pos' : 'hist-delta-neg'}">${p.bpDelta > 0 ? '+' : ''}${p.bpDelta}</span>`
                  : '';
                const djCls = p.rec.dj === 'AAA' ? 'dj-AAA' : (p.rec.dj === 'AA' ? 'dj-AA' : (p.rec.dj === 'A' ? 'dj-A' : (p.rec.dj === 'B' ? 'dj-B' : 'dj-low')));
                const djBadge = p.rec.dj ? `<span class="dj-pill ${djCls} mono">${esc(p.rec.dj)}</span>` : '<span style="color:var(--muted);">—</span>';
                return `
                  <div class="hist-tl-item ${p.changed && !p.isFirst ? 'is-milestone' : ''}">
                    <div class="hist-tl-date mono">
                      <b>${esc(p.snapDate.slice(0, 10))}</b>
                      ${p.snapLabel ? `<span class="hist-tl-lbl">${esc(p.snapLabel)}</span>` : ''}
                      ${p.changed && !p.isFirst ? '<span class="hist-tl-tag">刷新</span>' : (p.isFirst ? '<span class="hist-tl-tag is-init">首次存档</span>' : '<span class="hist-tl-same">无变化</span>')}
                    </div>
                    <div class="hist-tl-metrics mono">
                      <span>${renderLampBadge(p.rec.lampMeta)}</span>
                      <span>${djBadge}</span>
                      <span>EX: <b>${p.rec.hasScore ? p.rec.score.toLocaleString() : '旧代灯'}</b> ${sDelta}</span>
                      <span>BP: <b>${p.rec.hasBp ? p.rec.bp : '—'}</b> ${bDelta}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }
    }

    resEl.innerHTML = `${chipsHtml}${timelineHtml}`;

    resEl.querySelectorAll('.hist-song-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.csvHistSongKey = btn.dataset.skey;
        state.csvHistSongFk = btn.dataset.sfk;
        renderCsvSongTimelineArea(modeSnaps, mode);
      });
    });
    document.getElementById('btn-hist-open-song-modal')?.addEventListener('click', (e) => {
      openChartModal(mode, e.currentTarget.dataset.cid);
    });
  }

  function renderCsvWorkspace() {
    const root = document.getElementById('csv-workspace');
    if (!state.csvReport) {
      const savedSnaps = [...state.csvSnapshots].reverse();
      const savedBarHtml = savedSnaps.length ? `
        <div class="card hist-landing-saved">
          <div class="hist-landing-head">
            <div>
              <h2 class="csv-sec-title">本机已备份的历史快照（共 ${savedSnaps.length} 份）</h2>
              <p class="csv-sec-sub">点击任意快照即可直接恢复完整诊断报告与历史对比。</p>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button type="button" id="btn-dz-export-json" class="btn btn-sm">导出本地备份</button>
              <button type="button" id="btn-dz-import-json" class="btn btn-sm">恢复备份 JSON</button>
            </div>
          </div>
          <div class="hist-landing-list">
            ${savedSnaps.slice(0, 8).map((s) => `
              <button type="button" class="hist-landing-item" data-snap-id="${esc(s.id)}">
                <span class="mono" style="font-weight:800;">${s.mode.toUpperCase()}</span>
                <span class="mono">${esc((s.latestPlayDate && s.latestPlayDate !== '—') ? s.latestPlayDate.slice(0, 10) : s.savedAt.slice(0, 10))}</span>
                <span class="truncate" style="flex:1;text-align:left;">${esc(s.label || s.filename)}</span>
                <span class="mono" style="color:var(--muted);">${s.playedCount} 谱</span>
                <span style="color:var(--accent-ink);font-weight:700;">载入 →</span>
              </button>
            `).join('')}
          </div>
        </div>
      ` : '';
      root.innerHTML = `
        <input id="dz-multi-csv-input" type="file" accept=".csv,text/csv" multiple class="hidden" />
        <input id="dz-backup-json-input" type="file" accept=".json,application/json" class="hidden" />
        <div class="card dropzone-card" id="csv-dropzone">
          <h1 class="dropzone-title">导入 Konami e-amusement 成绩 CSV · 八维诊断与手法指导</h1>
          <p class="dropzone-sub">
            拖入或选择从 e-amusement 官网导出的官方 IIDX SP / DP 成绩 CSV（如 <code>4776-4489_sp_score.csv</code>）。
            系统将结合 Textage 全量 16,657 张谱面的四血条物理定数与八维生物力学模型，防拉低估算你的 EC / NC / HC / EXHC 能力线，自动在本地备份历次快照并追踪推灯与涨分轨迹。
          </p>
          ${state.csvError ? `<div style="margin:0 auto 14px;max-width:560px;padding:10px 14px;border-radius:8px;background:var(--neg-soft);color:var(--neg);font-size:12.5px;font-weight:600;">${esc(state.csvError)}</div>` : ''}
          ${state.csvHistNotice ? `<div class="hist-notice" style="max-width:560px;margin:0 auto 12px;">${esc(state.csvHistNotice)}</div>` : ''}
          <div class="dropzone-actions">
            <button type="button" id="btn-dz-pick" class="btn btn-primary">选择 Konami CSV 文件</button>
            <button type="button" id="btn-dz-batch" class="btn">批量导入多份历史 CSV</button>
            <button type="button" id="btn-dz-restore-json" class="btn">恢复本地备份 (.json)</button>
          </div>
          <div class="privacy-note">
            100% 纯浏览器本地解析与 IndexedDB 快照存档，成绩不会上传到任何服务器 · 支持 UTF-8 / Shift-JIS 编码 · 支持随时导出/导入 JSON 备份。
          </div>
        </div>
        ${savedBarHtml}
      `;
      const dz = document.getElementById('csv-dropzone');
      document.getElementById('btn-dz-pick').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('global-csv-file').click();
      });
      document.getElementById('btn-dz-batch')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('dz-multi-csv-input')?.click();
      });
      document.getElementById('btn-dz-restore-json')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('dz-backup-json-input')?.click();
      });
      document.getElementById('btn-dz-import-json')?.addEventListener('click', () => {
        document.getElementById('dz-backup-json-input')?.click();
      });
      document.getElementById('btn-dz-export-json')?.addEventListener('click', exportLocalSnapshotsJson);
      document.getElementById('dz-multi-csv-input')?.addEventListener('change', (e) => {
        if (e.target.files?.length) batchImportCsvFiles(e.target.files);
        e.target.value = '';
      });
      document.getElementById('dz-backup-json-input')?.addEventListener('change', (e) => {
        const f = e.target.files?.[0];
        if (f) f.text().then(importLocalSnapshotsJson);
        e.target.value = '';
      });
      root.querySelectorAll('.hist-landing-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          const snap = state.csvSnapshots.find((s) => s.id === btn.dataset.snapId);
          if (snap) loadSnapshotIntoWorkspace(snap);
        });
      });
      dz.addEventListener('click', () => document.getElementById('global-csv-file').click());
      dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
      dz.addEventListener('drop', (e) => {
        e.preventDefault();
        dz.classList.remove('dragover');
        const files = e.dataTransfer?.files;
        if (files && files.length > 1) batchImportCsvFiles(files);
        else if (files?.[0]) loadFileObject(files[0]);
      });
      return;
    }

    const A = window.IIDXCsvAnalyzer;
    const rep = state.csvReport;
    const isSp = rep.mode === 'sp';
    const modeUpper = rep.mode.toUpperCase();
    const evalGauge = rep.evalGauge || 'nc';
    const evalGaugeShort = evalGauge.toUpperCase();
    const evalGaugeCn = evalGauge === 'hc' ? 'HC 白灯' : 'NC 蓝灯';
    const primaryIrt = rep.irt[evalGauge] || rep.irt.nc || rep.irt.ec;
    const sortedAxes = [...rep.axisAnalysis].sort((a, b) => b.strengthIndex - a.strengthIndex);
    const radarVals = rep.axisAnalysis.map((a) => a.radarPlotVal);
    const focusRangeStr = `★${rep.focusLevels[0]}–★${rep.focusLevels[rep.focusLevels.length - 1]}`;
    const activeLvs = rep.levelSummary.filter((l) => l.played > 0);
    const focusSet = new Set(rep.focusLevels);

    // Helper: render a single lamp progress bar row (calm palette via CSS)
    const renderLevelBarRow = (l, compact) => {
      const segs = LAMP_LEGEND_ITEMS.map((item) => {
        const cnt = l.counts[item.countKey];
        if (!cnt) return '';
        const pct = (cnt / l.played) * 100;
        return `<div class="lamp-bar-seg lamp-${item.key}" data-lamp="${item.key}" style="width:${pct.toFixed(2)}%;"></div>`;
      }).join('');
      const hcCleared = l.counts.HC + l.counts.EXHC + l.counts.FC;
      const shownClr = evalGauge === 'hc' ? hcCleared : l.clearedNc;
      const shownRate = l.played ? (shownClr / l.played) * 100 : 0;
      return `
        <div class="lv-prog-row ${compact ? 'is-compact' : ''}">
          <button type="button" class="btn btn-sm jump-lv-btn mono" data-jump-lv="${l.lv}" title="点击跳转到难度表查看 ★${l.lv} 清灯分布">★${l.lv}</button>
          <div class="lamp-bar-track ${compact ? 'is-compact' : ''}" data-lv="${l.lv}">${segs}</div>
          <div class="mono lv-prog-stat">
            <b style="color:var(--ink);">${shownClr}</b>/${l.played} <span style="opacity:0.7;">(${shownRate.toFixed(0)}%)</span>
          </div>
        </div>
      `;
    };

    // Focus-level mini lamp preview (top 2-3 active levels only — keeps Hero calm & informative)
    const heroLvs = [...activeLvs]
      .filter((l) => focusSet.has(l.lv))
      .sort((a, b) => b.lv - a.lv);
    const heroLampRowsHtml = (heroLvs.length ? heroLvs : activeLvs.slice(-3).reverse())
      .map((l) => renderLevelBarRow(l, true))
      .join('');

    // Slip-filter transparency banner (directly answers feedback #2!)
    const maxFiltered = Math.max(
      rep.irt.ec?.slipFiltered || 0,
      rep.irt.nc?.slipFiltered || 0,
      rep.irt.hc?.slipFiltered || 0
    );
    const slipNoticeHtml = maxFiltered >= 15
      ? `<div class="csv-slip-note">已启用 4PL 防拉低前沿校准：自动降权低区未复打 / Assist 异常，避免「高难已白灯、低难未复打」拉低评级。</div>`
      : '';

    const styleObj = (A && A.SP_GRIP_STYLES && A.SP_GRIP_STYLES[state.spStyle]) || { key: '1048', short: '1048式', label: '1048式（完全固定）', desc: '' };
    const styleOptionsHtml = (A && A.SP_GRIP_STYLES)
      ? Object.values(A.SP_GRIP_STYLES).map((st) => `<option value="${st.key}" ${state.spStyle === st.key ? 'selected' : ''}>${esc(st.short)}</option>`).join('')
      : '';

    const pgSummaryTxt = rep.avgPgRatio !== null
      ? (rep.syntheticPgCount > 0
        ? `<span title="源 CSV 中有 ${rep.syntheticPgCount} 张谱面为占位导出值，已自动过滤；按含真实判定细分的 ${rep.realPgCount} 谱计算">PG ${rep.avgPgRatio.toFixed(1)}% (${rep.realPgCount}谱)</span>`
        : `PG ${rep.avgPgRatio.toFixed(1)}%`)
      : '';
    const bpSummaryTxt = rep.avgFocusBp !== null ? `均BP ${rep.avgFocusBp.toFixed(0)}` : '';
    const scoreSubTxt = [pgSummaryTxt, bpSummaryTxt].filter(Boolean).join(' · ') || `本代 ${rep.scoredCount} 谱`;

    // Build active section tab HTML
    const activeSec = state.csvSectionTab || 'overview';
    const modeSnaps = getModeSnapshots(rep.mode);
    let histDiffObj = null;
    let sectionBodyHtml = '';

    if (activeSec === 'overview') {
      sectionBodyHtml = `
        <div class="csv-two-col">
          <div class="card diagnosis-box">
            <div>
              <h2 class="csv-sec-title">${modeUpper} 八维相对擅长度雷达</h2>
              <p class="csv-sec-sub">虚线为个人综合基准线 (0)：向外突出表示同定数下明显擅长，向内凹陷表示重点短板。</p>
            </div>
            <div class="inset-box">${renderRadarSvg(radarVals, rep.mode, 0.52)}</div>
            <div class="csv-core-kj-grid">
              <div class="inset-box">
                <div class="csv-mini-lbl">地力谱表现 (${rep.coreVsKj.core.n}谱)</div>
                <div class="mono csv-mini-val" style="color:${rep.coreVsKj.core.score >= 0 ? 'var(--pos)' : 'var(--neg)'};">${rep.coreVsKj.core.score > 0 ? '+' : ''}${rep.coreVsKj.core.score}</div>
                <div class="mono csv-mini-sub">实测${evalGaugeShort} ${rep.coreVsKj.core.actualNcPct.toFixed(0)}% / 预期 ${rep.coreVsKj.core.expectedNcPct.toFixed(0)}%</div>
              </div>
              <div class="inset-box">
                <div class="csv-mini-lbl">个人差谱表现 (${rep.coreVsKj.kojinsa.n}谱)</div>
                <div class="mono csv-mini-val" style="color:${rep.coreVsKj.kojinsa.score >= 0 ? 'var(--pos)' : 'var(--neg)'};">${rep.coreVsKj.kojinsa.score > 0 ? '+' : ''}${rep.coreVsKj.kojinsa.score}</div>
                <div class="mono csv-mini-sub">实测${evalGaugeShort} ${rep.coreVsKj.kojinsa.actualNcPct.toFixed(0)}% / 预期 ${rep.coreVsKj.kojinsa.expectedNcPct.toFixed(0)}%</div>
              </div>
            </div>
          </div>

          <div class="card diagnosis-box">
            <div>
              <h2 class="csv-sec-title">八维能力强弱排序</h2>
              <p class="csv-sec-sub">聚焦主攻区 <b>${focusRangeStr}</b> 与 <b>${evalGaugeCn}</b> 前沿，跨级/旧代与低区未复打已自动降权。</p>
            </div>
            <div class="csv-axis-list">
              ${sortedAxes.map((ax) => {
                const vCls = ax.strengthIndex >= 4 ? 'verdict-pos' : (ax.strengthIndex <= -4 ? 'verdict-neg' : 'verdict-mid');
                const sign = ax.strengthIndex > 0 ? '+' : '';
                return `
                  <div class="axis-card">
                    <div class="axis-card-top">
                      <div style="display:flex;align-items:center;gap:7px;">
                        <span style="font-weight:700;font-size:13px;">${esc(ax.label)}</span>
                        <span class="verdict-pill ${vCls}">${ax.verdict} (${sign}${ax.strengthIndex})</span>
                      </div>
                      <div class="mono" style="font-size:11px;color:var(--muted);">
                        主攻 ${ax.focusN}/${ax.n} · ${evalGaugeShort} <b>${ax.actualNcPct !== null ? ax.actualNcPct.toFixed(0) + '%' : '—'}</b> (预期 ${ax.expectedNcPct !== null ? ax.expectedNcPct.toFixed(0) + '%' : '—'})${ax.deltaExPct !== null ? ` · EX ${ax.deltaExPct > 0 ? '+' : ''}${ax.deltaExPct.toFixed(1)}%` : ''}
                      </div>
                    </div>
                    ${renderBipolarBar(ax.strengthIndex)}
                    <div class="axis-examples">
                      ${ax.highlights.length ? `<span class="ex-lbl ex-pos">高光</span>` + ax.highlights.slice(0, 2).map((h) => `<button type="button" class="pill modal-chart-btn" data-cid="${h.chart.id}" title="★${h.chart.lv} ${esc(h.chart.title)} (${h.lampMeta.short})" style="cursor:pointer;gap:4px;"><span class="lamp-dot lamp-${h.lampMeta.key}" style="width:6px;height:6px;"></span><span>★${h.chart.lv}</span><span class="axis-song-title truncate">${esc(h.chart.title)}</span><span>(${h.lampMeta.short})</span></button>`).join('') : ''}
                      ${ax.struggles.length ? `<span class="ex-lbl ex-neg">卡关</span>` + ax.struggles.slice(0, 2).map((s) => `<button type="button" class="pill modal-chart-btn" data-cid="${s.chart.id}" title="★${s.chart.lv} ${esc(s.chart.title)} (${s.lampMeta.short})" style="cursor:pointer;gap:4px;"><span class="lamp-dot lamp-${s.lampMeta.key}" style="width:6px;height:6px;"></span><span>★${s.chart.lv}</span><span class="axis-song-title truncate">${esc(s.chart.title)}</span><span>(${s.lampMeta.short})</span></button>`).join('') : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <details class="card csv-more-details">
          <summary>展开细分维度：配置标签表现 · BPM 速度带 · 物量耐力 · 抗压结构</summary>
          <div class="csv-equal-col" style="margin-top:12px;">
            <div class="inset-box">
              <h3 style="margin:0 0 8px;font-size:13.5px;font-weight:800;">细分配置标签表现（由弱到强）</h3>
              <div>${renderMetricRows(rep.tagStats, evalGauge)}</div>
            </div>
            <div class="inset-box" style="display:flex;flex-direction:column;gap:8px;">
              <h3 style="margin:0;font-size:13.5px;font-weight:800;">BPM 速度带 · 物量耐力 · 血条抗压</h3>
              <div style="font-size:11.5px;font-weight:700;color:var(--muted);">BPM 速度区间</div>
              <div>${renderMetricRows(rep.bpmBands, evalGauge)}</div>
              <div style="font-size:11.5px;font-weight:700;color:var(--muted);margin-top:4px;">物量与耐力区间</div>
              <div>${renderMetricRows(rep.staminaBands, evalGauge)}</div>
              <div style="font-size:11.5px;font-weight:700;color:var(--muted);margin-top:4px;">血条抗压结构</div>
              <div>${renderMetricRows([rep.lastKillStat, rep.midSpikeStat].filter((x) => x.n >= 2), evalGauge)}</div>
            </div>
          </div>
        </details>
      `;
    } else if (activeSec === 'grip') {
      if (isSp && rep.gripCoach) {
        const gc = rep.gripCoach;
        const sideLabel = state.spSide === '2p' ? '2P 右皿' : '1P 左皿';
        const styleBtnsHtml = Object.values(A.SP_GRIP_STYLES).map((st) => `
          <button type="button" class="grip-style-btn ${state.spStyle === st.key ? 'active' : ''}" data-sp-style="${st.key}">
            <span class="grip-style-name">${esc(st.short)}</span>
          </button>
        `).join('');
        sectionBodyHtml = `
          <div class="card diagnosis-box">
            <div class="csv-grip-head">
              <div>
                <h2 class="csv-sec-title">SP 主力手法适配 &amp; 切手势通关建议（${sideLabel}）</h2>
                <p class="csv-sec-sub">选择你平时最常用的主力手势，系统将结合你的八维短板与未清谱面，推荐最适合切换的副手法与选项。</p>
              </div>
              <div class="grip-style-picker" role="group" aria-label="选择你的常用手法">${styleBtnsHtml}</div>
            </div>
            <div class="inset-box" style="font-size:12.5px;color:var(--ink-2);line-height:1.55;">
              <b style="color:var(--ink);">${esc(gc.style.label)}：</b>${esc(gc.style.desc)}
            </div>
            <div class="csv-grip-insights">
              ${gc.insights.map((ins) => `
                <div class="grip-insight-card">
                  <div class="grip-insight-top">
                    <span class="grip-insight-title">${esc(ins.title)}</span>
                    <span class="grip-pill grip-pill-switch">${esc(ins.action)}</span>
                  </div>
                  <p class="grip-insight-desc">${esc(ins.detail)}</p>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="card diagnosis-box">
            <div>
              <h2 class="csv-sec-title">建议「切手势 / 换选项」攻克的待推灯谱面（目标：${esc(gc.targetGaugeLabel)}）</h2>
              <p class="csv-sec-sub">从主攻区 ${focusRangeStr} 未达目标灯的 AC 在库谱面中筛选，点击任意卡片可看详细手型分布与八维雷达。</p>
            </div>
            ${gc.candidates.length ? `
              <div class="rec-grid-2">
                ${gc.candidates.map((item) => {
                  const c = item.chart;
                  const r = item.rec;
                  const gRec = item.grip;
                  return `
                    <div role="button" tabindex="0" class="song-rec-item modal-chart-btn" data-cid="${c.id}">
                      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                        <div class="truncate" style="font-weight:700;font-size:12.5px;">
                          <span class="chip-lv mono">★${c.lv}</span>
                          <span class="diff-${c.dChar}" style="margin:0 4px;">[${c.dChar}]</span>
                          ${esc(c.title)}
                        </div>
                        <div style="display:inline-flex;align-items:center;gap:5px;flex-shrink:0;">
                          ${renderLampBadge(r.lampMeta)}
                          ${renderPracticeLink(c, true)}
                        </div>
                      </div>
                      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin-top:2px;">
                        <span class="grip-pill ${gRec.needsSwitch ? 'grip-pill-switch' : 'grip-pill-ok'}">${esc(gRec.primary.altGrip)}</span>
                        ${c.optGain >= 0.03 ? `<span class="grip-pill grip-pill-opt mono">${esc(c.bestOpt)} (-${(c.optGain * 100).toFixed(1)}%)</span>` : ''}
                      </div>
                      <div style="font-size:11.5px;color:var(--muted);line-height:1.45;">${esc(gRec.primary.reason)}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : '<div style="font-size:12.5px;color:var(--muted);padding:12px 0;">主攻区内暂无亟需切手势的未清谱面，可在「推灯练歌计划」探索更高定数新曲。</div>'}
          </div>

          <div class="card diagnosis-box">
            <h2 class="csv-sec-title">什么是「手型减负 -X%」？</h2>
            <div class="opt-explain-body">
              <p><b>一句话理解：</b>把「正規 (-)」在当前 <b>${sideLabel}</b> 下的综合手型负荷记为 100%，切换推荐选项后预计降低的负荷比例就是「手型减负 -X%」。它衡量的是<b>顺手度改善</b>（缓解偏手/皿侧冲突/弱指连打/固定纵连），而不是直接减少谱面物量。</p>
              <div class="csv-opt-guide-grid">
                <div class="inset-box"><b>鏡 (MIRROR)</b><p>零随机方差，专治 1P 左侧 1-3 键偏重或 2P 右侧 5-7 键偏重（如 5.1.1. 2P 鏡减负 -13%）。</p></div>
                <div class="inset-box"><b>R乱 (R-RANDOM)</b><p>12 种循环位移，在保留阶段顺手度的同时把边缘弱指轴移到中轴强指。</p></div>
                <div class="inset-box"><b>乱 (RANDOM)</b><p>拆散 1-2/6-7 同手颤音与糟糕固定二重配置，均衡左右手密度，是中高星地力主力。</p></div>
                <div class="inset-box"><b>S乱 (S-RANDOM)</b><p>逐音拆纵连与单键轴，仅在和弦足够低、不易误连的谱面上推荐。</p></div>
              </div>
            </div>
          </div>
        `;
      } else {
        sectionBodyHtml = `
          <div class="card diagnosis-box">
            <h2 class="csv-sec-title">DP 选项与手型减负说明</h2>
            <div class="opt-explain-body">
              <p>DP 模式采用标准 AC 合法选项（<code>FLIP</code> + 1P/2P 独立 <code>OFF / MIR / R-RAN / RAN / S-RAN</code>）生物力学求解；<b>手型减负 -X%</b> 表示相对正規预计降低的单手弱指、無理押し、無理皿与左右盘失衡负荷比例。点击任意谱面或前往「DP 选项减负榜」可查看逐谱推荐。</p>
            </div>
          </div>
        `;
      }
    } else if (activeSec === 'coach') {
      const recData = rep.recommendations;
      const renderGripTag = (c) => {
        if (!isSp || !A?.recommendGripForChart) return '';
        const g = A.recommendGripForChart(c, state.spStyle, state.spSide);
        return g.needsSwitch ? `<span class="grip-pill grip-pill-mini">${esc(g.primary.badge)}</span>` : '';
      };

      let coachContentHtml = '';
      if (state.csvCoachTab === 'quick') {
        coachContentHtml = recData.quickWins.length ? `
          <div style="font-size:12px;color:var(--muted);">
            已有游玩记录但尚未达成 <b>${recData.targetGauge.toUpperCase()}</b>，且定数紧贴或低于当前能力线的最高性价比目标：
          </div>
          <div class="rec-grid-2">
            ${recData.quickWins.map((q) => {
              const c = q.chart;
              const r = q.rec;
              return `
                <div role="button" tabindex="0" class="song-rec-item modal-chart-btn" data-cid="${c.id}">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                    <div class="truncate" style="font-weight:700;font-size:12.5px;">
                      <span class="chip-lv mono">★${c.lv}</span>
                      <span class="diff-${c.dChar}" style="margin:0 4px;">[${c.dChar}]</span>
                      ${esc(c.title)}
                    </div>
                    <div style="display:inline-flex;align-items:center;gap:5px;flex-shrink:0;">
                      ${renderGripTag(c)}
                      ${renderLampBadge(r.lampMeta)}
                      ${renderPracticeLink(c, true)}
                    </div>
                  </div>
                  <div class="mono" style="font-size:11.5px;color:var(--muted);display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;">
                    <span>${esc(q.reason)}</span>
                    <span>${recData.targetGauge.toUpperCase()} CP <b>${c['s_' + recData.targetGauge].toFixed(1)}</b> · ${esc(c.bestOpt)}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : '<div style="font-size:12.5px;color:var(--muted);padding:16px 0;">当前目标等级与血条下暂无待复仇谱面，可切换「地力主线」探索新曲。</div>';
      } else if (state.csvCoachTab === 'weak') {
        coachContentHtml = recData.weaknessLadders.map((wl) => {
          const ax = wl.axis;
          return `
            <div class="ladder-card">
              <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-weight:800;font-size:14px;">专项补强：${esc(ax.label)}</span>
                  <span class="verdict-pill ${ax.strengthIndex <= -4 ? 'verdict-neg' : 'verdict-mid'} mono">擅长指数 ${ax.strengthIndex > 0 ? '+' : ''}${ax.strengthIndex}</span>
                </div>
                <span style="font-size:11.5px;color:var(--accent-ink);font-weight:600;">选项思路：${esc(ax.optTip)}</span>
              </div>
              <div style="font-size:12px;color:var(--ink-2);line-height:1.55;"><b>练习建议：</b>${esc(ax.tip)}</div>
              <div class="ladder-stages">
                ${wl.stages.map((st) => `
                  <div class="stage-col">
                    <div class="stage-title">${esc(st.title)}</div>
                    ${st.picks.length ? st.picks.map((p) => {
                      const c = p.chart;
                      const ex = p.existing;
                      return `
                        <div role="button" tabindex="0" class="song-rec-item modal-chart-btn" data-cid="${c.id}">
                          <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;">
                            <span class="truncate" style="font-weight:700;font-size:12px;">
                              <span class="diff-${c.dChar}">[${c.dChar}]</span> ${esc(c.title)}
                            </span>
                            <div style="display:inline-flex;align-items:center;gap:4px;flex-shrink:0;">
                              ${ex ? renderLampBadge(ex.lampMeta) : '<span class="pill" style="font-size:10px;padding:1px 5px;">未玩</span>'}
                              ${renderPracticeLink(c, true)}
                            </div>
                          </div>
                          <div class="mono" style="font-size:11px;color:var(--muted);display:flex;justify-content:space-between;">
                            <span>★${c.lv} · ${esc(c.bestOpt)}</span>
                            <span>CP ${c['s_' + recData.targetGauge].toFixed(1)} · 轴${c.radar[ax.idx]}</span>
                          </div>
                        </div>
                      `;
                    }).join('') : '<div style="font-size:11.5px;color:var(--muted);padding:6px 0;">此区间内暂未找到未清同特征曲。</div>'}
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('');
      } else if (state.csvCoachTab === 'core') {
        coachContentHtml = `
          <div style="font-size:12px;color:var(--muted);">
            精选能力线附近的纯 <b>地力 (Core)</b> AC 在库谱面，按 <b>${recData.targetGauge.toUpperCase()} CP</b> 由浅入深排列：
          </div>
          <div class="rec-grid-2">
            ${recData.coreLadder.length ? recData.coreLadder.map((item, idx) => {
              const c = item.chart;
              const ex = item.existing;
              return `
                <div role="button" tabindex="0" class="song-rec-item modal-chart-btn" data-cid="${c.id}">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                    <div class="truncate" style="font-weight:700;font-size:12.5px;">
                      <span class="mono" style="color:var(--muted);margin-right:4px;">${String(idx + 1).padStart(2, '0')}.</span>
                      <span class="chip-lv mono">★${c.lv}</span>
                      <span class="diff-${c.dChar}" style="margin:0 4px;">[${c.dChar}]</span>
                      ${esc(c.title)}
                    </div>
                    <div style="display:inline-flex;align-items:center;gap:5px;flex-shrink:0;">
                      ${ex ? renderLampBadge(ex.lampMeta) : '<span class="pill" style="font-size:10px;padding:1px 5px;">新曲</span>'}
                      ${renderPracticeLink(c, true)}
                    </div>
                  </div>
                  <div class="mono" style="font-size:11.5px;color:var(--muted);display:flex;justify-content:space-between;gap:6px;">
                    <span>${esc(c.verCode)} · ${esc(c.tags.slice(0, 2).join('/'))} · ${esc(c.bestOpt)}</span>
                    <span>CP <b>${item.cpVal.toFixed(1)}</b> · 预期胜率 ${(item.pTarget * 100).toFixed(0)}%</span>
                  </div>
                </div>
              `;
            }).join('') : '<div style="font-size:12px;color:var(--muted);padding:12px 0;">该目标条件下暂未找到合适的新地力谱面。</div>'}
          </div>
        `;
      } else {
        const sKeyShow = evalGauge === 'hc' ? 's_hc' : 's_nc';
        const renderOutlierList = (arr, isGood) => arr.length ? arr.map((r) => `
          <div role="button" tabindex="0" class="song-rec-item modal-chart-btn" data-cid="${r.chart.id}">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
              <span class="truncate" style="font-weight:700;font-size:12px;">
                <span class="chip-lv mono">★${r.chart.lv}</span>
                <span class="diff-${r.chart.dChar}" style="margin:0 4px;">[${r.chart.dChar}]</span>
                ${esc(r.chart.title)}
              </span>
              <div style="display:inline-flex;align-items:center;gap:5px;flex-shrink:0;">
                ${renderGripTag(r.chart)}
                ${renderLampBadge(r.lampMeta)}
                ${renderPracticeLink(r.chart, true)}
              </div>
            </div>
            <div class="mono" style="font-size:11px;color:var(--muted);display:flex;justify-content:space-between;">
              <span>[${esc(r.chart.tags.slice(0, 2).join('/'))}] ${r.exRate !== null ? `EX ${(r.exRate * 100).toFixed(1)}%` : '旧代灯'}${r.hasBp ? ` · ${r.bp} BP` : ''}</span>
              <span style="color:${isGood ? 'var(--pos)' : 'var(--neg)'};font-weight:700;">${evalGaugeShort} CP ${r.chart[sKeyShow].toFixed(1)} (预期 ${(r.pNc * 100).toFixed(0)}%)</span>
            </div>
          </div>
        `).join('') : '<div style="font-size:12px;color:var(--muted);">暂无明显异常谱面。</div>';

        coachContentHtml = `
          <div class="csv-equal-col">
            <div style="display:flex;flex-direction:column;gap:7px;">
              <div style="font-size:13px;font-weight:800;color:var(--pos);">高光超常发挥 Top 10</div>
              ${renderOutlierList(rep.topOverperform, true)}
            </div>
            <div style="display:flex;flex-direction:column;gap:7px;">
              <div style="font-size:13px;font-weight:800;color:var(--neg);">最值得重打 / 复仇 Top 10</div>
              ${renderOutlierList(rep.topUnderperform, false)}
            </div>
          </div>
        `;
      }

      sectionBodyHtml = `
        <div class="card coach-section">
          <div class="coach-head">
            <div>
              <h2 class="csv-sec-title">推灯练歌清单（目标：${recData.targetGauge.toUpperCase()}）</h2>
              <div class="csv-sec-sub">点击任意曲目弹出详情与手法建议，SP 谱面可点击「练习 ↗」直接导入 iidx-play.cee.ee。</div>
            </div>
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;">
              <label style="font-size:12px;color:var(--muted);display:flex;align-items:center;gap:5px;">
                目标血条
                <select id="csv-target-gauge" class="select-input">
                  <option value="ec" ${state.csvTargetGauge === 'ec' ? 'selected' : ''}>EC 绿灯</option>
                  <option value="nc" ${state.csvTargetGauge === 'nc' ? 'selected' : ''}>NC 蓝灯</option>
                  <option value="hc" ${state.csvTargetGauge === 'hc' ? 'selected' : ''}>HC 白灯</option>
                  <option value="exhc" ${state.csvTargetGauge === 'exhc' ? 'selected' : ''}>EXHC 黄灯</option>
                </select>
              </label>
              <label style="font-size:12px;color:var(--muted);display:flex;align-items:center;gap:5px;">
                目标等级
                <select id="csv-target-lv" class="select-input">
                  <option value="0" ${state.csvTargetLevel === 0 ? 'selected' : ''}>主攻区 (${focusRangeStr})</option>
                  ${ALL_LEVELS.map((lv) => `<option value="${lv}" ${state.csvTargetLevel === lv ? 'selected' : ''}>定向攻克 ★${lv}</option>`).join('')}
                </select>
              </label>
            </div>
          </div>
          <div class="coach-tabs">
            <button type="button" class="coach-tab ${state.csvCoachTab === 'quick' ? 'active' : ''}" data-ctab="quick">临门一脚 (${recData.quickWins.length})</button>
            <button type="button" class="coach-tab ${state.csvCoachTab === 'weak' ? 'active' : ''}" data-ctab="weak">补短板三阶 (${recData.weaknessLadders.length}项)</button>
            <button type="button" class="coach-tab ${state.csvCoachTab === 'core' ? 'active' : ''}" data-ctab="core">地力主线 (${recData.coreLadder.length})</button>
            <button type="button" class="coach-tab ${state.csvCoachTab === 'outliers' ? 'active' : ''}" data-ctab="outliers">高光 &amp; 复仇</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px;">${coachContentHtml}</div>
        </div>
      `;
    } else if (activeSec === 'songs') {
      const sortOpts = [
        ['lv', '按等级'],
        ['lamp', '按点灯'],
        ['dj', '按分数等级'],
        ['score', '按 EX Score'],
        ['exRate', '按得分率 %'],
        ['bp', '按 BP'],
        ['cp', `按 ${evalGaugeShort} CP`],
        ['lastPlayed', '按最近游玩'],
        ['title', '按曲名'],
      ];

      sectionBodyHtml = `
        <div class="card csv-songs-card ${state.csvTableMobileFiltersOpen ? 'csv-mobile-filters-open' : ''}" id="csv-songs-card">
          <div class="csv-songs-head">
            <div>
              <h2 class="csv-sec-title">已游玩歌曲成绩表（${modeUpper} · 共 ${rep.playedCount.toLocaleString()} 谱）</h2>
              <p class="csv-sec-sub">点击等级、点灯、评价胶囊即可单选或多选叠加，支持 EX / BP 区间与全列点击排序。${rep.unmatchedChartCount ? ` 含 ${rep.unmatchedChartCount} 谱 Textage 暂未收录谱面（标有「无谱面」，保留完整 CSV 原始成绩）。` : ''}</p>
            </div>
            <button type="button" id="btn-csv-tbl-reset" class="btn btn-sm hidden">重置筛选</button>
          </div>

          <div class="csv-songs-toolbar">
            <div id="csv-songs-pills-area" class="csv-songs-pills-area"></div>

            <div class="filter-row filter-row-divider csv-songs-ctrl-row">
              <div class="csv-songs-ranges csv-mobile-collapsible">
                <div class="csv-range-filter-group" title="按 EX Score 区间筛选（留空表示不限）">
                  <span class="csv-rf-lbl">EX</span>
                  <input id="csv-tbl-ex-min" type="number" inputmode="numeric" min="0" step="50" class="mono csv-rf-input" placeholder="最低" value="${esc(state.csvTableExMin)}" aria-label="最低 EX Score" />
                  <span class="csv-rf-sep">~</span>
                  <input id="csv-tbl-ex-max" type="number" inputmode="numeric" min="0" step="50" class="mono csv-rf-input" placeholder="最高" value="${esc(state.csvTableExMax)}" aria-label="最高 EX Score" />
                </div>
                <div class="csv-range-filter-group" title="按 BP (Miss Count) 区间筛选（留空表示不限）">
                  <span class="csv-rf-lbl">BP</span>
                  <input id="csv-tbl-bp-min" type="number" inputmode="numeric" min="0" step="1" class="mono csv-rf-input" placeholder="最低" value="${esc(state.csvTableBpMin)}" aria-label="最低 BP" />
                  <span class="csv-rf-sep">~</span>
                  <input id="csv-tbl-bp-max" type="number" inputmode="numeric" min="0" step="1" class="mono csv-rf-input" placeholder="最高" value="${esc(state.csvTableBpMax)}" aria-label="最高 BP" />
                </div>
              </div>

              <div class="csv-songs-right-ctrl">
                <div class="csv-search-wrap">
                  <input id="csv-tbl-search" type="search" class="text-input csv-tbl-search" placeholder="搜索曲名 / 曲师 / 版本..." value="${esc(state.csvTableSearch)}" />
                  <button type="button" id="btn-csv-tbl-mobile-filters" class="btn mobile-filter-btn" aria-expanded="false">EX/BP ▾</button>
                </div>
                <div class="csv-sort-pick">
                  <select id="csv-tbl-sort-col" class="select-input" aria-label="排序字段">
                    ${sortOpts.map(([v, l]) => `<option value="${v}" ${state.csvTableSortCol === v ? 'selected' : ''}>${l}</option>`).join('')}
                  </select>
                  <button type="button" id="csv-tbl-sort-dir" class="btn btn-sm mono">${state.csvTableSortDir < 0 ? '↓ 降序' : '↑ 升序'}</button>
                </div>
              </div>
            </div>
          </div>

          <div id="csv-songs-results"></div>
        </div>
      `;
    } else if (activeSec === 'history') {
      ensureHistoryPairSelection(rep.mode, false);
      const baseSnap = modeSnaps.find((s) => s.id === state.csvHistBaseId) || null;
      const targetSnap = modeSnaps.find((s) => s.id === state.csvHistTargetId) || null;
      if (baseSnap && targetSnap && baseSnap.id !== targetSnap.id) {
        histDiffObj = A.diffCsvSnapshots(baseSnap, targetSnap);
      }

      const fmtSigned = (v, digits = 0) => {
        if (v === null || v === undefined || !Number.isFinite(v)) return '—';
        if (Math.abs(v) < 1e-9) return '0';
        const txt = digits > 0 ? Math.abs(v).toFixed(digits) : Math.abs(v).toLocaleString();
        return v > 0 ? `+${txt}` : `-${txt}`;
      };
      const deltaCls = (v) => (v > 0 ? 'hist-delta-pos' : (v < 0 ? 'hist-delta-neg' : 'hist-delta-zero'));

      const snapRowsHtml = [...modeSnaps].reverse().map((s) => {
        const dt = (s.latestPlayDate && s.latestPlayDate !== '—') ? s.latestPlayDate : s.savedAt.slice(0, 16).replace('T', ' ');
        const isActive = s.id === state.csvActiveSnapshotId;
        const hcPlus = (s.lampTotals?.HC || 0) + (s.lampTotals?.EXHC || 0) + (s.lampTotals?.FC || 0);
        const aaaCnt = s.djCounts?.AAA || 0;
        const cpStr = [
          s.irt?.nc !== null && s.irt?.nc !== undefined ? `NC ${s.irt.nc.toFixed(1)}` : '',
          s.irt?.hc !== null && s.irt?.hc !== undefined ? `HC ${s.irt.hc.toFixed(1)}` : '',
        ].filter(Boolean).join(' · ') || '—';
        return `
          <div class="hist-snap-item ${isActive ? 'is-active' : ''}" data-snap-row="${esc(s.id)}">
            <div class="hist-snap-main">
              <div class="hist-snap-top">
                <span class="mono hist-snap-date">${esc(dt)}</span>
                ${isActive ? '<span class="hist-cur-badge">当前</span>' : ''}
                ${s.label ? `<span class="hist-lbl-badge">${esc(s.label)}</span>` : ''}
                <span class="hist-snap-fn truncate" title="${esc(s.filename)}">${esc(s.filename)}</span>
              </div>
              <div class="hist-snap-meta mono">
                <span><b>${s.playedCount}</b> 谱</span>
                <span>${esc(cpStr)}</span>
                <span>HC+ ${hcPlus}</span>
                <span>AAA ${aaaCnt}</span>
              </div>
              <div class="hist-snap-edit hidden" data-edit-wrap="${esc(s.id)}">
                <input type="text" class="text-input hist-lbl-input" maxlength="32" placeholder="输入备注（如：十段合格 / 11月练习前）" value="${esc(s.label || '')}" />
                <button type="button" class="btn btn-sm btn-primary hist-lbl-save" data-snap-id="${esc(s.id)}">保存</button>
                <button type="button" class="btn btn-sm hist-lbl-cancel">取消</button>
              </div>
            </div>
            <div class="hist-snap-actions">
              ${!isActive ? `<button type="button" class="btn btn-sm hist-act-load" data-snap-id="${esc(s.id)}" title="切换主诊断面板查看这份历史快照">载入</button>` : ''}
              <button type="button" class="btn btn-sm hist-act-label" data-snap-id="${esc(s.id)}">备注</button>
              <button type="button" class="btn btn-sm btn-ghost-danger hist-act-del" data-snap-id="${esc(s.id)}">删除</button>
            </div>
          </div>
        `;
      }).join('');

      let compareCardHtml = '';
      if (modeSnaps.length < 2) {
        compareCardHtml = `
          <div class="card hist-empty-compare">
            <h3 class="csv-sec-title" style="margin-bottom:4px;">再导入 1 份不同日期的 ${modeUpper} CSV，即可解锁历史对比与单曲轨迹</h3>
            <p class="csv-sec-sub">
              当前这份成绩已自动存档到本机浏览器（IndexedDB）。后续每次导出新的 Konami CSV 导入，或点击上方「+ 导入历史 CSV」一次多选几份旧档，即可自动分析：
              <b>四血条 CP 成长曲线</b>、<b>推灯突破清单</b>、<b>EX 涨分 / BP 减少排行</b>，以及<b>同一首歌的历次变化记录</b>。
            </p>
          </div>
        `;
      } else if (histDiffObj) {
        const k = histDiffObj.kpi;
        const primaryKey = evalGauge === 'hc' ? 'hc' : 'nc';
        const priCp = k.cpDeltas[primaryKey] || k.cpDeltas.nc;
        const gaugeOrder = [['ec', 'EC'], ['nc', 'NC'], ['hc', 'HC'], ['exhc', 'EXHC']];
        const gaugeSubStr = gaugeOrder.map(([gk, gl]) => {
          const d = k.cpDeltas[gk];
          if (!d || d.after === null) return '';
          const dTxt = d.delta !== null ? ` (<span class="${deltaCls(d.delta)}">${fmtSigned(d.delta, 1)}</span>)` : '';
          return `${gl} ${d.after.toFixed(1)}${dTxt}`;
        }).filter(Boolean).join(' · ');

        const histSortOpts = [
          ['impact', '按突破权重'],
          ['lv', '按等级'],
          ['scoreDelta', '按 EX 涨幅'],
          ['bpDelta', '按 BP 降幅'],
          ['title', '按曲名'],
        ];

        compareCardHtml = `
          <div class="card hist-compare-card">
            <div class="hist-compare-head">
              <div>
                <h2 class="csv-sec-title">快照进步对比（${modeUpper}）</h2>
                <p class="csv-sec-sub">自由选择任意两份本地快照，对比推灯突破、EX 刷新、BP 降低与能力线成长。</p>
              </div>
              <div class="hist-preset-btns">
                <button type="button" id="btn-hist-pair-recent" class="btn btn-sm">最近两次</button>
                <button type="button" id="btn-hist-pair-span" class="btn btn-sm">首尾总进步</button>
              </div>
            </div>

            <div class="hist-pair-bar">
              <label class="hist-pair-field">
                <span class="filter-label">对比基准（旧）</span>
                <select id="csv-hist-base-sel" class="select-input">
                  ${modeSnaps.map((s) => `<option value="${esc(s.id)}" ${s.id === baseSnap.id ? 'selected' : ''}>${esc(formatSnapShortLabel(s))}</option>`).join('')}
                </select>
              </label>
              <span class="hist-pair-arrow mono">→</span>
              <label class="hist-pair-field">
                <span class="filter-label">目标快照（新）</span>
                <select id="csv-hist-target-sel" class="select-input">
                  ${modeSnaps.map((s) => `<option value="${esc(s.id)}" ${s.id === targetSnap.id ? 'selected' : ''}>${esc(formatSnapShortLabel(s))}</option>`).join('')}
                </select>
              </label>
            </div>

            <div class="hist-kpi-grid">
              <div class="hist-kpi-cell">
                <div class="csv-mini-lbl">${evalGaugeShort} 有效能力线</div>
                <div class="hist-kpi-val mono">
                  ${priCp?.after !== null && priCp?.after !== undefined ? `CP ${priCp.after.toFixed(1)}` : '—'}
                  ${priCp?.delta !== null && priCp?.delta !== undefined ? `<span class="hist-kpi-delta ${deltaCls(priCp.delta)}">${fmtSigned(priCp.delta, 1)}</span>` : ''}
                </div>
                <div class="csv-mini-sub mono">${gaugeSubStr || '样本不足'}</div>
              </div>
              <div class="hist-kpi-cell">
                <div class="csv-mini-lbl">推灯突破</div>
                <div class="hist-kpi-val mono">
                  ${histDiffObj.counts.lampUp} <span class="hist-kpi-unit">谱</span>
                  <span class="hist-kpi-delta ${deltaCls(k.lampDeltas.HC_PLUS)}">HC+ ${fmtSigned(k.lampDeltas.HC_PLUS)}</span>
                </div>
                <div class="csv-mini-sub mono">FC ${fmtSigned(k.lampDeltas.FC)} · EXHC ${fmtSigned(k.lampDeltas.EXHC)} · NC+ ${fmtSigned(k.lampDeltas.NC_PLUS)}</div>
              </div>
              <div class="hist-kpi-cell">
                <div class="csv-mini-lbl">EX 刷新 &amp; 评价提升</div>
                <div class="hist-kpi-val mono">
                  ${histDiffObj.counts.scoreUp} <span class="hist-kpi-unit">谱</span>
                  <span class="hist-kpi-delta ${deltaCls(k.djDeltas.AAA)}">AAA ${fmtSigned(k.djDeltas.AAA)}</span>
                </div>
                <div class="csv-mini-sub mono">AA+ ${fmtSigned(k.djDeltas.AA_PLUS)} · 评价升级 ${histDiffObj.counts.djUp} 谱</div>
              </div>
              <div class="hist-kpi-cell">
                <div class="csv-mini-lbl">新增游玩 &amp; 控 BP</div>
                <div class="hist-kpi-val mono">
                  ${histDiffObj.counts.newPlay} <span class="hist-kpi-unit">新谱</span>
                  <span class="hist-kpi-delta ${deltaCls(k.playedDelta)}">总 ${fmtSigned(k.playedDelta)}</span>
                </div>
                <div class="csv-mini-sub mono">BP 减少 ${histDiffObj.counts.bpDown} 谱 · 共 ${histDiffObj.counts.total} 谱变化</div>
              </div>
            </div>

            ${renderCsvHistoryTrendSvg(modeSnaps)}

            <div class="csv-songs-toolbar hist-diff-toolbar">
              <div id="csv-hist-pills-area" class="csv-songs-pills-area"></div>
              <div class="filter-row filter-row-divider hist-diff-ctrl">
                <input id="csv-hist-search" type="search" class="text-input csv-tbl-search" placeholder="筛选变化曲名 / 曲师 / 版本..." value="${esc(state.csvHistSearch)}" />
                <select id="csv-hist-sort" class="select-input" aria-label="变化排序方式">
                  ${histSortOpts.map(([v, l]) => `<option value="${v}" ${state.csvHistSort === v ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
              </div>
            </div>
            <div id="csv-hist-diff-results"></div>
          </div>

          <div class="card hist-song-card" id="csv-hist-song-card">
            <div class="hist-compare-head">
              <div>
                <h2 class="csv-sec-title">单曲历史轨迹（同一首歌的历次记录）</h2>
                <p class="csv-sec-sub">搜索任意歌曲或点击下方高频进步曲目，查看该谱面在所有本地快照中的推灯、EX 与 BP 演进。</p>
              </div>
            </div>
            <div class="hist-song-search-row">
              <input id="csv-hist-song-search" type="search" class="text-input" placeholder="输入曲名 / 曲师查询单曲历史轨迹..." value="${esc(state.csvHistSongQuery)}" />
            </div>
            <div id="csv-hist-song-results"></div>
          </div>
        `;
      }

      sectionBodyHtml = `
        <input id="csv-hist-multi-input" type="file" accept=".csv,text/csv" multiple class="hidden" />
        <input id="csv-hist-json-input" type="file" accept=".json,application/json" class="hidden" />
        <div class="hist-stack">
          <div class="card hist-lib-card">
            <div class="hist-lib-head">
              <div>
                <h2 class="csv-sec-title">本地 CSV 快照备份（${modeUpper} · 共 ${modeSnaps.length} 份）</h2>
                <p class="csv-sec-sub">每次导入 CSV 会自动去重存档到本机浏览器 IndexedDB；可随时导出 JSON 备份文件防清理丢失。</p>
              </div>
              <div class="hist-lib-btns">
                <button type="button" id="btn-hist-batch-csv" class="btn btn-sm btn-primary">+ 导入历史 CSV</button>
                <button type="button" id="btn-hist-export-json" class="btn btn-sm">导出本地备份</button>
                <button type="button" id="btn-hist-import-json" class="btn btn-sm">恢复备份</button>
              </div>
            </div>
            ${state.csvHistNotice ? `<div class="hist-notice">${esc(state.csvHistNotice)}</div>` : ''}
            <div class="hist-snap-list">
              ${snapRowsHtml || '<div style="font-size:12px;color:var(--muted);padding:8px 0;">正在同步当前快照到本地存档...</div>'}
            </div>
          </div>
          ${compareCardHtml}
        </div>
      `;
    } else {
      const primaryLvs = activeLvs.filter((l) => focusSet.has(l.lv) || l.played >= 60).sort((a, b) => b.lv - a.lv);
      const primaryLvSet = new Set(primaryLvs.map((l) => l.lv));
      const otherLvs = activeLvs.filter((l) => !primaryLvSet.has(l.lv)).sort((a, b) => b.lv - a.lv);
      const djSummary = Object.entries(rep.djCounts).filter(([, cnt]) => cnt > 0).map(([k, cnt]) => `${k} ${cnt}`).join(' · ');

      sectionBodyHtml = `
        <div class="card diagnosis-box">
          <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;">
            <div>
              <h2 class="csv-sec-title">各等级清灯分布（右侧显示 ${evalGaugeShort}+ 达成率）</h2>
              <p class="csv-sec-sub">悬停或点按进度条查看各灯曲数，点击星级跳转难度表查看逐曲清灯叠加。</p>
            </div>
            <div class="csv-lamp-legend">
              ${LAMP_LEGEND_ITEMS.map((item) => `<span class="csv-legend-item"><span class="lamp-dot lamp-static lamp-${item.key}"></span>${item.label}</span>`).join('')}
            </div>
          </div>

          <div class="csv-lamp-group-title">主攻与高频游玩等级</div>
          <div class="level-progress-grid">${primaryLvs.map((l) => renderLevelBarRow(l, false)).join('')}</div>

          ${otherLvs.length ? `
            <details class="csv-other-lvs" ${primaryLvs.length <= 2 ? 'open' : ''}>
              <summary>其他已游玩等级（${otherLvs.length} 个星级，共 ${otherLvs.reduce((a, b) => a + b.played, 0)} 谱）</summary>
              <div class="level-progress-grid" style="margin-top:10px;">${otherLvs.map((l) => renderLevelBarRow(l, false)).join('')}</div>
            </details>
          ` : ''}

          ${djSummary ? `<div class="mono" style="font-size:11.5px;color:var(--muted);padding-top:6px;border-top:1px solid var(--border);">DJ 评价分布：${esc(djSummary)}</div>` : ''}
        </div>
      `;
    }

    const gaugeCells = [
      { key: 'ec', label: 'EC 绿灯', data: rep.irt.ec, cls: 'g-ec' },
      { key: 'nc', label: 'NC 蓝灯', data: rep.irt.nc, cls: 'g-nc' },
      { key: 'hc', label: 'HC 白灯', data: rep.irt.hc, cls: 'g-hc' },
      { key: 'exhc', label: 'EXHC 黄灯', data: rep.irt.exhc, cls: 'g-ex' },
    ];

    root.innerHTML = `
      <!-- 1. Slim Utility Toolbar -->
      <div class="card csv-toolbar">
        <div class="csv-toolbar-meta">
          <span class="csv-file-name truncate" title="${esc(rep.filename)}">${esc(rep.filename)}</span>
          <span class="csv-meta-sep">·</span>
          <span class="mono"${rep.unmatchedChartCount ? ` title="其中 ${rep.matchedChartCount} 谱已关联 Textage 谱面参与物理分析，${rep.unmatchedChartCount} 谱 Textage 暂未收录但已保留在成绩表与清灯/评价统计中"` : ''}><b>${rep.matchedSongs}</b>/${rep.totalCsvSongs} 曲 · <b>${rep.playedCount}</b> 谱 · ${esc(rep.latestPlayDate)}</span>
        </div>
        <div class="csv-toolbar-actions">
          ${isSp ? `
            <div class="seg-group sp-side-group" role="group" aria-label="SP 1P/2P 侧位切换">
              <button type="button" class="seg-btn csv-sp-side-btn ${state.spSide === '1p' ? 'active' : ''}" data-sp-side="1p">1P</button>
              <button type="button" class="seg-btn csv-sp-side-btn ${state.spSide === '2p' ? 'active' : ''}" data-sp-side="2p">2P</button>
            </div>
            <label class="csv-style-select-wrap" title="选择你的常用 SP 手法，用于定制变招通关建议">
              <span>手法</span>
              <select id="csv-sp-style-select" class="select-input">${styleOptionsHtml}</select>
            </label>
          ` : ''}
          <div class="seg-group">
            <button type="button" class="seg-btn csv-mode-btn ${isSp ? 'active' : ''}" data-cmode="sp">SP</button>
            <button type="button" class="seg-btn csv-mode-btn ${!isSp ? 'active' : ''}" data-cmode="dp">DP</button>
          </div>
          <button type="button" id="btn-csv-reimport" class="btn btn-sm">换 CSV</button>
          <button type="button" id="btn-csv-clear" class="btn btn-sm btn-ghost-danger">清除</button>
        </div>
      </div>

      <!-- 2. Focused Executive Hero (1 Focal Anchor + Quiet Right Snapshot) -->
      <div class="card csv-hero">
        <div class="csv-hero-main">
          <div class="csv-hero-eyebrow">${modeUpper} ${evalGaugeCn} 有效能力前沿 · 主攻 ${focusRangeStr}</div>
          <div class="csv-hero-headline">
            <span class="csv-hero-cp mono">${primaryIrt?.theta !== null && primaryIrt?.theta !== undefined ? `CP ${primaryIrt.theta.toFixed(1)}` : '样本不足'}</span>
            ${primaryIrt?.eq ? `<span class="csv-hero-rank">${esc(primaryIrt.eq.label)}</span>` : ''}
          </div>
          <div class="csv-hero-summary">
            ${rep.summaryLines.slice(0, 2).map((l) => `<p>${esc(l)}</p>`).join('')}
          </div>
          <div class="csv-gauge-strip">
            ${gaugeCells.map((g) => `
              <div class="csv-gauge-cell ${g.key === evalGauge ? 'is-primary' : ''}">
                <div class="csv-gauge-lbl ${g.cls}">${g.label}</div>
                <div class="csv-gauge-val mono">${g.data?.theta !== null && g.data?.theta !== undefined ? g.data.theta.toFixed(1) : '—'}</div>
                <div class="csv-gauge-sub mono">${g.data?.eq ? esc(g.data.eq.label.replace(/ \(.*\)/, '')) : '样本不足'}${g.data?.maxPos ? ` · 最高 ${g.data.maxPos}` : ''}</div>
              </div>
            `).join('')}
          </div>
          ${slipNoticeHtml}
        </div>

        <div class="csv-hero-side">
          <div class="csv-snap-grid">
            <div class="csv-snap-cell">
              <div class="csv-mini-lbl">主攻均分</div>
              <div class="csv-snap-val mono">${rep.avgExPct !== null ? `${rep.avgExPct.toFixed(1)}%` : '—'}</div>
              <div class="csv-mini-sub mono">${scoreSubTxt}</div>
            </div>
            <div class="csv-snap-cell">
              <div class="csv-mini-lbl">核心擅长</div>
              <div class="csv-snap-val" style="color:var(--pos);">${rep.topStrengths.length ? esc(rep.topStrengths.slice(0, 2).map((a) => a.short).join(' · ')) : '均衡'}</div>
              <div class="csv-mini-sub">${rep.topStrengths[0] ? `+${rep.topStrengths[0].strengthIndex} 相对残差` : '无明显偏科'}</div>
            </div>
            <div class="csv-snap-cell">
              <div class="csv-mini-lbl">首要补强</div>
              <div class="csv-snap-val" style="color:var(--neg);">${rep.topWeaknesses.length ? esc(rep.topWeaknesses.slice(0, 2).map((a) => a.short).join(' · ')) : '无明显短板'}</div>
              <div class="csv-mini-sub">${rep.topWeaknesses[0] ? `${rep.topWeaknesses[0].strengthIndex} 优先突破` : '沿地力主线推进'}</div>
            </div>
            <div class="csv-snap-cell">
              <div class="csv-mini-lbl">${isSp ? '主力手法' : '模式'}</div>
              <div class="csv-snap-val">${isSp ? esc(styleObj.short) : 'DP 双盘'}</div>
              <div class="csv-mini-sub">
                ${isSp ? `<button type="button" class="link-btn csv-jump-grip">查看切手势建议 →</button>` : '标准 AC 合法选项'}
              </div>
            </div>
          </div>

          <div class="csv-hero-lamps">
            <div class="csv-hero-lamps-head">
              <span>主攻区 ${evalGaugeShort} 进度</span>
              <button type="button" class="link-btn csv-jump-lamps">全等级分布 →</button>
            </div>
            <div class="csv-hero-lamp-rows">${heroLampRowsHtml}</div>
          </div>

          <button type="button" id="btn-jump-explorer" class="btn btn-primary csv-hero-cta">去 ${modeUpper} 难度表查看全曲清灯叠加 →</button>
        </div>
      </div>

      <!-- 3. Calm 6-Tab Section Navigation -->
      <div class="csv-nav-tabs" role="tablist">
        <button type="button" role="tab" class="csv-nav-tab ${activeSec === 'overview' ? 'active' : ''}" data-csec="overview"><span class="lbl-full">能力画像</span><span class="lbl-short">能力画像</span></button>
        <button type="button" role="tab" class="csv-nav-tab ${activeSec === 'songs' ? 'active' : ''}" data-csec="songs"><span class="lbl-full">成绩明细表 (${rep.playedCount})</span><span class="lbl-short">成绩表</span></button>
        <button type="button" role="tab" class="csv-nav-tab ${activeSec === 'history' ? 'active' : ''}" data-csec="history"><span class="lbl-full">历史对比 (${modeSnaps.length})</span><span class="lbl-short">历史${modeSnaps.length ? ` (${modeSnaps.length})` : ''}</span></button>
        <button type="button" role="tab" class="csv-nav-tab ${activeSec === 'grip' ? 'active' : ''}" data-csec="grip"><span class="lbl-full">${isSp ? `手法与选项建议${rep.gripCoach?.candidates?.length ? ` (${rep.gripCoach.candidates.length})` : ''}` : '选项减负说明'}</span><span class="lbl-short">${isSp ? '手法建议' : '选项说明'}</span></button>
        <button type="button" role="tab" class="csv-nav-tab ${activeSec === 'coach' ? 'active' : ''}" data-csec="coach"><span class="lbl-full">推灯练歌计划</span><span class="lbl-short">练歌计划</span></button>
        <button type="button" role="tab" class="csv-nav-tab ${activeSec === 'lamps' ? 'active' : ''}" data-csec="lamps"><span class="lbl-full">清灯分布 (${activeLvs.length}级)</span><span class="lbl-short">清灯分布</span></button>
      </div>

      <!-- 4. Focused Active Section Content -->
      <div class="csv-sec-body">
        ${sectionBodyHtml}
      </div>
    `;

    // Bind CSV workspace controls
    document.getElementById('btn-csv-reimport')?.addEventListener('click', () => {
      document.getElementById('global-csv-file').click();
    });
    document.getElementById('btn-csv-clear')?.addEventListener('click', () => {
      state.csvRawText = null;
      state.csvFilename = null;
      state.csvParsed = null;
      state.csvReport = null;
      state.csvActiveSnapshotId = null;
      state.csvError = null;
      try { localStorage.removeItem(CSV_STORAGE_KEY); } catch (_) {}
      renderAll();
    });
    document.getElementById('btn-jump-explorer')?.addEventListener('click', () => {
      state.tab = rep.mode;
      state.lastExplorerMode = rep.mode;
      state.tag = state.tagByMode[rep.mode] || 'ALL';
      if (state.levelsSourceByMode[rep.mode] === 'default') {
        setModeLevels(rep.mode, getCsvFocusLevels(rep), 'csv');
      } else {
        state.levels = new Set(state.levelsByMode[rep.mode]);
      }
      state.tiers.clear();
      resetCpRange();
      state.selectedId = null;
      state.tablePage = 1;
      history.replaceState(null, '', '#' + state.tab);
      renderAll();
    });
    document.getElementById('csv-sp-style-select')?.addEventListener('change', (e) => {
      setSpStyle(e.target.value);
    });
    root.querySelectorAll('.grip-style-btn').forEach((btn) => {
      btn.addEventListener('click', () => setSpStyle(btn.dataset.spStyle));
    });
    root.querySelectorAll('.csv-nav-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.csvSectionTab = btn.dataset.csec;
        renderCsvWorkspace();
      });
    });
    root.querySelector('.csv-jump-grip')?.addEventListener('click', () => {
      state.csvSectionTab = 'grip';
      renderCsvWorkspace();
    });
    root.querySelector('.csv-jump-lamps')?.addEventListener('click', () => {
      state.csvSectionTab = 'lamps';
      renderCsvWorkspace();
    });
    root.querySelectorAll('.csv-sp-side-btn').forEach((btn) => {
      btn.addEventListener('click', () => setSpSide(btn.dataset.spSide));
    });
    root.querySelectorAll('.csv-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextMode = btn.dataset.cmode;
        if (nextMode !== state.csvMode) {
          state.csvMode = nextMode;
          state.csvTargetGaugeManual = false;
          state.csvTargetLevel = 0;
          recomputeCsvReport();
          if (state.csvReport && state.levelsSourceByMode[state.csvMode] !== 'user') {
            setModeLevels(state.csvMode, getCsvFocusLevels(state.csvReport), 'csv');
          }
          try {
            localStorage.setItem(CSV_STORAGE_KEY, JSON.stringify({
              text: state.csvRawText, filename: state.csvFilename, mode: state.csvMode,
            }));
          } catch (_) {}
          renderAll();
        }
      });
    });

    const jumpToLv = (lv) => {
      hideLampTooltip();
      state.tab = rep.mode;
      state.lastExplorerMode = rep.mode;
      state.tag = state.tagByMode[rep.mode] || 'ALL';
      setModeLevels(rep.mode, [lv], 'user');
      state.tiers.clear();
      resetCpRange();
      state.selectedId = null;
      state.tablePage = 1;
      history.replaceState(null, '', '#' + state.tab);
      renderAll();
    };
    root.querySelectorAll('.jump-lv-btn').forEach((btn) => {
      btn.addEventListener('click', () => jumpToLv(Number(btn.dataset.jumpLv)));
    });

    const lvSummaryMap = new Map(activeLvs.map((l) => [l.lv, l]));
    let activeTouchLv = null;
    const showBarTooltip = (track, e, isTouchTap) => {
      const lv = Number(track.dataset.lv);
      const l = lvSummaryMap.get(lv);
      if (!l) return;
      const seg = e.target && e.target.closest ? e.target.closest('.lamp-bar-seg') : null;
      const activeKey = seg ? seg.dataset.lamp : null;
      const tip = getLampTooltipEl();
      const rowsHtml = LAMP_LEGEND_ITEMS
        .filter((item) => l.counts[item.countKey] > 0)
        .map((item) => {
          const cnt = l.counts[item.countKey];
          const pct = ((cnt / l.played) * 100).toFixed(1);
          return `
            <div class="lamp-tooltip-row ${activeKey === item.key ? 'is-active' : ''}">
              <span class="lamp-tooltip-left">
                <span class="lamp-dot lamp-static lamp-${item.key}"></span>
                <span>${item.label}</span>
              </span>
              <span class="mono"><b>${cnt} 首</b> <span style="color:var(--muted);">(${pct}%)</span></span>
            </div>
          `;
        })
        .join('');
      const touchHint = isTouchTap
        ? `<div style="margin-top:6px;padding-top:5px;border-top:1px solid var(--border);font-size:10.5px;color:var(--muted);">点击左侧 ★${l.lv} 按钮可跳转难度表</div>`
        : '';
      tip.innerHTML = `
        <div class="lamp-tooltip-head">
          <span>★${l.lv} 清灯曲数</span>
          <span class="mono" style="font-weight:600;color:var(--muted);font-size:11px;">已玩 ${l.played} 首</span>
        </div>
        ${rowsHtml}
        ${touchHint}
      `;
      tip.classList.remove('hidden');
      const rect = track.getBoundingClientRect();
      const tipRect = tip.getBoundingClientRect();
      const anchorX = Number.isFinite(e.clientX) && e.clientX > 0 ? e.clientX : (rect.left + rect.width / 2);
      const left = Math.max(10, Math.min(window.innerWidth - tipRect.width - 10, anchorX - tipRect.width / 2));
      let top = rect.top - tipRect.height - 10;
      if (top < 8) top = rect.bottom + 10;
      tip.style.left = `${Math.round(left)}px`;
      tip.style.top = `${Math.round(top)}px`;
    };
    root.querySelectorAll('.lamp-bar-track').forEach((track) => {
      track.addEventListener('mouseenter', (e) => {
        if (fineHoverMQ.matches) showBarTooltip(track, e, false);
      });
      track.addEventListener('mousemove', (e) => {
        if (fineHoverMQ.matches) showBarTooltip(track, e, false);
      });
      track.addEventListener('mouseleave', () => {
        if (fineHoverMQ.matches) hideLampTooltip();
      });
      track.addEventListener('click', (e) => {
        const lv = Number(track.dataset.lv);
        if (fineHoverMQ.matches) {
          jumpToLv(lv);
          return;
        }
        e.stopPropagation();
        if (activeTouchLv === lv && lampTooltipEl && !lampTooltipEl.classList.contains('hidden')) {
          activeTouchLv = null;
          hideLampTooltip();
        } else {
          activeTouchLv = lv;
          showBarTooltip(track, e, true);
        }
      });
    });

    document.getElementById('csv-target-gauge')?.addEventListener('change', (e) => {
      state.csvTargetGauge = e.target.value;
      state.csvTargetGaugeManual = true;
      recomputeCsvReport();
      renderCsvWorkspace();
    });
    document.getElementById('csv-target-lv')?.addEventListener('change', (e) => {
      state.csvTargetLevel = Number(e.target.value);
      recomputeCsvReport();
      renderCsvWorkspace();
    });
    root.querySelectorAll('.coach-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.csvCoachTab = btn.dataset.ctab;
        renderCsvWorkspace();
      });
    });
    root.querySelectorAll('.modal-chart-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (e.target.closest('.rec-play-link')) return;
        openChartModal(rep.mode, btn.dataset.cid);
      });
      if (btn.tagName !== 'BUTTON') {
        btn.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            if (e.target.closest('.rec-play-link')) return;
            e.preventDefault();
            openChartModal(rep.mode, btn.dataset.cid);
          }
        });
      }
    });
    if (activeSec === 'songs') {
      const refreshTable = () => {
        state.csvTablePage = 1;
        renderCsvSongsTableBody(rep);
        persistUiPrefs();
      };
      document.getElementById('btn-csv-tbl-mobile-filters')?.addEventListener('click', () => {
        state.csvTableMobileFiltersOpen = !state.csvTableMobileFiltersOpen;
        renderCsvSongsTableBody(rep);
      });
      document.getElementById('csv-tbl-ex-min')?.addEventListener('input', (e) => { state.csvTableExMin = e.target.value; refreshTable(); });
      document.getElementById('csv-tbl-ex-max')?.addEventListener('input', (e) => { state.csvTableExMax = e.target.value; refreshTable(); });
      document.getElementById('csv-tbl-bp-min')?.addEventListener('input', (e) => { state.csvTableBpMin = e.target.value; refreshTable(); });
      document.getElementById('csv-tbl-bp-max')?.addEventListener('input', (e) => { state.csvTableBpMax = e.target.value; refreshTable(); });
      document.getElementById('csv-tbl-search')?.addEventListener('input', (e) => { state.csvTableSearch = e.target.value; refreshTable(); });
      document.getElementById('csv-tbl-sort-col')?.addEventListener('change', (e) => {
        const k = e.target.value;
        state.csvTableSortCol = k;
        state.csvTableSortDir = (k === 'bp' || k === 'title') ? 1 : -1;
        refreshTable();
      });
      document.getElementById('csv-tbl-sort-dir')?.addEventListener('click', () => {
        state.csvTableSortDir *= -1;
        refreshTable();
      });
      document.getElementById('btn-csv-tbl-reset')?.addEventListener('click', () => {
        state.csvTableLevels.clear();
        state.csvTableDiffs = new Set(DIFF_LET);
        state.csvTableLamps.clear();
        state.csvTableDjs.clear();
        state.csvTableExMin = '';
        state.csvTableExMax = '';
        state.csvTableBpMin = '';
        state.csvTableBpMax = '';
        state.csvTableSearch = '';
        state.csvTablePage = 1;
        const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        setVal('csv-tbl-ex-min', '');
        setVal('csv-tbl-ex-max', '');
        setVal('csv-tbl-bp-min', '');
        setVal('csv-tbl-bp-max', '');
        setVal('csv-tbl-search', '');
        renderCsvSongsTableBody(rep);
        persistUiPrefs();
      });
      renderCsvSongsTableBody(rep);
    }
    if (activeSec === 'history') {
      document.getElementById('btn-hist-batch-csv')?.addEventListener('click', () => {
        document.getElementById('csv-hist-multi-input')?.click();
      });
      document.getElementById('csv-hist-multi-input')?.addEventListener('change', (e) => {
        if (e.target.files?.length) batchImportCsvFiles(e.target.files);
        e.target.value = '';
      });
      document.getElementById('btn-hist-export-json')?.addEventListener('click', exportLocalSnapshotsJson);
      document.getElementById('btn-hist-import-json')?.addEventListener('click', () => {
        document.getElementById('csv-hist-json-input')?.click();
      });
      document.getElementById('csv-hist-json-input')?.addEventListener('change', (e) => {
        const f = e.target.files?.[0];
        if (f) f.text().then(importLocalSnapshotsJson);
        e.target.value = '';
      });
      root.querySelectorAll('.hist-act-load').forEach((btn) => {
        btn.addEventListener('click', () => {
          const snap = state.csvSnapshots.find((s) => s.id === btn.dataset.snapId);
          if (snap) loadSnapshotIntoWorkspace(snap);
        });
      });
      root.querySelectorAll('.hist-act-del').forEach((btn) => {
        btn.addEventListener('click', () => {
          deleteLocalSnapshot(btn.dataset.snapId);
        });
      });
      root.querySelectorAll('.hist-act-label').forEach((btn) => {
        btn.addEventListener('click', () => {
          const wrap = root.querySelector(`[data-edit-wrap="${CSS.escape(btn.dataset.snapId)}"]`);
          if (!wrap) return;
          wrap.classList.toggle('hidden');
          const inp = wrap.querySelector('.hist-lbl-input');
          if (!wrap.classList.contains('hidden') && inp) {
            inp.focus();
            inp.select();
          }
        });
      });
      root.querySelectorAll('.hist-lbl-save').forEach((btn) => {
        btn.addEventListener('click', () => {
          const wrap = btn.closest('.hist-snap-edit');
          const inp = wrap?.querySelector('.hist-lbl-input');
          updateLocalSnapshotLabel(btn.dataset.snapId, inp ? inp.value : '');
        });
      });
      root.querySelectorAll('.hist-lbl-cancel').forEach((btn) => {
        btn.addEventListener('click', () => {
          btn.closest('.hist-snap-edit')?.classList.add('hidden');
        });
      });
      root.querySelectorAll('.hist-lbl-input').forEach((inp) => {
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const btn = inp.closest('.hist-snap-edit')?.querySelector('.hist-lbl-save');
            if (btn) btn.click();
          } else if (e.key === 'Escape') {
            inp.closest('.hist-snap-edit')?.classList.add('hidden');
          }
        });
      });

      document.getElementById('csv-hist-base-sel')?.addEventListener('change', (e) => {
        state.csvHistBaseId = e.target.value;
        if (state.csvHistBaseId === state.csvHistTargetId) {
          const other = modeSnaps.find((s) => s.id !== state.csvHistBaseId);
          if (other) state.csvHistTargetId = other.id;
        }
        state.csvHistPage = 1;
        renderCsvWorkspace();
      });
      document.getElementById('csv-hist-target-sel')?.addEventListener('change', (e) => {
        state.csvHistTargetId = e.target.value;
        if (state.csvHistTargetId === state.csvHistBaseId) {
          const other = modeSnaps.find((s) => s.id !== state.csvHistTargetId);
          if (other) state.csvHistBaseId = other.id;
        }
        state.csvHistPage = 1;
        renderCsvWorkspace();
      });
      document.getElementById('btn-hist-pair-recent')?.addEventListener('click', () => {
        if (modeSnaps.length >= 2) {
          state.csvHistBaseId = modeSnaps[modeSnaps.length - 2].id;
          state.csvHistTargetId = modeSnaps[modeSnaps.length - 1].id;
          state.csvHistPage = 1;
          renderCsvWorkspace();
        }
      });
      document.getElementById('btn-hist-pair-span')?.addEventListener('click', () => {
        if (modeSnaps.length >= 2) {
          state.csvHistBaseId = modeSnaps[0].id;
          state.csvHistTargetId = modeSnaps[modeSnaps.length - 1].id;
          state.csvHistPage = 1;
          renderCsvWorkspace();
        }
      });

      if (histDiffObj) {
        document.getElementById('csv-hist-search')?.addEventListener('input', (e) => {
          state.csvHistSearch = e.target.value;
          state.csvHistPage = 1;
          renderCsvHistoryDiffArea(histDiffObj, rep.mode);
        });
        document.getElementById('csv-hist-sort')?.addEventListener('change', (e) => {
          state.csvHistSort = e.target.value;
          state.csvHistPage = 1;
          renderCsvHistoryDiffArea(histDiffObj, rep.mode);
          persistUiPrefs();
        });
        renderCsvHistoryDiffArea(histDiffObj, rep.mode);
      }

      if (modeSnaps.length >= 2) {
        document.getElementById('csv-hist-song-search')?.addEventListener('input', (e) => {
          state.csvHistSongQuery = e.target.value;
          renderCsvSongTimelineArea(modeSnaps, rep.mode);
        });
        renderCsvSongTimelineArea(modeSnaps, rep.mode);
      }
    }

    persistUiPrefs();
  }

  let lampTooltipEl = null;
  function getLampTooltipEl() {
    if (!lampTooltipEl) {
      lampTooltipEl = document.createElement('div');
      lampTooltipEl.id = 'lamp-bar-tooltip';
      lampTooltipEl.className = 'lamp-tooltip hidden';
      document.body.appendChild(lampTooltipEl);
      window.addEventListener('scroll', hideLampTooltip, { passive: true });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.lamp-bar-track')) hideLampTooltip();
      });
    }
    return lampTooltipEl;
  }
  function hideLampTooltip() {
    if (lampTooltipEl) lampTooltipEl.classList.add('hidden');
  }

  function syncThemeColorMeta() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    meta.setAttribute('content', document.documentElement.classList.contains('light') ? '#f4f7fb' : '#0b1018');
  }

  function syncMobileFab() {
    const fab = document.getElementById('mobile-fab');
    const searchBtn = document.getElementById('btn-fab-search');
    if (!fab) return;
    const show = mobileSmallMQ.matches && window.scrollY > 320 && !isModalOpen();
    fab.classList.toggle('hidden', !show);
    if (searchBtn) searchBtn.classList.toggle('hidden', state.tab === 'csv');
  }

  function renderAll() {
    if (!P) return;
    hideLampTooltip();
    syncNavChrome();
    if (state.tab === 'csv') {
      renderCsvWorkspace();
      syncMobileFab();
      persistUiPrefs();
      return;
    }

    syncExplorerChrome();
    renderLevelAndDiffBars();
    renderVersionFilter();
    renderGaugeBar();
    const preTierList = getPreTierFiltered();
    renderTierFilter(preTierList);
    const preCpList = applyTierFilter(preTierList);
    syncCpRangeBar(preCpList);
    const list = applyCpRangeFilter(preCpList);
    renderKpis(list);

    if (!state.selectedId || !list.some((x) => x.id === state.selectedId)) {
      const gKey = 's_' + state.gauge;
      const top = [...list].sort((a, b) => b[gKey] - a[gKey])[0];
      state.selectedId = top ? top.id : null;
    }

    renderMainView(list);
    renderInspector();
    syncMobileFab();
    persistUiPrefs();
  }

  function bindGlobalEvents() {
    // Theme persistence & mobile status bar theme-color sync
    try {
      if (localStorage.getItem(THEME_STORAGE_KEY) === 'light') {
        document.documentElement.classList.add('light');
      }
    } catch (_) {}
    syncThemeColorMeta();

    document.getElementById('btn-theme').addEventListener('click', () => {
      const isLight = document.documentElement.classList.toggle('light');
      syncThemeColorMeta();
      try { localStorage.setItem(THEME_STORAGE_KEY, isLight ? 'light' : 'dark'); } catch (_) {}
    });

    // Mode Tabs & Hash Navigation
    const switchTopTab = (next, updateHash) => {
      if (next !== 'sp' && next !== 'dp' && next !== 'csv') return;
      const prev = state.tab;
      state.tab = next;
      state.selectedId = null;
      if ((next === 'sp' || next === 'dp') && prev !== next) {
        const switchedExplorerMode = state.lastExplorerMode !== next;
        state.lastExplorerMode = next;
        state.levels = new Set(state.levelsByMode[next]);
        state.tag = state.tagByMode[next] || 'ALL';
        if (switchedExplorerMode) {
          state.tiers.clear();
          resetCpRange();
        }
        state.tablePage = 1;
      }
      if (updateHash) history.replaceState(null, '', '#' + next);
      renderAll();
    };
    document.querySelectorAll('.mode-tab').forEach((btn) => {
      btn.addEventListener('click', () => switchTopTab(btn.dataset.mode, true));
    });
    window.addEventListener('hashchange', () => {
      const h = location.hash.replace(/^#/, '');
      if ((h === 'sp' || h === 'dp' || h === 'csv') && h !== state.tab) {
        switchTopTab(h, false);
      }
    });

    // Quick Import button & file input
    const fileInput = document.getElementById('global-csv-file');
    document.getElementById('btn-quick-import').addEventListener('click', () => {
      fileInput.value = '';
      fileInput.click();
    });
    fileInput.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (f) loadFileObject(f);
    });

    // SP 1P / 2P side buttons
    document.getElementById('btn-sp-1p').addEventListener('click', () => setSpSide('1p'));
    document.getElementById('btn-sp-2p').addEventListener('click', () => setSpSide('2p'));

    // Scope buttons
    document.getElementById('btn-scope-ac').addEventListener('click', () => {
      state.scope = 'ac';
      state.tablePage = 1;
      renderAll();
    });
    document.getElementById('btn-scope-all').addEventListener('click', () => {
      state.scope = 'all';
      state.tablePage = 1;
      renderAll();
    });

    // Mobile collapsible secondary filters toggle
    const mobileFilterBtn = document.getElementById('btn-mobile-filters');
    if (mobileFilterBtn) {
      mobileFilterBtn.addEventListener('click', () => {
        state.mobileFiltersOpen = !state.mobileFiltersOpen;
        syncMobileFilterButton();
      });
    }

    // Version drawer toggle
    document.getElementById('btn-ver-toggle').addEventListener('click', () => {
      state.verPanelOpen = !state.verPanelOpen;
      renderVersionFilter();
    });

    // Gauge & View buttons
    document.querySelectorAll('.g-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.gauge !== btn.dataset.g) {
          state.gauge = btn.dataset.g;
          state.sortCol = 's_' + state.gauge;
          resetCpRange();
        }
        renderAll();
      });
    });
    document.querySelectorAll('.v-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.view = btn.dataset.v;
        state.tablePage = 1;
        renderAll();
      });
    });

    // Dropdowns & Search
    document.getElementById('tag-filter').addEventListener('change', (e) => {
      state.tag = e.target.value;
      state.tagByMode[activeExplorerMode()] = state.tag;
      state.tablePage = 1;
      renderAll();
    });
    document.getElementById('sp-opt-filter').addEventListener('change', (e) => { state.spOpt = e.target.value; state.tablePage = 1; renderAll(); });
    document.getElementById('dp-opt-filter').addEventListener('change', (e) => { state.dpOpt = e.target.value; state.tablePage = 1; renderAll(); });
    document.getElementById('lamp-filter').addEventListener('change', (e) => { state.lampFilter = e.target.value; state.tablePage = 1; renderAll(); });
    document.getElementById('search-input').addEventListener('input', (e) => { state.search = e.target.value; state.tablePage = 1; renderAll(); });

    // Mobile FAB quick search & scroll-to-top
    const fabSearch = document.getElementById('btn-fab-search');
    const fabTop = document.getElementById('btn-fab-top');
    if (fabSearch) {
      fabSearch.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const inp = document.getElementById('search-input');
        if (inp) setTimeout(() => inp.focus({ preventScroll: true }), 260);
      });
    }
    if (fabTop) {
      fabTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    window.addEventListener('scroll', syncMobileFab, { passive: true });
    window.addEventListener('resize', syncMobileFab, { passive: true });

    // Modal closing + mobile bottom-sheet swipe-down-to-dismiss
    document.getElementById('btn-close-modal').addEventListener('click', closeChartModal);
    document.getElementById('chart-modal').addEventListener('click', (e) => {
      if (e.target.id === 'chart-modal') closeChartModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeChartModal();
    });

    const sheetHead = document.getElementById('modal-sheet-head');
    const sheetCard = document.getElementById('chart-modal-card');
    if (sheetHead && sheetCard) {
      let dragStartY = 0;
      let dragDy = 0;
      let dragging = false;
      sheetHead.addEventListener('touchstart', (e) => {
        if (!mobileSmallMQ.matches || !e.touches || e.touches.length !== 1) return;
        dragStartY = e.touches[0].clientY;
        dragDy = 0;
        dragging = true;
        sheetCard.style.transition = 'none';
      }, { passive: true });
      sheetHead.addEventListener('touchmove', (e) => {
        if (!dragging || !e.touches || e.touches.length !== 1) return;
        dragDy = Math.max(0, e.touches[0].clientY - dragStartY);
        sheetCard.style.transform = `translateY(${dragDy}px)`;
      }, { passive: true });
      const endDrag = () => {
        if (!dragging) return;
        dragging = false;
        sheetCard.style.transition = '';
        if (dragDy > 72) {
          closeChartModal();
        } else {
          sheetCard.style.transform = '';
        }
      };
      sheetHead.addEventListener('touchend', endDrag, { passive: true });
      sheetHead.addEventListener('touchcancel', endDrag, { passive: true });
    }
  }

  function initWithPayload(payload) {
    P = payload;
    try {
      if (localStorage.getItem(SP_SIDE_STORAGE_KEY) === '2p') {
        state.spSide = '2p';
      }
      const savedStyle = localStorage.getItem(SP_STYLE_STORAGE_KEY);
      if (savedStyle && window.IIDXCsvAnalyzer?.SP_GRIP_STYLES?.[savedStyle]) {
        state.spStyle = savedStyle;
      }
    } catch (_) {}

    VER_INFO = P.vers.map((name, idx) => ({
      idx,
      code: (P.verCodes && P.verCodes[idx]) || String(idx + 1).padStart(2, '0'),
      name,
    }));
    DATASETS.sp = unpackCharts(P.sp, 'sp');
    DATASETS.dp = unpackCharts(P.dp, 'dp');
    CHART_BY_ID.sp = new Map(DATASETS.sp.map((c) => [c.id, c]));
    CHART_BY_ID.dp = new Map(DATASETS.dp.map((c) => [c.id, c]));

    loadUiPrefs();

    document.getElementById('nav-sp-cnt').textContent = P.meta.spTotal.toLocaleString() + ' 谱';
    document.getElementById('nav-dp-cnt').textContent = P.meta.dpTotal.toLocaleString() + ' 谱';

    // Restore cached CSV from localStorage if present
    try {
      const saved = localStorage.getItem(CSV_STORAGE_KEY);
      if (saved) {
        const obj = JSON.parse(saved);
        if (obj && obj.text) {
          const A = window.IIDXCsvAnalyzer;
          state.csvRawText = obj.text;
          state.csvFilename = obj.filename || 'score.csv';
          state.csvMode = obj.mode === 'dp' ? 'dp' : 'sp';
          state.csvParsed = A.parseKonamiCsv(obj.text, state.csvFilename);
          recomputeCsvReport();
          if (state.csvReport && state.levelsSourceByMode[state.csvMode] === 'default') {
            setModeLevels(state.csvMode, getCsvFocusLevels(state.csvReport), 'csv', false);
          }
        }
      }
    } catch (_) {}

    const activeMode = activeExplorerMode();
    if (state.tab === 'sp' || state.tab === 'dp') {
      state.lastExplorerMode = state.tab;
    }
    state.levels = new Set(state.levelsByMode[activeMode]);
    state.tag = state.tagByMode[activeMode] || 'ALL';

    document.getElementById('boot-loader').classList.add('hidden');
    bindGlobalEvents();
    prefsRestored = true;
    renderAll();
    loadSnapshotsOnBoot();
  }

  async function boot() {
    if (window.__IIDX_PAYLOAD__) {
      initWithPayload(window.__IIDX_PAYLOAD__);
      return;
    }
    try {
      const res = await fetch('./data.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      initWithPayload(payload);
    } catch (err) {
      document.getElementById('boot-loader').innerHTML = `<span style="color:var(--neg);">数据加载失败：${esc(err.message || err)}。请确认通过 HTTP 服务器或 GitHub Pages 访问，或直接打开单文件版 HTML。</span>`;
    }
  }

  boot();
})();
