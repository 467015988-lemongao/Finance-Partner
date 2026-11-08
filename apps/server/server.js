import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3010;
const DATA_DIR = path.join(__dirname, 'data');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const MAX_AMOUNT_CENTS = 1000000 * 100; // 100 万元

const DEFAULT_CATEGORIES = [
  { name: '餐饮', icon: '🍜', color: '#ff7a45' },
  { name: '交通', icon: '🚌', color: '#40a9ff' },
  { name: '购物', icon: '🛍️', color: '#9254de' },
  { name: '居住', icon: '🏠', color: '#36cfc9' },
  { name: '娱乐', icon: '🎮', color: '#ffc53d' },
  { name: '医疗', icon: '💊', color: '#ff4d4f' },
  { name: '其他', icon: '📦', color: '#8c8c8c' },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: '工资', icon: '💰', color: '#52c41a' },
  { name: '奖金', icon: '🏆', color: '#faad14' },
  { name: '理财', icon: '📈', color: '#13c2c2' },
  { name: '兼职', icon: '💼', color: '#2f54eb' },
  { name: '红包', icon: '🧧', color: '#f5222d' },
  { name: '其他收入', icon: '🪙', color: '#8c8c8c' },
];

const TYPES = ['expense', 'income'];

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

let categories = [];
let records = [];

/* ---------------- 持久化：原子写 + 串行队列 ---------------- */

let writeQueue = Promise.resolve();

function enqueueWrite(task) {
  const result = writeQueue.then(() => task());
  writeQueue = result.catch(() => {});
  return result;
}

async function writeJsonAtomic(file, data) {
  const tmp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, file);
}

function persistCategories() {
  const snapshot = categories.map((item) => ({ ...item }));
  return enqueueWrite(() => writeJsonAtomic(CATEGORIES_FILE, snapshot));
}

function persistRecords() {
  const snapshot = records.map((item) => ({ ...item }));
  return enqueueWrite(() => writeJsonAtomic(RECORDS_FILE, snapshot));
}

async function readJsonArray(file) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    if (err.code === 'ENOENT' || err instanceof SyntaxError) return null;
    throw err;
  }
}

function buildDefaultCategories() {
  const base = Date.now();
  return DEFAULT_CATEGORIES.map((item, index) => ({
    id: genId('c_'),
    name: item.name,
    icon: item.icon,
    color: item.color,
    type: 'expense',
    isDefault: true,
    createdAt: new Date(base + index).toISOString(),
  }));
}

function appendDefaultIncomeCategories() {
  const existingTimes = categories
    .map((item) => Date.parse(item.createdAt))
    .filter((value) => Number.isFinite(value));
  const base = Math.max(Date.now(), ...existingTimes);
  const created = DEFAULT_INCOME_CATEGORIES.map((item, index) => ({
    id: genId('c_'),
    name: item.name,
    icon: item.icon,
    color: item.color,
    type: 'income',
    isDefault: true,
    createdAt: new Date(base + index + 1).toISOString(),
  }));
  categories.push(...created);
}

async function initStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const loadedCategories = await readJsonArray(CATEGORIES_FILE);
  const loadedRecords = await readJsonArray(RECORDS_FILE);

  let categoriesChanged = false;
  let recordsChanged = false;

  if (loadedCategories) {
    categories = loadedCategories;
    for (const item of categories) {
      if (!TYPES.includes(item.type)) {
        item.type = 'expense';
        categoriesChanged = true;
      }
    }
  } else {
    categories = buildDefaultCategories();
    categoriesChanged = true;
  }

  if (!categories.some((item) => item.type === 'income')) {
    appendDefaultIncomeCategories();
    categoriesChanged = true;
  }

  if (loadedRecords) {
    records = loadedRecords;
    const categoryTypeMap = new Map(categories.map((item) => [item.id, item.type]));
    for (const item of records) {
      if (!TYPES.includes(item.type)) {
        item.type = categoryTypeMap.get(item.categoryId) ?? 'expense';
        recordsChanged = true;
      }
    }
  } else {
    records = [];
    recordsChanged = true;
  }

  if (categoriesChanged) await persistCategories();
  if (recordsChanged) await persistRecords();
}

