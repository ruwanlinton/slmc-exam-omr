import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { resultsApi, type Result, type ResultSummary, type ResultDetail, type QuestionDetail } from "../api/results";
import { ScoreChart } from "../components/results/ScoreChart";

export function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [results, setResults] = useState<Result[]>([]);
  const [summary, setSummary] = useState<ResultSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [passMark, setPassMark] = useState(50);
  const [detail, setDetail] = useState<ResultDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = async () => {
    if (!id) return;
    const [resData, sumData] = await Promise.all([
      resultsApi.list(id),
      resultsApi.summary(id, passMark),
    ]);
    setResults(resData.data);
    setSummary(sumData.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);
  useEffect(() => {
    if (!loading) resultsApi.summary(id!, passMark).then((r) => setSummary(r.data));
  }, [passMark]);

  const openDetail = async (indexNumber: string) => {
    if (!id) return;
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await resultsApi.detail(id, indexNumber);
      setDetail(res.data);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = (format: "csv" | "xlsx") => {
    if (!id) return;
    window.location.href = resultsApi.exportUrl(id, format);
  };

  return (
    <Layout>
      <div style={styles.header}>
        <h1 style={styles.h1}>Results</h1>
        <div style={styles.exportBtns}>
          <button onClick={() => handleExport("csv")} style={styles.exportBtn}>Export CSV</button>
          <button onClick={() => handleExport("xlsx")} style={styles.exportBtn}>Export XLSX</button>
        </div>
      </div>

      {(detail || detailLoading) && (
        <DetailModal
          detail={detail}
          loading={detailLoading}
          passMark={passMark}
          onClose={() => setDetail(null)}
        />
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {summary && (
            <div style={styles.summaryGrid}>
              <SummaryCard label="Total Candidates" value={summary.total_candidates} />
              <SummaryCard label="Mean Score" value={`${summary.mean_percentage.toFixed(1)}%`} />
              <SummaryCard label="Highest" value={`${summary.highest_score.toFixed(1)}%`} />
              <SummaryCard label="Lowest" value={`${summary.lowest_score.toFixed(1)}%`} />
              <SummaryCard
                label="Pass Rate"
                value={`${summary.pass_percentage.toFixed(1)}%`}
                subtext={`${summary.pass_count} passed`}
              />
            </div>
          )}

          <div style={styles.passMarkRow}>
            <label style={styles.passMarkLabel}>
              Pass mark: {passMark}%
              <input
                type="range"
                min={0}
                max={100}
                value={passMark}
                onChange={(e) => setPassMark(Number(e.target.value))}
                style={styles.slider}
              />
            </label>
          </div>

          {summary && summary.distribution.length > 0 && (
            <div style={styles.chartSection}>
              <h2 style={styles.h2}>Score Distribution</h2>
              <ScoreChart distribution={summary.distribution} />
            </div>
          )}

          <div style={styles.tableSection}>
            <h2 style={styles.h2}>All Results ({results.length})</h2>
            {results.length === 0 ? (
              <p style={styles.empty}>No results yet.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Index Number</th>
                    <th style={styles.th}>Score</th>
                    <th style={styles.th}>Percentage</th>
                    <th style={styles.th}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id} style={styles.tr}>
                      <td style={styles.td}>
                        <button onClick={() => openDetail(r.index_number)} style={styles.indexBtn}>
                          {r.index_number}
                        </button>
                      </td>
                      <td style={styles.td}>{r.score.toFixed(1)}</td>
                      <td style={styles.td}>{r.percentage.toFixed(1)}%</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, ...(r.percentage >= passMark ? styles.pass : styles.fail) }}>
                          {r.percentage >= passMark ? "PASS" : "FAIL"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}

function DetailModal({
  detail,
  loading,
  passMark,
  onClose,
}: {
  detail: ResultDetail | null;
  loading: boolean;
  passMark: number;
  onClose: () => void;
}) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            {detail && (
              <>
                <span style={styles.modalTitle}>Index #{detail.index_number}</span>
                <span style={styles.modalScore}>
                  {detail.score.toFixed(1)} pts &middot; {detail.percentage.toFixed(1)}%
                </span>
                <span style={{ ...styles.badge, ...(detail.percentage >= passMark ? styles.pass : styles.fail), marginLeft: 10 }}>
                  {detail.percentage >= passMark ? "PASS" : "FAIL"}
                </span>
              </>
            )}
          </div>
          <button onClick={onClose} style={styles.closeBtn}>&times;</button>
        </div>

        {loading && <p style={{ padding: "24px", color: "#718096" }}>Loading...</p>}

        {detail && (
          <div style={styles.modalBody}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Q#</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Marked</th>
                  <th style={styles.th}>Correct</th>
                  <th style={styles.th}>Score</th>
                  <th style={styles.th}>Result</th>
                </tr>
              </thead>
              <tbody>
                {detail.questions.map((q) => (
                  <QuestionRow key={q.question_number} q={q} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionRow({ q }: { q: QuestionDetail }) {
  const OPTIONS = ["A", "B", "C", "D", "E"];
  const isCorrect = q.question_type === "type1"
    ? q.score === 1.0
    : q.score >= 1.0;

  if (q.question_type === "type1") {
    const marked = q.marked as string | null;
    const correct = q.correct as string | null;
    return (
      <tr style={styles.tr}>
        <td style={styles.td}>{q.question_number}</td>
        <td style={styles.td}><span style={styles.typeBadge}>T1</span></td>
        <td style={styles.td}>
          <span style={marked ? { ...styles.optionBadge, ...(marked === correct ? styles.optCorrect : styles.optWrong) } : styles.optionNone}>
            {marked ?? "—"}
          </span>
        </td>
        <td style={styles.td}>
          <span style={styles.optionBadge}>{correct ?? "—"}</span>
        </td>
        <td style={styles.td}>{q.score.toFixed(1)}</td>
        <td style={styles.td}>
          <span style={isCorrect ? styles.tickCorrect : styles.tickWrong}>{isCorrect ? "✓" : "✗"}</span>
        </td>
      </tr>
    );
  }

  // type2 — one sub-row per sub-option
  const marked = (q.marked ?? {}) as Record<string, boolean>;
  const correct = (q.correct ?? {}) as Record<string, boolean>;
  const maxScore = 1.0;

  return (
    <tr style={styles.tr}>
      <td style={styles.td}>{q.question_number}</td>
      <td style={styles.td}><span style={{ ...styles.typeBadge, background: "#ebf4ff", color: "#2b6cb0" }}>T2</span></td>
      <td colSpan={3} style={styles.td}>
        <div style={styles.tfGrid}>
          {OPTIONS.map((opt) => {
            const mv = marked[opt];
            const cv = correct[opt];
            const subCorrect = mv === cv;
            return (
              <div key={opt} style={styles.tfCell}>
                <span style={styles.tfLabel}>{opt}</span>
                <span style={{ ...styles.tfVal, ...(subCorrect ? styles.tfCorrect : styles.tfWrong) }}>
                  {mv === undefined ? "—" : mv ? "T" : "F"}
                </span>
                <span style={styles.tfExpected}>{cv === undefined ? "" : cv ? "T" : "F"}</span>
              </div>
            );
          })}
        </div>
      </td>
      <td style={styles.td}>
        <span style={{ fontWeight: 600, color: q.score >= maxScore ? "#276749" : q.score > 0 ? "#744210" : "#742a2a" }}>
          {q.score.toFixed(2)} / {maxScore.toFixed(1)}
        </span>
      </td>
    </tr>
  );
}

function SummaryCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryVal}>{value}</div>
      <div style={styles.summaryLabel}>{label}</div>
      {subtext && <div style={styles.summarySubtext}>{subtext}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  h1: { fontSize: 22, fontWeight: 700, color: "#1a365d" },
  h2: { fontSize: 16, fontWeight: 700, color: "#2d3748", marginBottom: 16 },
  exportBtns: { display: "flex", gap: 8 },
  exportBtn: { padding: "8px 16px", background: "#edf2f7", color: "#2d3748", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 },
  summaryCard: { background: "#fff", borderRadius: 8, padding: "16px 20px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  summaryVal: { fontSize: 24, fontWeight: 700, color: "#2b6cb0" },
  summaryLabel: { fontSize: 11, color: "#718096", marginTop: 4 },
  summarySubtext: { fontSize: 11, color: "#a0aec0", marginTop: 2 },
  passMarkRow: { background: "#fff", borderRadius: 8, padding: "16px 24px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  passMarkLabel: { display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 600, color: "#2d3748" },
  slider: { flex: 1, maxWidth: 300 },
  chartSection: { background: "#fff", borderRadius: 8, padding: "20px 24px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  tableSection: { background: "#fff", borderRadius: 8, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  empty: { color: "#718096", fontSize: 14 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#718096", borderBottom: "1px solid #e2e8f0" },
  tr: { borderBottom: "1px solid #f7fafc" },
  td: { padding: "10px 12px", fontSize: 13 },
  badge: { padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700 },
  pass: { background: "#c6f6d5", color: "#276749" },
  fail: { background: "#fed7d7", color: "#742a2a" },
  indexBtn: { background: "none", border: "none", color: "#2b6cb0", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0, textDecoration: "underline" },

  // Modal
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 60, overflowY: "auto" },
  modal: { background: "#fff", borderRadius: 10, width: "90%", maxWidth: 780, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", maxHeight: "80vh" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #e2e8f0" },
  modalTitle: { fontSize: 16, fontWeight: 700, color: "#1a365d", marginRight: 12 },
  modalScore: { fontSize: 14, color: "#4a5568" },
  closeBtn: { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#718096", lineHeight: 1 },
  modalBody: { overflowY: "auto" as const, padding: "0 24px 24px" },

  // Question rows
  typeBadge: { padding: "1px 7px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "#fefcbf", color: "#744210" },
  optionBadge: { padding: "2px 10px", borderRadius: 4, fontSize: 13, fontWeight: 700, background: "#edf2f7", color: "#2d3748" },
  optCorrect: { background: "#c6f6d5", color: "#276749" },
  optWrong: { background: "#fed7d7", color: "#742a2a" },
  optionNone: { color: "#a0aec0", fontSize: 13 },
  tickCorrect: { color: "#276749", fontWeight: 700, fontSize: 16 },
  tickWrong: { color: "#742a2a", fontWeight: 700, fontSize: 16 },

  // Type2 sub-option grid
  tfGrid: { display: "flex", gap: 8 },
  tfCell: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 2, minWidth: 30 },
  tfLabel: { fontSize: 11, fontWeight: 700, color: "#718096" },
  tfVal: { fontSize: 12, fontWeight: 700, padding: "1px 6px", borderRadius: 4 },
  tfCorrect: { background: "#c6f6d5", color: "#276749" },
  tfWrong: { background: "#fed7d7", color: "#742a2a" },
  tfExpected: { fontSize: 10, color: "#a0aec0" },
};
