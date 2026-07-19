import { listProfiles, getProfile } from '../repository.js';
import { profileToPredictionInput } from '../prediction/mapper.js';
import { userNotFound } from '../errors.js';

function summaryOf(profile) {
  const parts = [];
  const sm = profile.lifestyle?.smoking?.summary;
  const pa = profile.lifestyle?.physical_activity?.summary;
  const sl = profile.lifestyle?.sleep?.summary;
  if (sm) parts.push(sm);
  if (pa) parts.push(pa);
  if (sl) parts.push(sl);
  return parts.join('；') || '无生活方式摘要';
}

function mapDataStatus(status) {
  if (!status) return 'sparse';
  const s = status.overall_status ?? '';
  if (s.includes('完整')) return 'complete';
  if (s.includes('缺失') || s.includes('少')) return 'sparse';
  return 'partial';
}

export function listUsers({ query }) {
  const q = (query?.q ?? '').trim().toLowerCase();
  const rows = listProfiles()
    .filter((p) => !q || p.user_id.toLowerCase().includes(q))
    .map((p) => {
      const b = p.basic_info ?? {};
      const body = b.body_measurements ?? {};
      return {
        userId: p.user_id,
        ageYears: b.age_years ?? null,
        gender: b.gender === '男性' ? 'male' : b.gender === '女性' ? 'female' : 'other',
        bmi: body.bmi ?? null,
        waistCm: body.waist_cm ?? null,
        lifestyleSummary: summaryOf(p),
        dataStatus: mapDataStatus(p.data_status),
      };
    });
  return { total: rows.length, users: rows };
}

export function getUserDetail({ params }) {
  const profile = getProfile(params.userId);
  if (!profile) throw userNotFound(params.userId);
  return {
    userId: profile.user_id,
    profile: profileToPredictionInput(profile),
    dataStatus: mapDataStatus(profile.data_status),
    rawProfile: profile,
  };
}
