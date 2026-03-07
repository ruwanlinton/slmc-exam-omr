import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { examsApi, type Exam, type Question, type AnswerKey } from "../api/exams";

export function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      examsApi.get(id),
      examsApi.listQuestions(id),
      examsApi.getAnswerKey(id),
    ]).then(([examRes, questionsRes, akRes]) => {
      setExam(examRes.data);
      setEditTitle(examRes.data.title);
      setEditStatus(examRes.data.status);
      setQuestions(questionsRes.data);
      setAnswerKeys(akRes.data);
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    if (!id || !exam) return;
    const res = await examsApi.update(id, { title: editTitle, status: editStatus });
    setExam(res.data);
    setEditing(false);
  };

  const handleAnswerKeyChange = (qId: string, field: "correct_option" | "sub_options", value: string | Record<string, boolean>) => {
    setAnswerKeys((prev) => {
      const existing = prev.find((ak) => ak.question_id === qId);
      if (existing) {
        return prev.map((ak) => ak.question_id === qId ? { ...ak, [field]: value } : ak);
      }
      return [...prev, { id: "", question_id: qId, correct_option: null, sub_options: null, [field]: value }];
    });
  };

  const handleSaveAnswerKey = async () => {
    if (!id) return;
    const payload = answerKeys
      .filter((ak) => ak.question_id)
      .map((ak) => ({
        question_id: ak.question_id,
        correct_option: ak.correct_option ?? undefined,
        sub_options: ak.sub_options ?? undefined,
      }));
    const res = await examsApi.upsertAnswerKey(id, payload);
    setAnswerKeys(res.data);
    alert("Answer key saved.");
  };

  if (loading) return <Layout><p>Loading...</p></Layout>;
  if (!exam) return <Layout><p>Exam not found.</p></Layout>;

  const type1 = questions.filter((q) => q.question_type === "type1");
  const type2 = questions.filter((q) => q.question_type === "type2");

  const answerKeyComplete = questions.length > 0 && questions.every((q) => {
    const ak = answerKeys.find((a) => a.question_id === q.id);
    if (!ak) return false;
    if (q.question_type === "type1") return !!ak.correct_option;
    // type2: all 5 sub-options must be set (true or false, not null/undefined)
    const opts = ak.sub_options;
    return !!opts && ["A", "B", "C", "D", "E"].every((o) => opts[o] === true || opts[o] === false);
  });

  return (
    <Layout>
      <div style={styles.header}>
        {editing ? (
          <div style={styles.editRow}>
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={styles.titleInput} />
            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={styles.select}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
            <button onClick={handleSave} style={styles.saveBtn}>Save</button>
            <button onClick={() => setEditing(false)} style={styles.cancelBtn}>Cancel</button>
          </div>
        ) : (
          <>
            <h1 style={styles.h1}>{exam.title}</h1>
            <button onClick={() => setEditing(true)} style={styles.editBtn}>Edit</button>
          </>
        )}
      </div>

      <div style={styles.meta}>
        <MetaItem label="Status" value={exam.status} />
        <MetaItem label="Questions" value={String(exam.total_questions)} />
        <MetaItem label="Date" value={exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : "—"} />
      </div>

      {!answerKeyComplete && questions.length > 0 && (
        <div style={styles.answerKeyWarning}>
          Answer key is incomplete — fill all questions in the Answer Key section before uploading submissions or viewing results.
        </div>
      )}

      <div style={styles.quickLinks}>
        <Link to={`/exams/${id}/sheets`} style={styles.qBtn}>Generate Sheets</Link>
        <QuickLink to={`/exams/${id}/upload`} enabled={answerKeyComplete}>Upload Submissions</QuickLink>
        <QuickLink to={`/exams/${id}/submissions`} enabled={answerKeyComplete}>View Submissions</QuickLink>
        <QuickLink to={`/exams/${id}/results`} enabled={answerKeyComplete}>Results</QuickLink>
      </div>

      <div style={styles.section}>
        <h2 style={styles.h2}>Questions ({questions.length})</h2>
        <p style={styles.hint}>
          Question type: {type1.length > 0 ? "Type 1 — Single Best Answer" : "Type 2 — Extended True/False"}
        </p>
        {questions.length === 0 && (
          <Link to={`/exams/new`} style={styles.link}>No questions yet — recreate with questions.</Link>
        )}
      </div>

      {questions.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.h2}>Answer Key</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Q#</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Answer</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => {
                  const ak = answerKeys.find((a) => a.question_id === q.id);
                  return (
                    <tr key={q.id} style={styles.tr}>
                      <td style={styles.td}>{q.question_number}</td>
                      <td style={styles.td}>{q.question_type}</td>
                      <td style={styles.td}>
                        {q.question_type === "type1" ? (
                          <select
                            value={ak?.correct_option || ""}
                            onChange={(e) => handleAnswerKeyChange(q.id, "correct_option", e.target.value)}
                            style={styles.akSelect}
                          >
                            <option value="">— select —</option>
                            {["A", "B", "C", "D", "E"].map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        ) : (
                          <div style={styles.t2row}>
                            {["A", "B", "C", "D", "E"].map((opt) => (
                              <label key={opt} style={styles.t2label}>
                                {opt}:
                                <select
                                  value={ak?.sub_options?.[opt] === true ? "T" : ak?.sub_options?.[opt] === false ? "F" : ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "T" ? true : e.target.value === "F" ? false : null;
                                    const updated = { ...(ak?.sub_options || {}), [opt]: val };
                                    handleAnswerKeyChange(q.id, "sub_options", updated as Record<string, boolean>);
                                  }}
                                  style={styles.t2Select}
                                >
                                  <option value="">—</option>
                                  <option value="T">T</option>
                                  <option value="F">F</option>
                                </select>
                              </label>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button onClick={handleSaveAnswerKey} style={styles.saveAkBtn}>Save Answer Key</button>
        </div>
      )}
    </Layout>
  );
}

function QuickLink({ to, enabled, children }: { to: string; enabled: boolean; children: React.ReactNode }) {
  if (enabled) return <Link to={to} style={styles.qBtn}>{children}</Link>;
  return <span style={styles.qBtnDisabled} title="Complete the answer key first">{children}</span>;
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 12, color: "#718096" }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#2d3748" }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  h1: { fontSize: 22, fontWeight: 700, color: "#233654" },
  h2: { fontSize: 16, fontWeight: 700, color: "#2d3748", marginBottom: 8 },
  editRow: { display: "flex", alignItems: "center", gap: 8, flex: 1 },
  titleInput: { flex: 1, padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 16 },
  select: { padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 14 },
  saveBtn: { padding: "6px 16px", background: "#ba3c3c", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  cancelBtn: { padding: "6px 16px", background: "#e8e0d0", color: "#2d3748", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  editBtn: { padding: "6px 16px", background: "#edf2f7", color: "#2d3748", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  meta: { display: "flex", gap: 32, background: "#fff", borderRadius: 8, padding: "16px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  answerKeyWarning: { background: "#fffbeb", border: "1px solid #f6d860", color: "#744210", borderRadius: 6, padding: "10px 16px", fontSize: 13, marginBottom: 16 },
  quickLinks: { display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" },
  qBtn: { padding: "8px 16px", background: "#f5f0e8", color: "#ba3c3c", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600 },
  qBtnDisabled: { padding: "8px 16px", background: "#f7fafc", color: "#a0aec0", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "not-allowed" },
  section: { background: "#fff", borderRadius: 8, padding: 24, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  hint: { fontSize: 13, color: "#718096", marginBottom: 12 },
  link: { color: "#ba3c3c" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#718096", borderBottom: "1px solid #e2e8f0" },
  tr: { borderBottom: "1px solid #f7fafc" },
  td: { padding: "8px 12px", fontSize: 13 },
  akSelect: { padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 13 },
  t2row: { display: "flex", gap: 8, flexWrap: "wrap" },
  t2label: { display: "flex", alignItems: "center", gap: 4, fontSize: 12 },
  t2Select: { padding: "2px 6px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 12 },
  saveAkBtn: { marginTop: 16, padding: "8px 20px", background: "#ba3c3c", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 },
};
