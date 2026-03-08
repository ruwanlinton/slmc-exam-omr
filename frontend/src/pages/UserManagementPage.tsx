import { useEffect, useState } from "react";
import { Layout } from "../components/layout/Layout";
import { adminUsersApi, type AsgardeoUser } from "../api/adminUsers";

type ModalMode = "create" | "edit" | null;

interface FormState {
  given_name: string;
  family_name: string;
  email: string;
}

const emptyForm: FormState = { given_name: "", family_name: "", email: "" };

export function UserManagementPage() {
  const [users, setUsers] = useState<AsgardeoUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<AsgardeoUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AsgardeoUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await adminUsersApi.list();
      setUsers(r.data);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setFormError("");
    setEditTarget(null);
    setModalMode("create");
  };

  const openEdit = (u: AsgardeoUser) => {
    setForm({ given_name: u.givenName, family_name: u.familyName, email: u.email });
    setFormError("");
    setEditTarget(u);
    setModalMode("edit");
  };

  const closeModal = () => { setModalMode(null); setEditTarget(null); };

  const handleSave = async () => {
    if (!form.given_name.trim() || !form.family_name.trim()) {
      setFormError("First and last name are required.");
      return;
    }
    if (modalMode === "create" && !form.email.trim()) {
      setFormError("Email is required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (modalMode === "create") {
        await adminUsersApi.create(form);
      } else if (editTarget) {
        await adminUsersApi.update(editTarget.id, {
          given_name: form.given_name,
          family_name: form.family_name,
        });
      }
      closeModal();
      await load();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setFormError(typeof detail === "string" ? detail : "Failed to save user.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminUsersApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch {
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.h1}>User Management</h1>
          <button onClick={openCreate} style={styles.addBtn}>+ Add User</button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {loading ? (
          <p style={styles.muted}>Loading...</p>
        ) : (
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email / Username</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ ...styles.td, color: "#a0aec0", textAlign: "center" }}>
                      No users found.
                    </td>
                  </tr>
                ) : users.map((u) => (
                  <tr key={u.id} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={styles.avatar}>
                        {initials(u.givenName, u.familyName)}
                      </span>
                      {u.givenName} {u.familyName}
                    </td>
                    <td style={styles.td}>{u.email || u.userName}</td>
                    <td style={styles.td}>
                      <button onClick={() => openEdit(u)} style={styles.editBtn}>Edit</button>
                      <button onClick={() => setDeleteTarget(u)} style={styles.deleteBtn}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalMode && (
        <div style={styles.overlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {modalMode === "create" ? "Add User" : "Edit User"}
            </h2>

            <label style={styles.label}>First Name</label>
            <input
              style={styles.input}
              value={form.given_name}
              onChange={(e) => setForm((f) => ({ ...f, given_name: e.target.value }))}
              placeholder="First name"
            />

            <label style={styles.label}>Last Name</label>
            <input
              style={styles.input}
              value={form.family_name}
              onChange={(e) => setForm((f) => ({ ...f, family_name: e.target.value }))}
              placeholder="Last name"
            />

            {modalMode === "create" && (
              <>
                <label style={styles.label}>Email</label>
                <input
                  style={styles.input}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="user@example.com"
                />
                <p style={styles.hint}>
                  The user will receive an email invitation to set their password.
                </p>
              </>
            )}

            {formError && <p style={styles.error}>{formError}</p>}

            <div style={styles.modalActions}>
              <button onClick={closeModal} style={styles.cancelBtn}>Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ ...styles.saveBtn, ...(saving ? styles.disabled : {}) }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div style={styles.overlay} onClick={() => setDeleteTarget(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Delete User</h2>
            <p style={styles.confirmText}>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.givenName} {deleteTarget.familyName}</strong>?
              This will remove them from Asgardeo.
            </p>
            <div style={styles.modalActions}>
              <button onClick={() => setDeleteTarget(null)} style={styles.cancelBtn}>Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ ...styles.deleteBtnModal, ...(deleting ? styles.disabled : {}) }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function initials(given: string, family: string) {
  return ((given[0] ?? "") + (family[0] ?? "")).toUpperCase();
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 860, margin: "40px auto", padding: "0 24px" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  h1: { fontSize: 22, fontWeight: 700, color: "#233654", margin: 0 },
  addBtn: {
    padding: "8px 18px",
    background: "#233654",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  card: { background: "#fff", borderRadius: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.10)", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "10px 16px", textAlign: "left" as const, fontSize: 12, fontWeight: 600, color: "#718096", background: "#f7fafc", borderBottom: "1px solid #e2e8f0" },
  tr: { borderBottom: "1px solid #f7fafc" },
  td: { padding: "12px 16px", fontSize: 13, color: "#2d3748", verticalAlign: "middle" },
  avatar: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "#b79a62",
    color: "#233654",
    fontSize: 11,
    fontWeight: 700,
    marginRight: 10,
    verticalAlign: "middle",
  },
  editBtn: { padding: "4px 12px", background: "#edf2f7", color: "#2d3748", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600, marginRight: 6 },
  deleteBtn: { padding: "4px 12px", background: "#fff5f5", color: "#c53030", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 },
  muted: { color: "#718096", fontSize: 14 },
  error: { color: "#c53030", fontSize: 13, marginBottom: 8 },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 500,
  },
  modal: {
    background: "#fff",
    borderRadius: 10,
    padding: "28px 32px",
    width: 400,
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "#233654", marginBottom: 20 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#4a5568", marginBottom: 4 },
  input: {
    display: "block",
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    fontSize: 14,
    color: "#2d3748",
    marginBottom: 14,
    boxSizing: "border-box",
  },
  hint: { fontSize: 11, color: "#a0aec0", marginTop: -8, marginBottom: 14 },
  confirmText: { fontSize: 14, color: "#2d3748", marginBottom: 20 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 },
  cancelBtn: { padding: "8px 18px", background: "#edf2f7", color: "#2d3748", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  saveBtn: { padding: "8px 18px", background: "#233654", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  deleteBtnModal: { padding: "8px 18px", background: "#c53030", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  disabled: { opacity: 0.6, cursor: "not-allowed" },
};
