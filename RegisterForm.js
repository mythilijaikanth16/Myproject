import { useState, useRef } from 'react';
import { apiFetch } from '../studentApi';

export default function RegisterForm({ token, onDone, toast }) {
  const [name,         setName]         = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [rollNo,       setRollNo]       = useState('');
  const [file,         setFile]         = useState(null);
  const [busy,         setBusy]         = useState(false);
  const fileRef = useRef();

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('name',          name.trim());
      fd.append('student_class', studentClass.trim());
      fd.append('roll_no',       rollNo.trim());
      if (file) fd.append('file', file);
      const data = await apiFetch('/register', { method: 'POST', body: fd }, token);
      toast(`${data.name} registered in ${data.student_class}!`);
      setName(''); setStudentClass(''); setRollNo(''); setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      onDone();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h2 className="panel__title">Register student</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label className="field__label">Full name</label>
            <input required className="field__input" type="text" placeholder="e.g. Priya Sharma"
              value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">Roll number</label>
            <input required className="field__input" type="text" placeholder="e.g. 24CS101"
              value={rollNo} onChange={e => setRollNo(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">Class / section</label>
            <input required className="field__input" type="text" placeholder="e.g. 10-A or CS-3rd"
              value={studentClass} onChange={e => setStudentClass(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">Upload file (optional)</label>
            <input ref={fileRef} className="field__input field__input--file" type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={e => setFile(e.target.files[0] || null)} />
          </div>
        </div>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Registering…' : '+ Register student'}
        </button>
      </form>
    </div>
  );
}
