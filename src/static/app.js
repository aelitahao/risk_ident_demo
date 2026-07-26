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
  return [h('div', { class: 'kv-pair' }, [
    h('dt', {}, label),
    h('dd', {}, value ?? '未记录'),
  ])];
}

const DETAIL_KEY_LABEL = {
  close_relative_heart_attack: '近亲心脏病史',
  pulse_rhythm: '脉搏节律',
  pulse_rate_bpm: '脉率',
  total_cholesterol_mg_dl: '总胆固醇',
  hdl_cholesterol_mg_dl: '高密度脂蛋白胆固醇',
  ldl_cholesterol_mg_dl: '低密度脂蛋白胆固醇',
  triglycerides_mg_dl: '甘油三酯',
};

function readableKey(key) {
  return DETAIL_KEY_LABEL[key] ?? key.replaceAll('_', ' ');
}

function subvalueList(items) {
  const values = items.filter((item) => item != null && String(item).trim());
  if (!values.length) return '未采集';
  return h('ul', { class: 'subvalue-list' }, values.map((item) => {
    if (item instanceof Node) return h('li', {}, item);
    const text = String(item).trim();
    const match = text.match(/^([^:：]{1,30})[:：]\s*(.+)$/);
    return h('li', {}, match
      ? [h('span', { class: 'subvalue-label' }, match[1]), h('span', {}, match[2])]
      : text);
  }));
}

function structuredText(value) {
  if (value == null || value === '') return '未采集';
  const items = String(value).split(/[；;\n]+/).map((item) => item.trim()).filter(Boolean);
  return items.length > 1 || /[:：]/.test(items[0] ?? '') ? subvalueList(items) : value;
}

function structuredArray(values, emptyText = '未报告') {
  return Array.isArray(values) && values.length ? subvalueList(values) : emptyText;
}

function structuredObject(value) {
  if (!value || typeof value !== 'object') return '未采集';
  const items = Object.entries(value).map(([key, itemValue]) =>
    h('span', { class: 'subvalue-row' }, [
      h('span', { class: 'subvalue-label' }, readableKey(key)),
      h('span', {}, String(itemValue)),
    ]));
  return items.length ? subvalueList(items) : '未采集';
}

const ENTRIES = [
  {
    id: 'database',
    href: '#/users',
    icon: 'table-cells',
    title: '档案库',
    meta: '已有数据 · 24',
    cta: '进入档案库',
  },
  {
    id: 'questionnaire',
    href: '#/questionnaire',
    icon: 'pencil-square',
    title: '匿名问卷',
    meta: '临时录入 · 不保存',
    cta: '填写问卷',
  },
];

function backLink(href = '#/', text = '返回入口') {
  return h('div', {}, h('a', { class: 'back-link', href }, [icon('arrow-left'), text]));
}

function previewRisk(label) {
  return h('div', { class: 'preview-risk' }, [
    h('div', {}, [h('span', {}, label), h('strong', { class: 'risk-low-text' }, '低风险')]),
    h('div', { class: 'preview-risk-track', role: 'img', 'aria-label': `${label}低风险` }, [
      h('span', { class: 'low active' }),
      h('span', { class: 'medium' }),
      h('span', { class: 'high' }),
    ]),
  ]);
}

function healthDataPreview() {
  return h('section', { class: 'health-preview', 'aria-label': '健康画像结果预览' }, [
    h('header', { class: 'preview-header' }, [
      h('div', {}, [h('span', {}, '健康画像'), h('strong', {}, 'US-001')]),
      h('span', { class: 'record-status static complete' }, '基本完整'),
    ]),
    h('div', { class: 'preview-metrics' }, [
      h('div', {}, [h('span', {}, 'BMI'), h('strong', {}, '23.5')]),
      h('div', {}, [h('span', {}, '腰围'), h('strong', {}, '81.4 cm')]),
      h('div', {}, [h('span', {}, '每周运动'), h('strong', {}, '2 次')]),
    ]),
    h('div', { class: 'preview-risks' }, [
      previewRisk('糖尿病风险'),
      previewRisk('高血压风险'),
    ]),
  ]);
}

