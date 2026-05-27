import { useState, useEffect, useCallback } from 'react';
import { apiFetch, formatDate } from '../studentApi';
import RegisterForm from './RegisterForm';
import { EditModal, FilePreviewModal } from './Modals';

export default function StudentsTable({ token, toast }) {
  const [students,   setStudents]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [editing,    setEditing]    = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [tab,        setTab]        = useState('list');
  const [search,     setSearch]     = useState('');
  const [sortOrder,  setSortOrder]  = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiFetch('/students', {}, token);
      setStudents(list);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/students/${id}`, { method: 'DELETE' }, token);
      toast('Student deleted.');
      fetchAll();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  const display = (() => {
    let rows = [...students];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.roll_no || '').toLowerCase().includes(q)
      );
    }
    if (sortOrder === 'asc')  rows.sort((a, b) => a.name.localeCompare(b.name));
    if (sortOrder === 'desc') rows.sort((a, b) => b.name.localeCompare(a.name));
    return rows;
  })();

  return (
    <div className="dashboard">
      <div className="tabs">
        {['list', 'register'].map(t => (
          <button key={t} className={`tab${tab === t ? ' tab--active' : ''}`} onClick={() => setTab(t)}>
            {t === 'list' ? 'Students' : '+ Register'}
          </button>
        ))}
        <div className="tabs__spacer" />
        <button className="btn btn--ghost btn--sm" onClick={fetchAll}>↻ Refresh</button>
      </div>

      {tab === 'register' && (
        <RegisterForm token={token} toast={toast} onDone={() => { fetchAll(); setTab('list'); }} />
      )}

      {tab === 'list' && (
        <div className="panel">
          <div className="table-toolbar">
            <div className="search-wrap">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Search by name or roll number…"
                className="field__input search-input" />
              {search && (
                <button className="search-clear" onClick={() => setSearch('')}>✕</button>
              )}
            </div>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}
              className="field__input sort-select">
              <option value="">Sort: Default</option>
              <option value="asc">Name A → Z</option>
              <option value="desc">Name Z → A</option>
            </select>
          </div>

          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : display.length === 0 ? (
            <div className="empty-state">{search ? 'No students match your search.' : 'No students found.'}</div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="th--id">#</th>
                    <th>Name</th>
                    <th>Roll no</th>
                    <th>Class</th>
                    <th>File</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {display.map(s => (
                    <tr key={s.id} className="data-table__row">
                      <td className="td--id">{s.id}</td>
                      <td className="td--name">{s.name}</td>
                      <td><span className="badge badge--roll">{s.roll_no}</span></td>
                      <td><span className="badge badge--class">{s.student_class}</span></td>
                      <td>
                        {s.file_url
                          ? <button className="btn btn--ghost btn--sm" onClick={() => setPreviewUrl(s.file_url)}>📄 View</button>
                          : <span className="td--empty">—</span>}
                      </td>
                      <td className="td--date">{formatDate(s.registered_at)}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn--icon btn--ghost" onClick={() => { console.log('student:', s);setEditing(s)}}>✏️</button>
                          <button className="btn btn--icon btn--danger" onClick={() => handleDelete(s.id, s.name)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {previewUrl && <FilePreviewModal fileUrl={previewUrl} onClose={() => setPreviewUrl(null)} />}
      {editing    && <EditModal student={editing} token={token} toast={toast}
                       onClose={() => setEditing(null)}
                       onSaved={() => { setEditing(null); fetchAll(); }} />}
    </div>
  );
}
