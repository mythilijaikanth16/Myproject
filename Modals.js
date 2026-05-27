import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../studentApi';

export function FilePreviewModal({ fileUrl, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isImage = fileUrl.startsWith('data:image');
  const isPdf   = fileUrl.startsWith('data:application/pdf');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--preview" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <span>📄 File Preview</span>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        {isImage && <img src={fileUrl} alt="preview" className="preview-img" />}
        {isPdf   && <iframe src={fileUrl} title="PDF Preview" className="preview-iframe" />}
        {!isImage && !isPdf && (
          <div className="preview-unsupported">
            <p>⚠️ Preview not available for this file type.</p>
            <a href={fileUrl} download="file" className="btn btn--primary" style={{ marginTop: '1rem' }}>
              ⬇️ Download file
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export function EditModal({ student, token, onClose, onSaved, toast }) {
  const [name,         setName]         = useState(student.name);
  const [studentClass, setStudentClass] = useState(student.student_class);
  const [rollNo,       setRollNo]       = useState(student.roll_no || '');
  const [file,         setFile]         = useState(null);
  const [busy,         setBusy]         = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('name',          name);
      fd.append('student_class', studentClass);
      fd.append('roll_no',       rollNo);
      if (file) fd.append('file', file);
      await apiFetch(`/students/${student.id}`, { method: 'PUT', body: fd }, token);
      toast('Student updated!');
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal__title">✏️ Edit Student #{student.id}</h3>
        <form onSubmit={handleSave}>
          <div className="field">
            <label className="field__label">Full name</label>
            <input required className="field__input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">Class</label>
            <input required className="field__input" value={studentClass} onChange={e => setStudentClass(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">Roll number</label>
            <input required className="field__input" value={rollNo} onChange={e => setRollNo(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">Replace file (optional)</label>
            <input type="file" ref={fileRef} accept="image/*,.pdf,.doc,.docx"
              className="field__input field__input--file"
              onChange={e => setFile(e.target.files[0] || null)} />
          </div>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
