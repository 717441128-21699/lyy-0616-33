import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter } from 'lucide-react';
import { fetchOkrs, createOkr } from '@/api';
import type { OKR } from '@/types';
import ProgressBar from '@/components/ProgressBar';
import Modal from '@/components/Modal';

const LB: Record<string, string> = { company: 'bg-blue-100 text-blue-700', department: 'bg-purple-100 text-purple-700', individual: 'bg-teal-100 text-teal-700' };
const LL: Record<string, string> = { company: '公司级', department: '部门级', individual: '个人级' };
const SB: Record<string, string> = { draft: 'bg-gray-100 text-gray-600', active: 'bg-green-100 text-green-700', completed: 'bg-blue-100 text-blue-700', archived: 'bg-yellow-100 text-yellow-700' };
const SL: Record<string, string> = { draft: '草稿', active: '进行中', completed: '已完成', archived: '已归档' };
const USERS = [{ id: 'user-1', name: '张伟' }, { id: 'user-2', name: '李明' }, { id: 'user-3', name: '王芳' }, { id: 'user-4', name: '刘洋' }, { id: 'user-5', name: '陈静' }];
const TABS = [{ key: '', label: '全部' }, { key: 'company', label: '公司级' }, { key: 'department', label: '部门级' }, { key: 'individual', label: '个人级' }];

interface Form { title: string; description: string; level: OKR['level']; quarter: string; year: number; parent_okr_id: string; owner_id: string }
const emptyForm: Form = { title: '', description: '', level: 'individual', quarter: 'Q1', year: 2026, parent_okr_id: '', owner_id: '' };

export default function OkrList() {
  const navigate = useNavigate();
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [level, setLevel] = useState('');
  const [quarter, setQuarter] = useState('');
  const [year, setYear] = useState('2026');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [parentOkrs, setParentOkrs] = useState<OKR[]>([]);

  const loadOkrs = useCallback(async () => {
    const params: Record<string, string> = {};
    if (level) params.level = level;
    if (quarter) params.quarter = quarter;
    if (year) params.year = year;
    setOkrs(await fetchOkrs(params));
  }, [level, quarter, year]);

  useEffect(() => { loadOkrs(); }, [loadOkrs]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    await createOkr({ title: form.title, description: form.description, level: form.level, quarter: form.quarter, year: form.year, parent_okr_id: form.parent_okr_id || null, owner_id: form.owner_id });
    setShowCreate(false);
    setForm(emptyForm);
    loadOkrs();
  };

  const openCreate = async () => {
    const pl = form.level === 'individual' ? 'department' : form.level === 'department' ? 'company' : '';
    if (pl) setParentOkrs(await fetchOkrs({ level: pl }));
    else setParentOkrs([]);
    setShowCreate(true);
  };

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
  const selectCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setLevel(t.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${level === t.key ? 'bg-brand-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg text-sm font-medium hover:bg-accent-600 transition-colors"><Plus className="w-4 h-4" />创建OKR</button>
      </div>

      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className={selectCls}>
          <option value="">全部季度</option><option value="Q1">Q1</option><option value="Q2">Q2</option><option value="Q3">Q3</option><option value="Q4">Q4</option>
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls}>
          <option value="2025">2025</option><option value="2026">2026</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {okrs.map((okr) => (
          <div key={okr.id} onClick={() => navigate(`/okrs/${okr.id}`)}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-brand-200 transition-all">
            <div className="flex items-start justify-between mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LB[okr.level]}`}>{LL[okr.level]}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SB[okr.status]}`}>{SL[okr.status]}</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{okr.title}</h3>
            <p className="text-xs text-gray-500 mb-3">{okr.owner_name || '未指定'} · {okr.quarter} {okr.year}</p>
            <ProgressBar progress={okr.overall_progress} />
            <p className="text-xs text-gray-400 mt-2">创建于 {new Date(okr.created_at).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
      {okrs.length === 0 && <div className="text-center py-12 text-gray-400">暂无OKR数据</div>}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="创建OKR">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">标题</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="输入OKR标题" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">描述</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} rows={3} placeholder="输入OKR描述" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">级别</label><select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as OKR['level'] })} className={selectCls}><option value="company">公司级</option><option value="department">部门级</option><option value="individual">个人级</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">负责人</label><select value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} className={selectCls}><option value="">选择负责人</option>{USERS.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">季度</label><select value={form.quarter} onChange={(e) => setForm({ ...form, quarter: e.target.value })} className={selectCls}><option value="Q1">Q1</option><option value="Q2">Q2</option><option value="Q3">Q3</option><option value="Q4">Q4</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">年份</label><input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
          </div>
          {parentOkrs.length > 0 && (
            <div><label className="block text-sm font-medium text-gray-700 mb-1">上级OKR</label><select value={form.parent_okr_id} onChange={(e) => setForm({ ...form, parent_okr_id: e.target.value })} className={selectCls}><option value="">无</option>{parentOkrs.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}</select></div>
          )}
          <button onClick={handleCreate} disabled={!form.title.trim()} className="w-full py-2 bg-brand-800 text-white rounded-lg text-sm font-medium hover:bg-brand-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">创建</button>
        </div>
      </Modal>
    </div>
  );
}
