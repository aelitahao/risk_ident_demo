const app = document.getElementById('app');

const RISK_LEVEL_LABEL = { low: '低风险', medium: '中风险', high: '高风险' };
const PRIORITY_LABEL = { monitor: '持续关注', routine: '常规筛查', priority: '优先筛查' };
const DATA_STATUS_LABEL = { complete: '基本完整', partial: '部分缺失', sparse: '数据稀疏' };
const GENDER_LABEL = { male: '男性', female: '女性', other: '其他' };
const SMOKING_LABEL = { never: '从未吸烟', former: '既往吸烟', current: '当前吸烟' };
const DISEASE_LABEL = { diabetes: '糖尿病', hypertension: '高血压' };

const EVIDENCE_FIELD_LABEL = {
  'basicInfo.bmi': 'BMI',
  'basicInfo.waistCm': '腰围',
  'lifestyle.smokingStatus': '吸烟状态',
  'lifestyle.sedentaryMinutesPerDay': '久坐时长',
  'lifestyle.weekdaySleepHours': '工作日睡眠',
};

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) el.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON_PATHS = {
  'table-cells': 'M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0 1 18 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5',
  'pencil-square': 'm16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10',
  'arrow-right': 'M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3',
  'arrow-left': 'M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18',
  'magnifying-glass': 'm21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z',
  'check': 'm4.5 12.75 6 6 9-13.5',
};

function icon(name, attrs = {}) {
  const el = document.createElementNS(SVG_NS, 'svg');
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('fill', 'none');
  el.setAttribute('stroke', 'currentColor');
  el.setAttribute('stroke-width', '1.5');
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  el.setAttribute('aria-hidden', 'true');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k === 'class' ? 'class' : k, v);
  }
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', ICON_PATHS[name]);
  el.append(path);
  return el;
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: opts.body ? { 'content-type': 'application/json' } : undefined,
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error?.message ?? `HTTP ${res.status}`;
    const err = new Error(msg);
    err.payload = data;
    throw err;
  }
  return data;
}

function render(view) {
  app.replaceChildren(view);
  app.removeAttribute('aria-busy');
}

function skeletonLines(count, widths = []) {
  return Array.from({ length: count }, (_, i) => h('span', {
    class: 'sk-line',
    style: widths[i] ? `width:${widths[i]}` : null,
  }));
}

function profileSkeleton() {
  return Array.from({ length: 3 }, () => h('section', { class: 'section skeleton', 'aria-hidden': 'true' }, [
    h('span', { class: 'sk-line sk-title' }),
    h('div', { class: 'sk-grid' }, skeletonLines(6, ['70%', '55%', '64%', '48%', '72%', '58%'])),
  ]));
}

function resultSkeleton() {
  return h('section', { class: 'section skeleton', role: 'status', 'aria-label': '预测中' }, [
    h('span', { class: 'sk-line sk-title' }),
    h('div', { class: 'sk-cards' }, [0, 1].map(() => h('div', { class: 'sk-card' }, [
      h('span', { class: 'sk-line', style: 'width:38%;height:17px' }),
      h('span', { class: 'sk-line', style: 'width:60%' }),
      ...skeletonLines(3, ['92%', '85%', '70%']),
    ]))),
  ]);
}

function fmt(v, suffix = '') {
  if (v == null || v === '') return '—';
  return suffix ? `${v}${suffix}` : String(v);
}

function fmtProfile(v, suffix = '') {
  if (v == null || v === '') return '未记录';
  return suffix ? `${v}${suffix}` : String(v);
}

function pair(label, value) {
  return [h('dt', {}, label), h('dd', {}, value ?? '未记录')];
}

const ENTRIES = [
  {
    id: 'database',
    href: '#/users',
    icon: 'table-cells',
    eyebrow: '已有档案',
    title: '数据库档案筛查',
    description: '从演示库的匿名用户档案中挑一位，先查看完整健康画像，再生成风险结果。',
    points: ['字段已预填，无需手工录入', '可对照原始画像核查风险因素', '适合演示完整数据链路'],
    cta: '浏览用户档案',
  },
  {
    id: 'questionnaire',
    href: '#/questionnaire',
    icon: 'pencil-square',
    eyebrow: '匿名录入',
    title: '匿名问卷筛查',
    description: '现场填写一份健康问卷，提交后即时返回糖尿病与高血压风险评估，数据不入库。',
    points: ['BMI 由身高体重自动推导', '字段级校验与错误提示', '适合体验真实录入流程'],
    cta: '填写健康问卷',
  },
];