function modelNote() {
  return h('details', { class: 'model-note' }, [
    h('summary', {}, '模型说明 ⓘ'),
    h('div', {}, [
      h('p', {}, '模型仅使用年龄、体型、生活方式与健康史等非目标字段。'),
      h('p', {}, '不采集血压、HbA1c 或空腹血糖；结果用于健康管理演示，不构成临床诊断。'),
    ]),
  ]);
}

function homeRoute() {
  const cards = ENTRIES.map((item) => h('a', { class: `entry-card entry-${item.id}`, href: item.href }, [
    h('span', { class: 'entry-icon', 'aria-hidden': 'true' }, icon(item.icon)),
    h('div', {}, [
      h('h2', {}, item.title),
      h('span', { class: 'entry-meta' }, item.meta),
    ]),
    h('span', { class: 'entry-cta' }, [item.cta, icon('arrow-right')]),
  ]));

  render(h('div', { class: 'home' }, [
    h('div', { class: 'home-main' }, [
      h('div', { class: 'home-content' }, [
        h('div', { class: 'page-heading home-heading' }, [
          h('h1', {}, '慢性病风险分析'),
          h('p', { class: 'subtitle' }, '糖尿病与高血压风险评估'),
        ]),
        h('div', { class: 'entry-grid' }, cards),
        modelNote(),
      ]),
      healthDataPreview(),
    ]),
    h('ol', { class: 'process-flow', 'aria-label': '分析流程' }, [
      '选择数据来源', '查看健康画像', '运行风险预测', '查看因素解释',
    ].map((step) => h('li', {}, step))),
  ]));
}

