const app = document.getElementById('app');

const RISK_LEVEL_LABEL = { low: '低风险', medium: '中风险', high: '高风险' };
const PRIORITY_LABEL = { monitor: '持续关注', routine: '常规筛查', priority: '优先筛查' };
const DATA_STATUS_LABEL = { complete: '基本完整', partial: '部分缺失', sparse: '数据稀疏' };
const GENDER_LABEL = { male: '男性', female: '女性', other: '其他' };
const SMOKING_LABEL = { never: '从未吸烟', former: '既往吸烟', current: '当前吸烟' };
const DISEASE_LABEL = { diabetes: '糖尿病', hypertension: '高血压' };
const MODE_LABEL = {
  lifestyle_screening: '生活方式筛查',
  comprehensive_profile: '综合健康画像',
};
const MODE_ORDER = ['lifestyle_screening', 'comprehensive_profile'];

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

function renderSourceSwitcher(current) {
  const items = [
    {
      id: 'database',
      href: '#/users',
      eyebrow: '已有档案',
      title: '数据库模式',
      description: '从演示用户档案中选择对象进行风险筛查',
    },
    {
      id: 'questionnaire',
      href: '#/questionnaire',
      eyebrow: '匿名录入',
      title: '问卷模式',
      description: '填写一份新的健康问卷并即时生成结果',
    },
  ];

  return h('nav', { class: 'source-switcher', 'aria-label': '数据来源模式' },
    items.map((item) => h('a', {
      class: `source-option${item.id === current ? ' active' : ''}`,
      href: item.href,
      'aria-current': item.id === current ? 'page' : null,
    }, [
      h('span', { class: 'source-icon', 'aria-hidden': 'true' }, item.id === 'database' ? '▦' : '✓'),
      h('span', { class: 'source-copy' }, [
        h('small', {}, item.eyebrow),
        h('strong', {}, item.title),
        h('span', {}, item.description),
      ]),
      h('span', { class: 'source-arrow', 'aria-hidden': 'true' }, '→'),
    ])),
  );
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
    h('div', { class: 'search-wrap' }, searchInput),
    countEl,
  ]);
  const container = h('div', {}, [
    h('div', { class: 'page-heading' }, [
      h('h1', {}, '慢病风险筛查'),
      h('p', { class: 'subtitle' }, '选择数据来源，以已有健康档案或匿名问卷发起风险筛查。'),
    ]),
    renderSourceSwitcher('database'),
    h('div', { class: 'content-heading' }, [
      h('div', {}, [
        h('h2', {}, '数据库用户'),
        h('p', {}, '选择一份已有健康档案查看详情'),
      ]),
    ]),
    toolbar,
    h('div', { class: 'table-shell' }, table),
  ]);

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

  const risk = h('div', {}, [
    h('span', { class: `risk-tag ${d.riskLevel}` }, RISK_LEVEL_LABEL[d.riskLevel] ?? d.riskLevel),
    h('span', {}, `筛查优先级：${PRIORITY_LABEL[d.screeningPriority] ?? d.screeningPriority}`),
  ]);

  const riskFactors = d.riskFactors.length
    ? h('ul', { class: 'factor-list' }, d.riskFactors.map((f) => renderFactorItem(f, mainExpls.get(f.id))))
    : h('p', { class: 'evidence' }, '未识别显著风险因素。');

  const protective = d.protectiveFactors.length
    ? h('ul', { class: 'factor-list' }, d.protectiveFactors.map((f) => renderFactorItem(f, protectiveExpls.get(f.id))))
    : h('p', { class: 'evidence' }, '未识别显著保护因素。');

  return h('article', { class: 'disease-card' }, [
    h('h3', {}, DISEASE_LABEL[d.diseaseId] ?? d.diseaseId),
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
    result.modeFallback
      ? h('div', { class: 'mode-fallback-note' },
          `已回退到「${MODE_LABEL.lifestyle_screening}」：该用户在所选模式下没有可用结果。`)
      : null,
    result.overallSummary ? h('p', { class: 'overall-summary' }, result.overallSummary) : null,
    h('div', { class: 'result-grid' }, result.diseases.map(renderDiseaseCard)),
    result.boundaryNote ? h('p', { class: 'boundary-note' }, result.boundaryNote) : null,
  ]);
}