function backLink(href = '#/', text = '返回入口') {
  return h('div', {}, h('a', { class: 'back-link', href }, [icon('arrow-left'), text]));
}

function homeRoute() {
  const cards = ENTRIES.map((item) => h('a', { class: 'entry-card', href: item.href }, [
    h('span', { class: 'entry-icon', 'aria-hidden': 'true' }, icon(item.icon)),
    h('small', { class: 'entry-eyebrow' }, item.eyebrow),
    h('h2', {}, item.title),
    h('p', { class: 'entry-desc' }, item.description),
    h('ul', { class: 'entry-points' }, item.points.map((p) => h('li', {}, p))),
    h('span', { class: 'entry-cta' }, [item.cta, icon('arrow-right')]),
  ]));

  render(h('div', { class: 'home' }, [
    h('div', { class: 'page-heading home-heading' }, [
      h('h1', {}, '慢病风险筛查'),
      h('p', { class: 'subtitle' }, '选择一个入口开始：两种入口共用同一套预测服务，输出结构完全一致，区别只在数据从哪里来。'),
    ]),
    h('div', { class: 'entry-grid' }, cards),
    h('p', { class: 'home-note' }, '两种入口都只使用年龄、体型、生活方式与健康史等非目标字段，不采集血压、HbA1c 或空腹血糖，结果仅供健康管理演示。'),
  ]));
}

function usersRoute() {
  const state = { q: '', total: 0, users: [] };

  const searchInput = h('input', {
    type: 'search',
    placeholder: '按用户 ID 搜索，例：US-01',
    'aria-label': '按用户 ID 搜索',
  });
  const countEl = h('span', { class: 'count' }, '');
  const tbody = h('tbody');

  const table = h('table', { class: 'user-table' }, [
    h('thead', {}, h('tr', {}, [
      h('th', {}, '用户 ID'),
      h('th', {}, '年龄'),
      h('th', {}, '性别'),
      h('th', {}, 'BMI'),
      h('th', {}, '腰围'),
      h('th', {}, '生活方式摘要'),
      h('th', {}, '数据状态'),
    ])),
    tbody,
  ]);

  const toolbar = h('div', { class: 'toolbar' }, [
    h('div', { class: 'search-wrap' }, [icon('magnifying-glass', { class: 'search-icon' }), searchInput]),
    countEl,
  ]);
  const container = h('div', {}, [
    backLink(),
    h('div', { class: 'page-heading' }, [
      h('h1', {}, '数据库档案筛查'),
      h('p', { class: 'subtitle' }, '选择一份已有健康档案，查看画像详情并生成风险结果。'),
    ]),
    toolbar,
    h('div', { class: 'table-shell' }, table),
  ]);

  function renderSkeletonRows() {
    tbody.replaceChildren(...Array.from({ length: 6 }, () => h('tr', { 'aria-hidden': 'true' },
      Array.from({ length: 7 }, () => h('td', {}, h('span', { class: 'sk-line' }))),
    )));
  }

  function renderRows() {
    tbody.replaceChildren();
    if (state.users.length === 0) {
      tbody.append(h('tr', {}, h('td', { colspan: '7' }, h('div', { class: 'empty' }, '未匹配用户'))));
      return;
    }
    for (const u of state.users) {
      const row = h('tr', { onclick: () => (location.hash = `#/users/${u.userId}`) }, [
        h('td', { 'data-label': '用户 ID' }, u.userId),
        h('td', { 'data-label': '年龄' }, fmt(u.ageYears)),
        h('td', { 'data-label': '性别' }, GENDER_LABEL[u.gender] ?? '—'),
        h('td', { 'data-label': 'BMI' }, fmt(u.bmi)),
        h('td', { 'data-label': '腰围' }, fmt(u.waistCm, ' cm')),
        h('td', { 'data-label': '生活方式摘要' }, u.lifestyleSummary ?? '—'),
        h('td', { 'data-label': '数据状态' }, h('span', { class: `status-badge ${u.dataStatus}` }, DATA_STATUS_LABEL[u.dataStatus] ?? u.dataStatus)),
      ]);
      tbody.append(row);
    }
  }

  let pending = 0;
  async function load(q) {
    const my = ++pending;
    const params = q ? `?q=${encodeURIComponent(q)}` : '';
    const data = await api(`/api/v1/users${params}`);
    if (my !== pending) return;
    state.total = data.total;
    state.users = data.users;
    countEl.textContent = `共 ${state.total} 名用户`;
    renderRows();
  }

  searchInput.addEventListener('input', (e) => {
    state.q = e.target.value;
    load(state.q).catch(showError);
  });

  render(container);
  renderSkeletonRows();
  load('').catch(showError);
}