/* ---------------- 通用工具 ---------------- */

function genId(prefix) {
  let suffix = '';
  for (let i = 0; i < 4; i += 1) {
    suffix += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  }
  return `${prefix}${Date.now()}_${suffix}`;
}

function ok(res, data) {
  res.json({ ok: true, data });
}

function fail(res, status, error) {
  res.status(status).json({ ok: false, error });
}

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function amountToCents(amount) {
  return Math.round(Number(amount) * 100);
}

function centsToYuan(cents) {
  return Math.round(cents) / 100;
}

function sumCents(list) {
  return list.reduce((sum, item) => sum + amountToCents(item.amount), 0);
}

function parseAmountToCents(value) {
  let text;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    text = String(value);
  } else if (typeof value === 'string') {
    text = value.trim();
  } else {
    return null;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const cents = Math.round(Number(text) * 100);
  if (!Number.isSafeInteger(cents)) return null;
  if (cents <= 0 || cents > MAX_AMOUNT_CENTS) return null;
  return cents;
}

function isValidDateString(value) {
  if (typeof value !== 'string') return false;
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!matched) return false;
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  if (year < 1000 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;
  return true;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatMonth(year, month) {
  return `${year}-${pad2(month)}`;
}

function parseMonth(value) {
  if (typeof value !== 'string') return null;
  const matched = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!matched) return null;
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  if (year < 1000 || year > 9999) return null;
  if (month < 1 || month > 12) return null;
  return { year, month, key: `${matched[1]}-${matched[2]}` };
}

function currentMonthInfo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return { year, month, key: formatMonth(year, month) };
}

function resolveMonth(value) {
  if (value === undefined || value === null || value === '') return currentMonthInfo();
  return parseMonth(String(value));
}

function shiftMonth(year, month, delta) {
  const total = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12 + 12) % 12 + 1;
  return { year: nextYear, month: nextMonth, key: formatMonth(nextYear, nextMonth) };
}