function renderModeSwitcher(currentMode, onChange) {
  const group = h('div', { class: 'mode-switcher', role: 'radiogroup', 'aria-label': '评估模式' });
  for (const m of MODE_ORDER) {
    const btn = h(
      'button',
      {
        type: 'button',
        role: 'radio',
        'aria-checked': String(m === currentMode),
        class: `mode-option${m === currentMode ? ' active' : ''}`,
      },
      MODE_LABEL[m],
    );
    btn.addEventListener('click', () => {
      if (m !== currentMode) onChange(m);
    });
    group.append(btn);
  }
  return group;
}

async function userDetailRoute(userId) {
  const container = h('div', {}, [
    h('div', {}, h('a', { class: 'back-link', href: '#/users' }, '← 返回列表')),
    h('div', { class: 'page-heading' }, [
      h('h1', {}, `用户 ${userId}`),
      h('p', { class: 'subtitle' }, '查看健康画像并选择评估模式生成风险筛查结果。'),
    ]),
    h('div', { id: 'profile-slot' }, h('p', { class: 'loading' }, '加载中…')),
    h('div', { class: 'actions', id: 'action-slot' }),
    h('div', { id: 'result-slot' }),
  ]);
  render(container);

  const profileSlot = container.querySelector('#profile-slot');
  const actionSlot = container.querySelector('#action-slot');
  const resultSlot = container.querySelector('#result-slot');

  let currentMode = 'lifestyle_screening';
  let hasResult = false;

  async function runPrediction(mode) {
    resultSlot.replaceChildren(h('p', { class: 'loading' }, [h('span', { class: 'spinner' }), '预测中…']));
    try {
      const result = await api(`/api/v1/users/${encodeURIComponent(userId)}/prediction`, {
        method: 'POST',
        body: { mode },
      });
      hasResult = true;
      resultSlot.replaceChildren(renderResult(result));
    } catch (e) {
      resultSlot.replaceChildren(h('div', { class: 'error-box' }, `预测失败：${e.message}`));
    }
  }

  function rebuildActions() {
    const switcher = renderModeSwitcher(currentMode, (m) => {
      currentMode = m;
      rebuildActions();
      if (hasResult) runPrediction(currentMode);
    });
    const btn = h('button', { class: 'primary' }, hasResult ? '重新预测' : '风险预测');
    btn.addEventListener('click', () => runPrediction(currentMode));
    actionSlot.replaceChildren(switcher, btn);
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
  let currentMode = 'lifestyle_screening';
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

  function renderActions() {
    const switcher = renderModeSwitcher(currentMode, (m) => {
      currentMode = m;
      renderActions();
    });
    actionsRow.replaceChildren(switcher, submitBtn);
  }
  renderActions();

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
    try {
      const input = collectInput();
      const result = await api('/api/v1/predictions', {
        method: 'POST',
        body: { input, source: 'questionnaire', mode: currentMode },
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
    h('div', { class: 'page-heading' }, [
      h('h1', {}, '慢病风险筛查'),
      h('p', { class: 'subtitle' }, '选择数据来源，以已有健康档案或匿名问卷发起风险筛查。'),
    ]),
    renderSourceSwitcher('questionnaire'),
    h('div', { class: 'content-heading' }, [
      h('div', {}, [
        h('h2', {}, '匿名健康问卷'),
        h('p', {}, '填写信息以生成糖尿病与高血压风险筛查结果，带 * 项为必填'),
      ]),
    ]),
    formEl,
  ]);
  render(container);
}

function route() {
  const hash = location.hash || '#/users';
  const m = hash.match(/^#\/users\/(.+)$/);
  if (m) return userDetailRoute(m[1]);
  if (hash === '#/questionnaire') return questionnaireRoute();
  return usersRoute();
}

window.addEventListener('hashchange', route);
route();
