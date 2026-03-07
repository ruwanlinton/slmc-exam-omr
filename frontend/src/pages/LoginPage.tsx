import { useAuthContext } from "@asgardeo/auth-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function LoginPage() {
  const { state, signIn } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (state.isAuthenticated) navigate("/");
  }, [state.isAuthenticated, navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img
          src="https://slmc.gov.lk/images/SLMClogonew2025.png"
          alt="SLMC Logo"
          style={styles.logo}
        />
        <h1 style={styles.title}>Sri Lanka Medical Council</h1>
        <div style={styles.divider} />
        <h2 style={styles.subtitle}>OMR Exam Management System</h2>
        <p style={styles.description}>
          Manage MCQ licensing exams, generate answer sheets, and process OMR results.
        </p>
        <button onClick={() => signIn()} style={styles.signInBtn}>
          Sign in with Asgardeo
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "#233654",
    fontFamily: "Roboto, sans-serif",
  },
  card: {
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
    padding: "48px 44px",
    maxWidth: 440,
    width: "100%",
    textAlign: "center",
    borderTop: "4px solid #b79a62",
  },
  logo: { height: 72, width: "auto", objectFit: "contain", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 700, color: "#233654", marginBottom: 0 },
  divider: { width: 48, height: 3, background: "#b79a62", margin: "12px auto" },
  subtitle: { fontSize: 15, fontWeight: 500, color: "#4a5568", marginBottom: 12 },
  description: { fontSize: 13, color: "#718096", marginBottom: 32, lineHeight: 1.6 },
  signInBtn: {
    padding: "12px 32px",
    background: "#ba3c3c",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
    letterSpacing: 0.3,
  },
};
