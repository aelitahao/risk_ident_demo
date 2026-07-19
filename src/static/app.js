const app = document.getElementById('app');

const RISK_LEVEL_LABEL = { low: '低风险', medium: '中风险', high: '高风险' };
const PRIORITY_LABEL = { monitor: '持续关注', routine: '常规筛查', priority: '优先筛查' };
const DATA_STATUS_LABEL = { complete: '基本完整', partial: '部分缺失', sparse: '数据稀疏' };
const GENDER_LABEL = { male: '男性', female: '女性', other: '其他' };
const SMOKING_LABEL = { never: '从未吸烟', former: '既往吸烟', current: '当前吸烟' };

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

function pair(label, value) {
  return [h('dt', {}, label), h('dd', {}, value ?? '—')];
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

  const toolbar = h('div', { class: 'toolbar' }, [searchInput, countEl]);
  const container = h('div', {}, [toolbar, table]);

  function renderRows() {
    tbody.replaceChildren();
    if (state.users.length === 0) {
      tbody.append(h('tr', {}, h('td', { colspan: '7' }, h('div', { class: 'empty' }, '未匹配用户'))));
      return;
    }
    for (const u of state.users) {
      const row = h('tr', { onclick: () => (location.hash = `#/users/${u.userId}`) }, [
        h('td', {}, u.userId),
        h('td', {}, fmt(u.ageYears)),
        h('td', {}, GENDER_LABEL[u.gender] ?? '—'),
        h('td', {}, fmt(u.bmi)),
        h('td', {}, fmt(u.waistCm, ' cm')),
        h('td', {}, u.lifestyleSummary ?? '—'),
        h('td', {}, h('span', { class: `status-badge ${u.dataStatus}` }, DATA_STATUS_LABEL[u.dataStatus] ?? u.dataStatus)),
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

function renderDiseaseCard(d) {
  const risk = h('div', {}, [
    h('span', { class: `risk-tag ${d.riskLevel}` }, RISK_LEVEL_LABEL[d.riskLevel] ?? d.riskLevel),
    h('span', {}, `筛查优先级：${PRIORITY_LABEL[d.screeningPriority] ?? d.screeningPriority}`),
  ]);

  const riskFactors = d.riskFactors.length
    ? h('ul', { class: 'factor-list' }, d.riskFactors.map((f) =>
        h('li', {}, [h('div', {}, f.label), h('div', { class: 'evidence' }, f.evidence)]),
      ))
    : h('p', { class: 'evidence' }, '未识别显著风险因素。');

  const protective = d.protectiveFactors.length
    ? h('ul', { class: 'factor-list' }, d.protectiveFactors.map((f) =>
        h('li', {}, [h('div', {}, f.label), h('div', { class: 'evidence' }, f.evidence)]),
      ))
    : h('p', { class: 'evidence' }, '未识别显著保护因素。');

  return h('article', { class: 'disease-card' }, [
    h('h3', {}, d.diseaseId === 'diabetes' ? '糖尿病' : '高血压'),
    d.evidenceLevel === 'limited'
      ? h('div', { class: 'evidence-warning' }, '证据有限：可用数据较少，结果仅供演示参考。')
      : null,
    risk,
    h('h4', {}, '主要风险因素'),
    riskFactors,
    h('h4', {}, '保护因素'),
    protective,
  ]);
}

function renderResult(result) {
  return h('section', { class: 'section' }, [
    h('h2', {}, '风险预测结果'),
    h('div', { class: 'result-grid' }, result.diseases.map(renderDiseaseCard)),
    result.boundaryNote ? h('p', { class: 'boundary-note' }, result.boundaryNote) : null,
  ]);
}

async function userDetailRoute(userId) {
  const container = h('div', {}, [
    h('div', {}, h('a', { class: 'back-link', href: '#/users' }, '← 返回列表')),
    h('h2', {}, `用户 ${userId}`),
    h('div', { id: 'profile-slot' }, h('p', { class: 'loading' }, '加载中…')),
    h('div', { class: 'actions', id: 'action-slot' }),
    h('div', { id: 'result-slot' }),
  ]);
  render(container);

  const profileSlot = container.querySelector('#profile-slot');
  const actionSlot = container.querySelector('#action-slot');
  const resultSlot = container.querySelector('#result-slot');

  try {
    const detail = await api(`/api/v1/users/${encodeURIComponent(userId)}`);
    profileSlot.replaceChildren(...renderProfileSections(detail.profile));
    const btn = h('button', { class: 'primary' }, '风险预测');
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = '预测中…';
      try {
        const result = await api(`/api/v1/users/${encodeURIComponent(userId)}/prediction`, {
          method: 'POST',
        });
        resultSlot.replaceChildren(renderResult(result));
      } catch (e) {
        resultSlot.replaceChildren(h('div', { class: 'error-box' }, `预测失败：${e.message}`));
      } finally {
        btn.disabled = false;
        btn.textContent = '重新预测';
      }
    });
    actionSlot.replaceChildren(btn);
  } catch (e) {
    profileSlot.replaceChildren(h('div', { class: 'error-box' }, `加载失败：${e.message}`));
  }
}

function showError(e) {
  render(h('div', { class: 'error-box' }, `请求出错：${e.message}`));
}

function route() {
  const hash = location.hash || '#/users';
  const m = hash.match(/^#\/users\/(.+)$/);
  if (m) return userDetailRoute(m[1]);
  return usersRoute();
}

window.addEventListener('hashchange', route);
route();