function renderProfileSections(profile, rawProfile) {
  const basic = profile.basicInfo;
  const life = profile.lifestyle;
  const hh = profile.healthHistory;
  const gi = hh.generalIndicators ?? {};

  const basicSection = h('section', { class: 'section' }, [
    h('h2', {}, '基本信息'),
    h('dl', { class: 'kv-grid' }, [
      ...pair('年龄', fmt(basic.ageYears, ' 岁')),
      ...pair('性别', GENDER_LABEL[basic.gender] ?? '—'),
      ...pair('身高', fmt(basic.heightCm, ' cm')),
      ...pair('体重', fmt(basic.weightKg, ' kg')),
      ...pair('BMI', fmt(basic.bmi)),
      ...pair('腰围', fmt(basic.waistCm, ' cm')),
    ]),
  ]);

  const lifestyleSection = h('section', { class: 'section' }, [
    h('h2', {}, '生活方式'),
    h('dl', { class: 'kv-grid' }, [
      ...pair('吸烟状态', SMOKING_LABEL[life.smokingStatus] ?? '—'),
      ...pair('饮酒摘要', life.alcoholSummary ?? '—'),
      ...pair('活动摘要', life.physicalActivitySummary ?? '—'),
      ...pair('久坐（分钟/天）', fmt(life.sedentaryMinutesPerDay)),
      ...pair('工作日睡眠', fmt(life.weekdaySleepHours, ' 小时')),
      ...pair('周末睡眠', fmt(life.weekendSleepHours, ' 小时')),
      ...pair('单日膳食', life.dietaryRecord?.summary ?? '未采集'),
    ]),
  ]);

  const historySection = h('section', { class: 'section' }, [
    h('h2', {}, '健康史'),
    h('dl', { class: 'kv-grid' }, [
      ...pair('已知疾病', hh.knownDiseases.length ? hh.knownDiseases.join('、') : '未报告'),
      ...pair('家族史', Object.entries(hh.familyHistory).map(([k, v]) => `${k}: ${v}`).join('；') || '未采集'),
      ...pair('当前症状', hh.currentSymptoms.length ? hh.currentSymptoms.join('、') : '未报告'),
      ...pair(
        '一般指标',
        Object.entries(gi).map(([k, v]) => `${k}: ${v}`).join('；') || '未采集',
      ),
    ]),
  ]);

  return [basicSection, lifestyleSection, historySection];
}

function explanationLookup(entries) {
  const map = new Map();
  if (!Array.isArray(entries)) return map;
  for (const e of entries) {
    if (e && typeof e.factorId === 'string' && e.explanation) map.set(e.factorId, e.explanation);
  }
  return map;
}

function renderFactorItem(f, explanationText) {
  const parts = [h('div', {}, f.label), h('div', { class: 'evidence' }, f.evidence)];
  if (explanationText) parts.push(h('div', { class: 'factor-explanation' }, explanationText));
  return h('li', {}, parts);
}

function renderDiseaseCard(d) {
  const expl = d.explanation ?? {};
  const mainExpls = explanationLookup(expl.mainFactorExplanations);
  const protectiveExpls = explanationLookup(expl.protectiveFactorExplanations);

  const levelIndex = { low: 0, medium: 1, high: 2 }[d.riskLevel];
  const meter = levelIndex == null ? null : h('div', {
    class: 'risk-meter',
    role: 'img',
    'aria-label': `风险等级：${RISK_LEVEL_LABEL[d.riskLevel]}（三级中的第 ${levelIndex + 1} 级）`,
  }, [0, 1, 2].map((i) => h('span', {
    class: `risk-meter-seg${i <= levelIndex ? ' filled' : ''}`,
    'aria-hidden': 'true',
  })));

  const risk = h('div', { class: 'risk-row' }, [
    h('span', { class: `risk-tag ${d.riskLevel}` }, RISK_LEVEL_LABEL[d.riskLevel] ?? d.riskLevel),
    h('span', { class: 'risk-priority' }, `筛查优先级：${PRIORITY_LABEL[d.screeningPriority] ?? d.screeningPriority}`),
  ]);

  const riskFactors = d.riskFactors.length
    ? h('ul', { class: 'factor-list' }, d.riskFactors.map((f) => renderFactorItem(f, mainExpls.get(f.id))))
    : h('p', { class: 'evidence' }, '未识别显著风险因素。');

  const protective = d.protectiveFactors.length
    ? h('ul', { class: 'factor-list' }, d.protectiveFactors.map((f) => renderFactorItem(f, protectiveExpls.get(f.id))))
    : h('p', { class: 'evidence' }, '未识别显著保护因素。');

  return h('article', { class: `disease-card risk-${d.riskLevel}` }, [
    h('div', { class: 'disease-card-head' }, [
      h('h3', {}, DISEASE_LABEL[d.diseaseId] ?? d.diseaseId),
      meter,
    ]),
    d.evidenceLevel === 'limited'
      ? h('div', { class: 'evidence-warning' }, [
          '证据有限：可用数据较少，结果仅供演示参考。',
          d.missingEvidenceFields?.length
            ? h('div', { class: 'missing-fields' },
                `缺失字段：${d.missingEvidenceFields.map((p) => EVIDENCE_FIELD_LABEL[p] ?? p).join('、')}`,
              )
            : null,
        ])
      : null,
    risk,
    expl.riskConclusion ? h('p', { class: 'risk-conclusion' }, expl.riskConclusion) : null,
    h('h4', {}, '主要风险因素'),
    riskFactors,
    h('h4', {}, '保护因素'),
    protective,
  ]);
}

