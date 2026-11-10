const prisma = require('../../config/prisma');
const { getPagination, paginationMeta } = require('../../utils/pagination');
const { normalizeSearchText } = require('../../utils/search');

const CATEGORIES = ['AUTH', 'CLASS', 'STUDENT', 'EXAM', 'ACCOUNT'];

const ACTOR_FALLBACK = {
  id: null,
  username: 'không xác định',
  fullName: 'Không xác định',
  role: 'TEACHER',
};

function parseUserAgent(userAgent = '') {
  const ua = String(userAgent);
  let device = 'Máy tính';
  if (/iPad|Tablet/i.test(ua)) device = 'Máy tính bảng';
  else if (/Mobile|Android|iPhone/i.test(ua)) device = 'Điện thoại';

  let browser = 'Khác';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/CocCoc/i.test(ua)) browser = 'Cốc Cốc';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  return { device, browser };
}

function getClientIp(req) {
  const raw = req.ip || req.socket?.remoteAddress || '';
  return String(raw).replace(/^::ffff:/, '').slice(0, 60);
}

function maskStudentCode(value) {
  const code = String(value || '');
  if (!code) return null;
  if (code.length <= 4) return `${'*'.repeat(code.length)}`;
  return `${code.slice(0, 4)}**`;
}

function collectSearchValues(value, output) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectSearchValues(item, output));
    return;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach((item) => collectSearchValues(item, output));
    return;
  }
  output.push(String(value));
}

function buildSearchText({ actor, targetLabel, data }) {
  const values = [actor.actorUsername, actor.actorFullName, targetLabel];
  collectSearchValues(data, values);
  return normalizeSearchText(values.filter(Boolean).join(' '));
}

async function recordActivity({
  req,
  actor,
  category,
  action,
  status = 'SUCCESS',
  reason = null,
  targetType = null,
  targetId = null,
  targetLabel = null,
  data = null,
}) {
  try {
    if (!CATEGORIES.includes(category)) return;

    const source = actor || req?.user || ACTOR_FALLBACK;
    const actorSnapshot = {
      actorId: source.id || null,
      actorUsername: String(source.username || ACTOR_FALLBACK.username).toLowerCase(),
      actorFullName: source.fullName || ACTOR_FALLBACK.fullName,
      actorRole: source.role || ACTOR_FALLBACK.role,
    };
    const { device, browser } = parseUserAgent(req?.headers?.['user-agent']);

    await prisma.activityLog.create({
      data: {
        category,
        action,
        status,
        reason: reason ? String(reason).slice(0, 300) : null,
        ...actorSnapshot,
        targetType,
        targetId: targetId || null,
        targetLabel: targetLabel ? String(targetLabel).slice(0, 200) : null,
        data: data || null,
        device,
        browser,
        ip: req ? getClientIp(req) : null,
        searchText: buildSearchText({ actor: actorSnapshot, targetLabel, data }),
      },
    });
  } catch (error) {
    console.error('Không ghi được lịch sử hoạt động:', error.message);
  }
}

function buildActivityWhere({ actorId, teacherId, category, status, action, search, from, to }) {
  const where = {};
  const ownerId = teacherId || actorId;
  if (ownerId) where.actorId = ownerId;
  if (category) where.category = category;
  if (status) where.status = status;
  if (action) where.action = action;
  if (search) where.searchText = { contains: normalizeSearchText(search) };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }
  return where;
}

async function listActivity(filters) {
  const { page, limit, skip } = getPagination(filters.page, filters.limit);
  const where = buildActivityWhere(filters);

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return { items, pagination: paginationMeta(total, page, limit) };
}

function examLogData(exam) {
  return {
    title: exam.title,
    subject: exam.subject,
    durationMinutes: exam.durationMinutes,
    status: exam.status,
    classNames: (exam.classes || []).map((classroom) => classroom.name),
    questionCount: exam.questionCount ?? exam.questions?.length ?? 0,
    attemptCount: exam.attemptCount ?? exam._count?.attempts ?? 0,
  };
}

module.exports = {
  CATEGORIES,
  recordActivity,
  listActivity,
  maskStudentCode,
  parseUserAgent,
  examLogData,
};