function archiveRoute(initialUserId = null) {
  const state = { q: '', users: [], selectedId: initialUserId, detailRequest: 0 };

  const searchInput = h('input', {
    type: 'search',
    placeholder: '搜索用户 ID',
    'aria-label': '按用户 ID 搜索',
  });
  const list = h('div', { class: 'record-list', role: 'list' });
  const countEl = h('span', { class: 'count' });
  const detailSlot = h('section', { class: 'workspace-detail', 'aria-live': 'polite' }, [
    h('div', { class: 'empty' }, '选择用户查看健康画像'),
  ]);
  const container = h('div', { class: 'archive-page' }, [
    h('div', { class: 'page-heading archive-heading' }, [
      h('div', {}, [
        h('h1', {}, '档案库'),
        h('p', { class: 'subtitle' }, '浏览健康画像并运行风险预测'),
      ]),
      h('a', { class: 'secondary-action', href: '#/' }, '退出档案库'),
    ]),
    h('div', { class: 'archive-workspace' }, [
      h('aside', { class: 'record-sidebar', 'aria-label': '用户档案' }, [
        h('div', { class: 'sidebar-header' }, [
          h('strong', {}, '用户'),
          countEl,
        ]),
        h('div', { class: 'search-wrap' }, [icon('magnifying-glass', { class: 'search-icon' }), searchInput]),
        list,
      ]),
      detailSlot,
    ]),
  ]);

  function renderList() {
    list.replaceChildren();
    if (state.users.length === 0) {
      list.append(h('div', { class: 'empty compact' }, '没有匹配的用户'));
      return;
    }
    for (const u of state.users) {
      const select = () => {
        if (state.selectedId === u.userId) return;
        state.selectedId = u.userId;
        history.replaceState(null, '', `#/users/${u.userId}`);
        renderList();
        loadDetail(u.userId);
      };
      list.append(h('button', {
        class: `record-row${u.userId === state.selectedId ? ' selected' : ''}`,
        type: 'button',
        role: 'listitem',
        'aria-label': `查看 ${u.userId} 的详情`,
        onclick: select,
      }, [
        h('span', { class: 'record-id' }, u.userId),
        h('span', { class: 'record-meta' }, `${fmt(u.ageYears, ' 岁')} · ${GENDER_LABEL[u.gender] ?? '—'} · BMI ${fmt(u.bmi)}`),
        h('span', { class: `record-status ${u.dataStatus}` },
          DATA_STATUS_LABEL[u.dataStatus] ?? u.dataStatus),
      ]));
    }
  }

  async function loadDetail(userId) {
    const request = ++state.detailRequest;
    detailSlot.replaceChildren(...profileSkeleton());
    try {
      const detail = await api(`/api/v1/users/${encodeURIComponent(userId)}`);
      if (request !== state.detailRequest) return;
      let hasResult = false;
      const resultSlot = h('div', { class: 'result-slot' }, h('div', { class: 'result-empty' }, '尚未运行风险预测'));
      const predictBtn = h('button', { class: 'primary', type: 'button' }, '运行风险预测');
      predictBtn.addEventListener('click', async () => {
        predictBtn.disabled = true;
        predictBtn.textContent = '正在分析…';
        resultSlot.replaceChildren(resultSkeleton());
        try {
          const result = await api(`/api/v1/users/${encodeURIComponent(userId)}/prediction`, { method: 'POST', body: {} });
          hasResult = true;
          resultSlot.replaceChildren(renderResult(result));
        } catch (e) {
          resultSlot.replaceChildren(h('div', { class: 'error-box' }, `预测失败：${e.message}`));
        } finally {
          predictBtn.disabled = false;
          predictBtn.textContent = hasResult ? '重新运行' : '运行风险预测';
        }
      });
      const profileSections = renderProfileSections(detail.profile, userId, detail.dataStatus, predictBtn);
      detailSlot.replaceChildren(profileSections[0], resultSlot, ...profileSections.slice(1));
    } catch (e) {
      if (request === state.detailRequest) detailSlot.replaceChildren(h('div', { class: 'error-box' }, `加载失败：${e.message}`));
    }
  }

  let debounceTimer = null;
  searchInput.addEventListener('input', (e) => {
    state.q = e.target.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        const data = await api(`/api/v1/users${state.q ? `?q=${encodeURIComponent(state.q)}` : ''}`);
        state.users = data.users;
        countEl.textContent = String(data.total);
        renderList();
      } catch (e) {
        list.replaceChildren(h('div', { class: 'error-box' }, `加载失败：${e.message}`));
      }
    }, 250);
  });

  render(container);
  list.replaceChildren(...Array.from({ length: 8 }, () => h('span', { class: 'sk-line list-skeleton' })));
  api('/api/v1/users').then((data) => {
    state.users = data.users;
    countEl.textContent = String(data.total);
    if (!state.selectedId && state.users.length) {
      state.selectedId = state.users[0].userId;
      history.replaceState(null, '', `#/users/${state.selectedId}`);
    }
    renderList();
    if (state.selectedId) loadDetail(state.selectedId);
  }).catch((e) => list.replaceChildren(h('div', { class: 'error-box' }, `加载失败：${e.message}`)));
}

function usersRoute() { archiveRoute(); }

function metricRange(label, value, suffix, min, max, statusText) {
  const numeric = Number(value);
  const percent = Number.isFinite(numeric)
    ? Math.max(0, Math.min(100, ((numeric - min) / (max - min)) * 100))
    : 0;
  return h('div', { class: 'overview-metric' }, [
    h('div', { class: 'metric-heading' }, [
      h('span', {}, label),
      h('strong', {}, fmt(value, suffix)),
    ]),
    h('div', { class: 'metric-range', role: 'img', 'aria-label': `${label} ${fmt(value, suffix)}` }, [
      h('span', { class: 'metric-zone normal' }),
      h('span', { class: 'metric-zone elevated' }),
      h('span', { class: 'metric-marker', style: `left:${percent}%` }),
    ]),
    h('small', {}, statusText),
  ]);
}