function renderResult(result) {
  return h('section', { class: 'section' }, [
    h('h2', {}, '风险预测结果'),
    result.overallSummary ? h('p', { class: 'overall-summary' }, result.overallSummary) : null,
    h('div', { class: 'result-grid' }, result.diseases.map(renderDiseaseCard)),
    result.boundaryNote ? h('p', { class: 'boundary-note' }, result.boundaryNote) : null,
  ]);
}

async function userDetailRoute(userId) {
  const container = h('div', {}, [
    h('div', {}, h('a', { class: 'back-link', href: '#/users' }, [icon('arrow-left'), '返回列表'])),
    h('div', { class: 'page-heading' }, [
      h('h1', {}, `用户 ${userId}`),
      h('p', { class: 'subtitle' }, '查看健康画像并选择评估模式生成风险筛查结果。'),
    ]),
    h('div', { id: 'profile-slot' }, profileSkeleton()),
    h('div', { class: 'actions', id: 'action-slot' }),
    h('div', { id: 'result-slot' }),
  ]);
  render(container);

  const profileSlot = container.querySelector('#profile-slot');
  const actionSlot = container.querySelector('#action-slot');
  const resultSlot = container.querySelector('#result-slot');

  let hasResult = false;

  async function runPrediction() {
    resultSlot.replaceChildren(resultSkeleton());
    try {
      const result = await api(`/api/v1/users/${encodeURIComponent(userId)}/prediction`, {
        method: 'POST',
        body: {},
      });
      hasResult = true;
      resultSlot.replaceChildren(renderResult(result));
    } catch (e) {
      resultSlot.replaceChildren(h('div', { class: 'error-box' }, `预测失败：${e.message}`));
    }
  }

  function rebuildActions() {
    const btn = h('button', { class: 'primary' }, hasResult ? '重新预测' : '风险预测');
    btn.addEventListener('click', () => runPrediction());
    actionSlot.replaceChildren(btn);
  }

  try {
    const detail = await api(`/api/v1/users/${encodeURIComponent(userId)}`);
    profileSlot.replaceChildren(...renderProfileSections(detail.profile));
    rebuildActions();
  } catch (e) {
    profileSlot.replaceChildren(h('div', { class: 'error-box' }, `加载失败：${e.message}`));
  }
}

function showError(e) {
  render(h('div', { class: 'error-box' }, `请求出错：${e.message}`));
}