function isValidColor(value) {
  return typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function normalizeCategoryName(value) {
  if (typeof value !== 'string') return { error: '类目名称不能为空' };
  const name = value.trim();
  if (!name) return { error: '类目名称不能为空' };
  if ([...name].length > 10) return { error: '类目名称最多 10 个字符' };
  return { name };
}

function parseOptionalType(value) {
  if (value === undefined || value === null || value === '') {
    return { provided: false, type: null };
  }
  const text = typeof value === 'string' ? value.trim() : '';
  if (!TYPES.includes(text)) return { provided: true, type: null };
  return { provided: true, type: text };
}

function isDuplicateCategoryName(name, excludeId, type) {
  const target = name.toLowerCase();
  return categories.some(
    (item) => item.id !== excludeId
      && item.type === type
      && String(item.name).trim().toLowerCase() === target,
  );
}

function normalizeIcon(value, fallback) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

function normalizeColor(value, fallback) {
  if (isValidColor(value)) return value.trim();
  return fallback;
}

function sortedCategories() {
  return categories
    .slice()
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

/* ---------------- 应用与中间件 ---------------- */

const app = express();
app.use(cors());
app.use(express.json());

/* ---------------- 类目接口 ---------------- */

app.get('/api/categories', wrap(async (req, res) => {
  let items = sortedCategories();
  const parsedType = parseOptionalType(req.query.type);
  if (parsedType.provided && !parsedType.type) return fail(res, 400, '类目类型不正确');
  if (parsedType.type) items = items.filter((item) => item.type === parsedType.type);
  ok(res, { items });
}));

app.post('/api/categories', wrap(async (req, res) => {
  const body = req.body ?? {};
  const parsedName = normalizeCategoryName(body.name);
  if (parsedName.error) return fail(res, 400, parsedName.error);

  const parsedType = parseOptionalType(body.type);
  if (parsedType.provided && !parsedType.type) return fail(res, 400, '类目类型不正确');
  const type = parsedType.type ?? 'expense';

  if (isDuplicateCategoryName(parsedName.name, undefined, type)) {
    return fail(res, 400, '该类目已存在');
  }

  const category = {
    id: genId('c_'),
    name: parsedName.name,
    icon: normalizeIcon(body.icon, '📦'),
    color: normalizeColor(body.color, '#8c8c8c'),
    type,
    isDefault: false,
    createdAt: new Date().toISOString(),
  };

  categories.push(category);
  await persistCategories();
  ok(res, category);
}));

app.put('/api/categories/:id', wrap(async (req, res) => {
  const category = categories.find((item) => item.id === req.params.id);
  if (!category) return fail(res, 404, '类目不存在');

  const body = req.body ?? {};
  const parsedName = normalizeCategoryName(body.name);
  if (parsedName.error) return fail(res, 400, parsedName.error);
  if (isDuplicateCategoryName(parsedName.name, category.id, category.type)) {
    return fail(res, 400, '该类目已存在');
  }

  category.name = parsedName.name;
  category.icon = normalizeIcon(body.icon, category.icon);
  category.color = normalizeColor(body.color, category.color);

  await persistCategories();
  ok(res, category);
}));

app.delete('/api/categories/:id', wrap(async (req, res) => {
  const index = categories.findIndex((item) => item.id === req.params.id);
  if (index === -1) return fail(res, 404, '类目不存在');

  const category = categories[index];
  const usedCount = records.filter((item) => item.categoryId === category.id).length;
  if (usedCount > 0) {
    return fail(res, 409, `该类目下存在 ${usedCount} 笔记录，无法删除`);
  }
  const sameTypeCount = categories.filter((item) => item.type === category.type).length;
  if (sameTypeCount - 1 <= 0) return fail(res, 400, '至少保留一个该类目');

  const [removed] = categories.splice(index, 1);
  await persistCategories();
  ok(res, { id: removed.id });
}));

/* ---------------- 账目接口 ---------------- */

function validateRecordBody(body) {
  const cents = parseAmountToCents(body.amount);
  if (cents === null) {
    return { error: '请输入大于 0 的金额（最多两位小数）' };
  }

  const categoryId = typeof body.categoryId === 'string' ? body.categoryId.trim() : '';
  const category = categories.find((item) => item.id === categoryId);
  if (!category) {
    return { error: '记账类目不存在' };
  }

  const parsedType = parseOptionalType(body.type);
  if (parsedType.provided && !parsedType.type) {
    return { error: '账目类型不正确' };
  }
  if (parsedType.type && parsedType.type !== category.type) {
    return { error: '账目类型与类目类型不一致' };
  }

  const date = typeof body.date === 'string' ? body.date.trim() : '';
  if (!isValidDateString(date)) {
    return { error: '日期格式不正确' };
  }

  const note = body.note === undefined || body.note === null ? '' : String(body.note).trim();
  if ([...note].length > 50) {
    return { error: '备注最多 50 个字符' };
  }

  return { amount: centsToYuan(cents), categoryId, type: category.type, date, note };
}

app.get('/api/records', wrap(async (req, res) => {
  const { month, from, to, categoryId, keyword } = req.query;

  let items = records.slice();

  const parsedType = parseOptionalType(req.query.type);
  if (parsedType.provided && !parsedType.type) return fail(res, 400, '账目类型不正确');
  if (parsedType.type) items = items.filter((item) => item.type === parsedType.type);

  if (month !== undefined && month !== '') {
    const parsed = parseMonth(String(month));
    if (!parsed) return fail(res, 400, '月份格式不正确');
    items = items.filter((item) => String(item.date).startsWith(parsed.key));
  } else {
    if (from !== undefined && from !== '') {
      if (!isValidDateString(String(from))) return fail(res, 400, '日期格式不正确');
      items = items.filter((item) => String(item.date) >= String(from));
    }
    if (to !== undefined && to !== '') {
      if (!isValidDateString(String(to))) return fail(res, 400, '日期格式不正确');
      items = items.filter((item) => String(item.date) <= String(to));
    }
  }

  if (categoryId !== undefined && categoryId !== '') {
    items = items.filter((item) => item.categoryId === String(categoryId));
  }

  if (keyword !== undefined && keyword !== '') {
    const needle = String(keyword).toLowerCase();
    items = items.filter((item) => String(item.note ?? '').toLowerCase().includes(needle));
  }

  items.sort((a, b) => {
    const byDate = String(b.date).localeCompare(String(a.date));
    if (byDate !== 0) return byDate;
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });

  let expenseCents = 0;
  let incomeCents = 0;
  for (const item of items) {
    if (item.type === 'income') incomeCents += amountToCents(item.amount);
    else expenseCents += amountToCents(item.amount);
  }

  ok(res, {
    items,
    total: centsToYuan(sumCents(items)),
    expenseTotal: centsToYuan(expenseCents),
    incomeTotal: centsToYuan(incomeCents),
  });
}));

app.post('/api/records', wrap(async (req, res) => {
  const body = req.body ?? {};
  const validated = validateRecordBody(body);
  if (validated.error) return fail(res, 400, validated.error);

  const record = {
    id: genId('r_'),
    amount: validated.amount,
    categoryId: validated.categoryId,
    type: validated.type,
    date: validated.date,
    note: validated.note,
    createdAt: new Date().toISOString(),
  };

  records.push(record);
  await persistRecords();
  ok(res, record);
}));

app.put('/api/records/:id', wrap(async (req, res) => {
  const record = records.find((item) => item.id === req.params.id);
  if (!record) return fail(res, 404, '账目不存在');

  const body = req.body ?? {};
  const validated = validateRecordBody(body);
  if (validated.error) return fail(res, 400, validated.error);

  record.amount = validated.amount;
  record.categoryId = validated.categoryId;
  record.type = validated.type;
  record.date = validated.date;
  record.note = validated.note;

  await persistRecords();
  ok(res, record);
}));

app.delete('/api/records/:id', wrap(async (req, res) => {
  const index = records.findIndex((item) => item.id === req.params.id);
  if (index === -1) return fail(res, 404, '账目不存在');

  const [removed] = records.splice(index, 1);
  await persistRecords();
  ok(res, { id: removed.id });
}));

/* ---------------- 统计接口 ---------------- */

app.get('/api/stats/summary', wrap(async (req, res) => {
  const parsed = resolveMonth(req.query.month);
  if (!parsed) return fail(res, 400, '月份格式不正确');
  const { year, month, key } = parsed;

  const monthRecords = records.filter((item) => String(item.date).startsWith(key));
  const expenseRecords = monthRecords.filter((item) => item.type !== 'income');
  const incomeRecords = monthRecords.filter((item) => item.type === 'income');
  const expenseCents = sumCents(expenseRecords);
  const incomeCents = sumCents(incomeRecords);

  const prev = shiftMonth(year, month, -1);
  const prevRecords = records.filter((item) => String(item.date).startsWith(prev.key));
  const prevExpenseCents = sumCents(prevRecords.filter((item) => item.type !== 'income'));
  const prevIncomeCents = sumCents(prevRecords.filter((item) => item.type === 'income'));

  const now = new Date();
  const isCurrentMonth = key === currentMonthInfo().key;
  const elapsedDays = isCurrentMonth ? now.getDate() : daysInMonth(year, month);
  const dailyAvg = elapsedDays > 0 ? centsToYuan(Math.round(expenseCents / elapsedDays)) : 0;

  const changePercent = prevExpenseCents > 0
    ? Math.round(((expenseCents - prevExpenseCents) / prevExpenseCents) * 1000) / 10
    : null;

  const expenseTotal = centsToYuan(expenseCents);
  const incomeTotal = centsToYuan(incomeCents);

  ok(res, {
    month: key,
    total: expenseTotal,
    count: expenseRecords.length,
    dailyAvg,
    prevMonth: prev.key,
    prevTotal: centsToYuan(prevExpenseCents),
    changePercent,
    expenseTotal,
    expenseCount: expenseRecords.length,
    incomeTotal,
    incomeCount: incomeRecords.length,
    balance: centsToYuan(incomeCents - expenseCents),
    prevIncomeTotal: centsToYuan(prevIncomeCents),
    prevBalance: centsToYuan(prevIncomeCents - prevExpenseCents),
  });
}));

app.get('/api/stats/by-category', wrap(async (req, res) => {
  const parsed = resolveMonth(req.query.month);
  if (!parsed) return fail(res, 400, '月份格式不正确');
  const { key } = parsed;

  const parsedType = parseOptionalType(req.query.type);
  if (parsedType.provided && !parsedType.type) return fail(res, 400, '账目类型不正确');
  const type = parsedType.type ?? 'expense';

  const monthRecords = records.filter(
    (item) => String(item.date).startsWith(key) && item.type === type,
  );
  const totalsByCategory = new Map();
  for (const record of monthRecords) {
    const cents = amountToCents(record.amount);
    totalsByCategory.set(record.categoryId, (totalsByCategory.get(record.categoryId) ?? 0) + cents);
  }

  const totalCents = sumCents(monthRecords);
  const categoryMap = new Map(categories.map((item) => [item.id, item]));

  const items = [...totalsByCategory.entries()]
    .map(([categoryId, cents]) => {
      const category = categoryMap.get(categoryId);
      return {
        categoryId,
        name: category ? category.name : '未知类目',
        icon: category ? category.icon : '📦',
        color: category ? category.color : '#8c8c8c',
        amount: centsToYuan(cents),
        percent: totalCents > 0 ? Math.round((cents / totalCents) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  ok(res, { month: key, type, total: centsToYuan(totalCents), items });
}));

app.get('/api/stats/daily', wrap(async (req, res) => {
  const parsed = resolveMonth(req.query.month);
  if (!parsed) return fail(res, 400, '月份格式不正确');
  const { year, month, key } = parsed;

  const parsedType = parseOptionalType(req.query.type);
  if (parsedType.provided && !parsedType.type) return fail(res, 400, '账目类型不正确');
  const type = parsedType.type ?? 'expense';

  const days = daysInMonth(year, month);
  const dailyCents = new Array(days + 1).fill(0);

  for (const record of records) {
    if (record.type !== type) continue;
    if (!String(record.date).startsWith(key)) continue;
    const day = Number(String(record.date).slice(8, 10));
    if (day >= 1 && day <= days) dailyCents[day] += amountToCents(record.amount);
  }

  const items = [];
  for (let day = 1; day <= days; day += 1) {
    items.push({
      date: `${key}-${pad2(day)}`,
      amount: centsToYuan(dailyCents[day]),
    });
  }

  ok(res, { month: key, type, items });
}));

app.get('/api/stats/monthly', wrap(async (req, res) => {
  const endParsed = resolveMonth(req.query.endMonth);
  if (!endParsed) return fail(res, 400, '月份格式不正确');

  let count = Number.parseInt(String(req.query.months ?? '6'), 10);
  if (!Number.isFinite(count)) count = 6;
  count = Math.min(24, Math.max(1, count));

  const items = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const target = shiftMonth(endParsed.year, endParsed.month, -offset);
    const targetRecords = records.filter((item) => String(item.date).startsWith(target.key));
    const expenseCents = sumCents(targetRecords.filter((item) => item.type !== 'income'));
    const incomeCents = sumCents(targetRecords.filter((item) => item.type === 'income'));
    const expense = centsToYuan(expenseCents);
    items.push({
      month: target.key,
      expense,
      income: centsToYuan(incomeCents),
      total: expense,
    });
  }

  ok(res, { items });
}));

/* ---------------- 健康检查 ---------------- */

app.get('/api/health', (req, res) => {
  ok(res, { status: 'ok' });
});

/* ---------------- 兜底处理 ---------------- */

app.use('/api', (req, res) => {
  fail(res, 404, '接口不存在');
});

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return fail(res, 400, '请求体格式不正确');
  }
  console.error('[server error]', err);
  return fail(res, 500, '服务器内部错误');
});

async function start() {
  await initStorage();
  const server = app.listen(PORT, () => {
    console.log(`记账应用后端已启动：http://localhost:${PORT}/api`);
    console.log(`数据目录：${DATA_DIR}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`端口 ${PORT} 已被占用，请先释放该端口，或使用 PORT 环境变量指定其它端口后重启。`);
      process.exit(1);
    }
    throw err;
  });
}

start().catch((err) => {
  console.error('服务启动失败：', err);
  process.exit(1);
});