function renderProfileSections(profile, userId, dataStatus, action) {
  const basic = profile.basicInfo;
  const life = profile.lifestyle;
  const hh = profile.healthHistory;
  const gi = hh.generalIndicators ?? {};
  const bmiStatus = basic.bmi == null ? '未记录' : basic.bmi < 24 ? '常用正常范围' : basic.bmi < 28 ? '偏高' : '较高';
  const waistLimit = basic.gender === 'female' ? 85 : 90;
  const waistStatus = basic.waistCm == null ? '未记录' : basic.waistCm < waistLimit ? '低于常用界值' : '达到或超过常用界值';

  const overview = h('section', { class: 'user-overview' }, [
    h('div', { class: 'overview-header' }, [
      h('div', { class: 'avatar', 'aria-hidden': 'true' }, userId.replace(/\D/g, '').slice(-2) || 'U'),
      h('div', { class: 'overview-identity' }, [
        h('span', {}, '用户档案'),
        h('h2', {}, userId),
        h('div', { class: 'overview-tags' }, [
          h('span', { class: `record-status static ${dataStatus}` }, DATA_STATUS_LABEL[dataStatus] ?? dataStatus),
          h('span', {}, `${fmt(basic.ageYears, ' 岁')} · ${GENDER_LABEL[basic.gender] ?? '—'}`),
        ]),
      ]),
      h('div', { class: 'overview-action' }, action),
    ]),
    h('div', { class: 'overview-body' }, [
      h('dl', { class: 'overview-facts' }, [
        ...pair('身高', fmt(basic.heightCm, ' cm')),
        ...pair('体重', fmt(basic.weightKg, ' kg')),
      ]),
      h('div', { class: 'overview-metrics' }, [
        metricRange('BMI', basic.bmi, '', 10, 40, bmiStatus),
        metricRange('腰围', basic.waistCm, ' cm', 50, 130, waistStatus),
      ]),
    ]),
  ]);

  const lifestyleSection = h('details', { class: 'section detail-section' }, [
    h('summary', {}, '生活方式'),
    h('dl', { class: 'kv-grid' }, [
      ...pair('吸烟状态', SMOKING_LABEL[life.smokingStatus] ?? '—'),
      ...pair('饮酒摘要', structuredText(life.alcoholSummary)),
      ...pair('活动摘要', structuredText(life.physicalActivitySummary)),
      ...pair('久坐（分钟/天）', fmt(life.sedentaryMinutesPerDay)),
      ...pair('工作日睡眠', fmt(life.weekdaySleepHours, ' 小时')),
      ...pair('周末睡眠', fmt(life.weekendSleepHours, ' 小时')),
      ...pair('单日膳食', structuredText(life.dietaryRecord?.summary)),
    ]),
  ]);

  const historySection = h('details', { class: 'section detail-section' }, [
    h('summary', {}, '健康史'),
    h('dl', { class: 'kv-grid' }, [
      ...pair('已知疾病', structuredArray(hh.knownDiseases)),
      ...pair('家族史', structuredObject(hh.familyHistory)),
      ...pair('当前症状', structuredArray(hh.currentSymptoms)),
      ...pair('一般指标', structuredObject(gi)),
    ]),
  ]);

  return [overview, lifestyleSection, historySection];
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

function renderConclusionBar(riskLevel, screeningPriority) {
  const conclusionText =
    `${RISK_LEVEL_LABEL[riskLevel] ?? riskLevel} · 建议${PRIORITY_LABEL[screeningPriority] ?? screeningPriority}`;
  return h('div', {
    class: `risk-conclusion-bar risk-${riskLevel}`,
    role: 'status',
  }, conclusionText);
}

function renderMeterRow(riskLevel) {
  const levelIndex = { low: 0, medium: 1, high: 2 }[riskLevel];
  if (levelIndex == null) return null;
  const ordinal = `${levelIndex + 1}/3`;
  return h('div', {
    class: 'risk-meter-row',
    role: 'img',
    'aria-label': `风险等级：${RISK_LEVEL_LABEL[riskLevel]}（3 级中的第 ${levelIndex + 1} 级）`,
  }, [
    h('span', { class: 'risk-meter-label' }, '风险等级'),
    h('div', { class: 'risk-meter', 'aria-hidden': 'true' },
      [0, 1, 2].map((i) => h('span', {
        class: `risk-meter-seg level-${i}${i === levelIndex ? ' active' : ''}`,
      })),
    ),
    h('span', { class: 'risk-meter-ordinal' }, ordinal),
  ]);
}

function renderDiseaseCard(d) {
  const expl = d.explanation ?? {};
  const mainExpls = explanationLookup(expl.mainFactorExplanations);
  const protectiveExpls = explanationLookup(expl.protectiveFactorExplanations);

  const riskFactors = d.riskFactors.length
    ? h('ul', { class: 'factor-list' }, d.riskFactors.map((f) => renderFactorItem(f, mainExpls.get(f.id))))
    : h('p', { class: 'evidence' }, '未识别显著风险因素。');

  const protective = d.protectiveFactors.length
    ? h('ul', { class: 'factor-list' }, d.protectiveFactors.map((f) => renderFactorItem(f, protectiveExpls.get(f.id))))
    : h('p', { class: 'evidence' }, '未识别显著保护因素。');

  return h('article', { class: `disease-card risk-${d.riskLevel}` }, [
    h('h3', { class: 'disease-card-name' }, DISEASE_LABEL[d.diseaseId] ?? d.diseaseId),
    renderConclusionBar(d.riskLevel, d.screeningPriority),
    renderMeterRow(d.riskLevel),
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
  archiveRoute(userId);
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

  function repeatableSelectField(path, label, options, addText = '添加一项') {
    const rows = h('div', { class: 'repeatable-rows' });
    const wrapper = h('div', { class: 'form-field repeatable-field' });
    const err = h('div', { class: 'field-error', 'data-for': path });
    const addRow = () => {
      const select = h('select', { 'aria-label': label }, [
        h('option', { value: '' }, '请选择'),
        ...options.map(([value, text]) => h('option', { value }, text)),
      ]);
      const remove = h('button', { class: 'remove-row', type: 'button', 'aria-label': `删除${label}` }, '移除');
      const row = h('div', { class: 'repeatable-row' }, [select, remove]);
      remove.addEventListener('click', () => row.remove());
      rows.append(row);
    };
    const add = h('button', { class: 'add-row', type: 'button' }, `＋ ${addText}`);
    add.addEventListener('click', addRow);
    wrapper.append(h('label', {}, label), rows, add, err);
    fields.set(path, wrapper);
    addRow();
    return {
      element: wrapper,
      values: () => [...rows.querySelectorAll('select')].map((el) => el.value).filter(Boolean),
    };
  }

  function familyHistoryField() {
    const path = 'healthHistory.familyHistory';
    const rows = h('div', { class: 'repeatable-rows' });
    const wrapper = h('div', { class: 'form-field repeatable-field' });
    const err = h('div', { class: 'field-error', 'data-for': path });
    const relatives = [['父亲', '父亲'], ['母亲', '母亲'], ['兄弟姐妹', '兄弟姐妹'], ['祖父母', '祖父母'], ['其他近亲', '其他近亲']];
    const diseases = [['糖尿病', '糖尿病'], ['高血压', '高血压'], ['冠心病', '冠心病'], ['脑卒中', '脑卒中'], ['其他慢性病', '其他慢性病']];
    const addRow = () => {
      const relative = h('select', { 'aria-label': '亲属关系' }, [
        h('option', { value: '' }, '选择亲属'),
        ...relatives.map(([v, t]) => h('option', { value: v }, t)),
      ]);
      const disease = h('select', { 'aria-label': '家族疾病' }, [
        h('option', { value: '' }, '选择疾病'),
        ...diseases.map(([v, t]) => h('option', { value: v }, t)),
      ]);
      const remove = h('button', { class: 'remove-row', type: 'button', 'aria-label': '删除家族史' }, '移除');
      const row = h('div', { class: 'repeatable-row family-row' }, [relative, disease, remove]);
      remove.addEventListener('click', () => row.remove());
      rows.append(row);
    };
    const add = h('button', { class: 'add-row', type: 'button' }, '＋ 添加家族史');
    add.addEventListener('click', addRow);
    wrapper.append(h('label', {}, '家族史'), rows, add, err);
    fields.set(path, wrapper);
    addRow();
    return {
      element: wrapper,
      value: () => {
        const result = {};
        for (const row of rows.querySelectorAll('.family-row')) {
          const [relative, disease] = row.querySelectorAll('select');
          if (relative.value && disease.value) result[`${relative.value}_${disease.value}`] = '是';
        }
        return result;
      },
    };
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
      selectField('lifestyle.alcoholSummary', '饮酒频率', [
        ['过去一年未饮酒', '过去一年未饮酒'],
        ['每月少于 1 次', '每月少于 1 次'],
        ['每月 1–3 次', '每月 1–3 次'],
        ['每周 1–2 次', '每周 1–2 次'],
        ['每周 3 次及以上', '每周 3 次及以上'],
      ]),
      selectField('lifestyle.physicalActivitySummary', '日常活动水平', [
        ['未进行规律运动', '未进行规律运动'],
        ['以步行等轻度活动为主', '轻度活动'],
        ['每周进行中等强度活动', '中等强度活动'],
        ['每周进行高强度活动', '高强度活动'],
      ]),
      field('lifestyle.sedentaryMinutesPerDay', '久坐（分钟/天）', { type: 'number', min: '0', max: '1440' }),
      field('lifestyle.weekdaySleepHours', '工作日睡眠（小时）', { type: 'number', min: '0', max: '24', step: '0.1' }),
      field('lifestyle.weekendSleepHours', '周末睡眠（小时）', { type: 'number', min: '0', max: '24', step: '0.1' }),
    ]),
    h('div', { class: 'form-subsection' }, [
      h('h3', {}, '单日膳食'),
      h('div', { class: 'form-grid' }, [
        selectField('lifestyle.dietSalt', '口味咸度', [
          ['清淡', '清淡'], ['一般', '一般'], ['高盐', '偏咸 / 高盐'],
        ]),
        selectField('lifestyle.dietProduce', '蔬菜水果摄入', [
          ['不足 2 份', '不足 2 份'], ['2–4 份', '2–4 份'], ['5 份及以上', '5 份及以上'],
        ]),
        selectField('lifestyle.sugaryDrinks', '含糖饮料', [
          ['不饮用', '不饮用'], ['偶尔饮用', '偶尔饮用'], ['每天饮用', '每天饮用'],
        ]),
      ]),
    ]),
  ]);

  const knownDiseasesField = repeatableSelectField('healthHistory.knownDiseases', '已知疾病', [
    ['糖尿病', '糖尿病'], ['高血压', '高血压'], ['高脂血症', '高脂血症'],
    ['冠心病', '冠心病'], ['脑卒中', '脑卒中'], ['甲状腺疾病', '甲状腺疾病'],
    ['慢性肾病', '慢性肾病'], ['其他慢性病', '其他慢性病'],
  ], '疾病');
  const familyField = familyHistoryField();
  const symptomsField = repeatableSelectField('healthHistory.currentSymptoms', '当前症状', [
    ['无明显症状', '无明显症状'], ['口渴或多饮', '口渴或多饮'], ['尿频', '尿频'],
    ['体重异常变化', '体重异常变化'], ['头晕或头痛', '头晕或头痛'],
    ['胸闷或心悸', '胸闷或心悸'], ['活动后气短', '活动后气短'], ['其他症状', '其他症状'],
  ], '症状');

  const historySection = h('section', { class: 'section form-section' }, [
    h('h2', {}, '健康史'),
    h('p', { class: 'field-hint' }, '本表单不采集血压、HbA1c 或空腹血糖等目标信息，避免评估被污染。'),
    h('div', { class: 'structured-form-grid' }, [
      knownDiseasesField.element,
      familyField.element,
      symptomsField.element,
    ]),
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
    const salt = nullable(get('lifestyle.dietSalt'));
    const produce = nullable(get('lifestyle.dietProduce'));
    const sugaryDrinks = nullable(get('lifestyle.sugaryDrinks'));
    const dietaryRecord = salt || produce || sugaryDrinks
      ? {
          saltLevel: salt,
          fruitVegetableServings: produce,
          sugaryDrinks,
          summary: [
            salt ? `口味：${salt}` : null,
            produce ? `蔬菜水果：${produce}` : null,
            sugaryDrinks ? `含糖饮料：${sugaryDrinks}` : null,
          ].filter(Boolean).join('；'),
        }
      : null;
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
        dietaryRecord,
      },
      healthHistory: {
        knownDiseases: knownDiseasesField.values(),
        familyHistory: familyField.value(),
        currentSymptoms: symptomsField.values().filter((value) => value !== '无明显症状'),
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

  const container = h('div', { class: 'questionnaire-page' }, [
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