function num(s) {
  if (s == null || s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function int(s) {
  if (s == null || s === '') return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : Number.isFinite(n) ? Math.trunc(n) : null;
}

function nullable(s) {
  if (s == null) return null;
  const t = String(s).trim();
  return t ? t : null;
}

function csvArray(s) {
  if (s == null) return [];
  return String(s)
    .split(/[,，、\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function questionnaireRoute() {
  const fields = new Map();

  function field(path, label, inputAttrs = {}, hint = null) {
    const input = h('input', { name: path, ...inputAttrs });
    fields.set(path, input);
    const err = h('div', { class: 'field-error', 'data-for': path });
    const children = [h('label', {}, label), input];
    if (hint) children.push(h('div', { class: 'field-hint' }, hint));
    children.push(err);
    return h('div', { class: 'form-field' }, children);
  }

  function selectField(path, label, options) {
    const sel = h('select', { name: path });
    sel.append(h('option', { value: '' }, '（未选择）'));
    for (const [v, t] of options) sel.append(h('option', { value: v }, t));
    fields.set(path, sel);
    const err = h('div', { class: 'field-error', 'data-for': path });
    return h('div', { class: 'form-field' }, [h('label', {}, label), sel, err]);
  }

  function textareaField(path, label, hint = null) {
    const ta = h('textarea', { name: path, rows: 2 });
    fields.set(path, ta);
    const err = h('div', { class: 'field-error', 'data-for': path });
    const children = [h('label', {}, label), ta];
    if (hint) children.push(h('div', { class: 'field-hint' }, hint));
    children.push(err);
    return h('div', { class: 'form-field' }, children);
  }

  const basicSection = h('section', { class: 'section form-section' }, [
    h('h2', {}, '基本信息'),
    h('div', { class: 'form-grid' }, [
      field('basicInfo.ageYears', '年龄 *', { type: 'number', min: '18', max: '120', required: true }),
      selectField('basicInfo.gender', '性别 *', [
        ['male', '男性'], ['female', '女性'], ['other', '其他'],
      ]),
      field('basicInfo.heightCm', '身高（cm）', { type: 'number', min: '100', max: '250', step: '0.1' }),
      field('basicInfo.weightKg', '体重（kg）', { type: 'number', min: '25', max: '300', step: '0.1' }),
      field('basicInfo.bmi', 'BMI', { type: 'number', min: '10', max: '80', step: '0.1' }, '可留空由身高体重推导'),
      field('basicInfo.waistCm', '腰围（cm）', { type: 'number', min: '40', max: '200', step: '0.1' }),
    ]),
  ]);

  const lifestyleSection = h('section', { class: 'section form-section' }, [
    h('h2', {}, '生活方式'),
    h('div', { class: 'form-grid' }, [
      selectField('lifestyle.smokingStatus', '吸烟状态', [
        ['never', '从未吸烟'], ['former', '既往吸烟'], ['current', '当前吸烟'],
      ]),
      field('lifestyle.alcoholSummary', '饮酒摘要', { type: 'text', maxlength: '200' }),
      field('lifestyle.physicalActivitySummary', '活动摘要', { type: 'text', maxlength: '200' }),
      field('lifestyle.sedentaryMinutesPerDay', '久坐（分钟/天）', { type: 'number', min: '0', max: '1440' }),
      field('lifestyle.weekdaySleepHours', '工作日睡眠（小时）', { type: 'number', min: '0', max: '24', step: '0.1' }),
      field('lifestyle.weekendSleepHours', '周末睡眠（小时）', { type: 'number', min: '0', max: '24', step: '0.1' }),
    ]),
    textareaField('lifestyle.dietaryRecord', '单日膳食摘要', '24 小时膳食回顾，自由文本'),
  ]);

  const historySection = h('section', { class: 'section form-section' }, [
    h('h2', {}, '健康史'),
    h('p', { class: 'field-hint' }, '本表单不采集血压、HbA1c 或空腹血糖等目标信息，避免评估被污染。'),
    textareaField('healthHistory.knownDiseases', '已知疾病', '英文/中文逗号或换行分隔，例：hyperlipidemia, asthma'),
    textareaField('healthHistory.familyHistory', '家族史', '自由文本描述，例：母亲糖尿病；父亲高血压'),
    textareaField('healthHistory.currentSymptoms', '当前症状', '英文/中文逗号或换行分隔'),
  ]);

  const heightInput = fields.get('basicInfo.heightCm');
  const weightInput = fields.get('basicInfo.weightKg');
  const bmiInput = fields.get('basicInfo.bmi');
  let bmiManuallyEdited = false;

  function updateDerivedBmi() {
    if (bmiManuallyEdited) return;
    const heightCm = num(heightInput.value);
    const weightKg = num(weightInput.value);
    const canDerive = heightCm > 0 && weightKg > 0;
    bmiInput.value = canDerive
      ? (weightKg / ((heightCm / 100) ** 2)).toFixed(1)
      : '';
    bmiInput.classList.toggle('derived-value', canDerive);
  }

  heightInput.addEventListener('input', updateDerivedBmi);
  weightInput.addEventListener('input', updateDerivedBmi);
  bmiInput.addEventListener('input', () => {
    bmiManuallyEdited = bmiInput.value !== '';
    bmiInput.classList.remove('derived-value');
    if (!bmiManuallyEdited) updateDerivedBmi();
  });

  const resultSlot = h('div', { id: 'result-slot' });

  function collectInput() {
    const get = (p) => fields.get(p)?.value ?? '';
    const dietary = nullable(get('lifestyle.dietaryRecord'));
    const family = nullable(get('healthHistory.familyHistory'));
    return {
      basicInfo: {
        ageYears: int(get('basicInfo.ageYears')),
        gender: nullable(get('basicInfo.gender')),
        heightCm: num(get('basicInfo.heightCm')),
        weightKg: num(get('basicInfo.weightKg')),
        bmi: num(get('basicInfo.bmi')),
        waistCm: num(get('basicInfo.waistCm')),
      },
      lifestyle: {
        smokingStatus: nullable(get('lifestyle.smokingStatus')),
        alcoholSummary: nullable(get('lifestyle.alcoholSummary')),
        physicalActivitySummary: nullable(get('lifestyle.physicalActivitySummary')),
        sedentaryMinutesPerDay: int(get('lifestyle.sedentaryMinutesPerDay')),
        weekdaySleepHours: num(get('lifestyle.weekdaySleepHours')),
        weekendSleepHours: num(get('lifestyle.weekendSleepHours')),
        dietaryRecord: dietary ? { summary: dietary } : null,
      },
      healthHistory: {
        knownDiseases: csvArray(get('healthHistory.knownDiseases')),
        familyHistory: family ? { note: family } : {},
        currentSymptoms: csvArray(get('healthHistory.currentSymptoms')),
        generalIndicators: {},
      },
      featureSchemaVersion: '1.0',
    };
  }

  function clearFieldErrors() {
    for (const el of fields.values()) el.classList.remove('input-error');
    for (const box of formEl.querySelectorAll('.field-error')) box.textContent = '';
  }

  function applyFieldErrors(details) {
    clearFieldErrors();
    for (const d of details ?? []) {
      const el = fields.get(d.field);
      const box = formEl.querySelector(`.field-error[data-for="${CSS.escape(d.field)}"]`);
      if (el) el.classList.add('input-error');
      if (box) box.textContent = d.reason ?? '字段无效';
    }
  }

  const submitBtn = h('button', { class: 'primary', type: 'submit' }, '生成风险预测');
  const globalError = h('div', { id: 'form-global-error' });
  const actionsRow = h('div', { class: 'actions' });
  actionsRow.replaceChildren(submitBtn);

  const formEl = h('form', { class: 'questionnaire-form', novalidate: 'novalidate' }, [
    basicSection,
    lifestyleSection,
    historySection,
    globalError,
    actionsRow,
    resultSlot,
  ]);

  formEl.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    globalError.replaceChildren();
    submitBtn.disabled = true;
    const prevText = submitBtn.textContent;
    submitBtn.textContent = '预测中…';
    resultSlot.replaceChildren(resultSkeleton());
    try {
      const input = collectInput();
      const result = await api('/api/v1/predictions', {
        method: 'POST',
        body: { input, source: 'questionnaire' },
      });
      clearFieldErrors();
      resultSlot.replaceChildren(renderResult(result));
    } catch (e) {
      const err = e.payload?.error;
      if (err?.code === 'INVALID_INPUT' && Array.isArray(err.details)) {
        applyFieldErrors(err.details);
        globalError.replaceChildren(h('div', { class: 'error-box' }, '请修正标红字段后重试。'));
      } else if (err?.code === 'TARGET_LEAKAGE') {
        globalError.replaceChildren(h('div', { class: 'error-box' }, `目标信息泄漏：${err.message}`));
      } else {
        globalError.replaceChildren(h('div', { class: 'error-box' }, `预测失败：${e.message}`));
      }
      resultSlot.replaceChildren();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = prevText;
    }
  });

  const container = h('div', {}, [
    backLink(),
    h('div', { class: 'page-heading' }, [
      h('h1', {}, '匿名问卷筛查'),
      h('p', { class: 'subtitle' }, '填写信息以生成糖尿病与高血压风险筛查结果，带 * 项为必填。数据不入库。'),
    ]),
    formEl,
  ]);
  render(container);
}

function route() {
  const hash = location.hash || '#/';
  const m = hash.match(/^#\/users\/(.+)$/);
  if (m) return userDetailRoute(m[1]);
  if (hash === '#/questionnaire') return questionnaireRoute();
  if (hash === '#/users') return usersRoute();
  return homeRoute();
}

window.addEventListener('hashchange', route);
route();
