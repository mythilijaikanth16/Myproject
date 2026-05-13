import { useState } from "react";
import "./App.css";

const CLASS_OPTIONS = [
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
  "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
];

export default function App() {
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !studentClass) {
      setStatus({ type: "error", message: "Please fill in all fields." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("http://localhost:8000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), student_class: studentClass }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: "success", message: `✓ ${data.message}` });
        setStudents((prev) => [...prev, { name: name.trim(), student_class: studentClass }]);
        setName("");
        setStudentClass("");
      } else {
        setStatus({ type: "error", message: data.detail || "Registration failed." });
      }
    } catch (err) {
      setStatus({ type: "error", message: "Cannot reach server. Is FastAPI running?" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="bg-grid" aria-hidden="true" />

      <main className="container">
        <header className="header">
          <div className="badge">STUDENT REGISTRY</div>
          <h1 className="title">
            Enrol a<br />
            <span className="title-accent">Student</span>
          </h1>
          <p className="subtitle">Fill in the details below to register a new student.</p>
        </header>

        <div className="card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="name" className="label">Student Name</label>
              <input
                id="name"
                type="text"
                className="input"
                placeholder="e.g. Arjun Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="off"
              />
            </div>

            <div className="field">
              <label htmlFor="class" className="label">Class</label>
              <select
                id="class"
                className="input select"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                disabled={loading}
              >
                <option value="">— Select a class —</option>
                {CLASS_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {status && (
              <div className={`alert alert-${status.type}`}>
                {status.message}
              </div>
            )}

            <button type="submit" className="btn" disabled={loading}>
              {loading ? <span className="spinner" /> : "Register Student"}
            </button>
          </form>
        </div>

        {students.length > 0 && (
          <section className="list-section">
            <h2 className="list-title">Registered This Session</h2>
            <ul className="student-list">
              {students.map((s, i) => (
                <li key={i} className="student-item">
                  <span className="student-name">{s.name}</span>
                  <span className="student-class">{s.student_class}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}