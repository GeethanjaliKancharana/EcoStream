
import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getApi() {
  return axios.create({
    baseURL: API,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("ecostreamToken")}`
    }
  });
}

export default function Admin() {
  const [complaints, setComplaints] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [reasons, setReasons] = useState({});

  const statuses = [
    "Submitted",
    "Under Review",
    "Assigned",
    "In Progress",
    "Completed"
  ];

  // Load all complaints
  async function loadComplaints() {
    try {
      setLoading(true);
      setMessage("");

      const response = await getApi().get(
        "/api/complaints/admin/all"
      );

      setComplaints(response.data.complaints || []);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "Unable to load complaints. Please check administrator login."
      );
    } finally {
      setLoading(false);
    }
  }

  // Update complaint status
  async function updateStatus(id, status) {
    if (updatingId) return;

    if (status === "Rejected") {
      setMessage("Enter a rejection reason and use the Reject with Reason button.");
      return;
    }

    try {
      setUpdatingId(id);
      setMessage("");

      const response = await getApi().patch(
        `/api/complaints/${id}/status`,
        { status }
      );

      setComplaints(previous =>
        previous.map(c =>
          c._id === id
            ? { ...c, ...response.data.complaint, citizen: c.citizen }
            : c
        )
      );

      setMessage("Complaint status updated successfully.");
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "Status update failed."
      );
    } finally {
      setUpdatingId("");
    }
  }

  // Reject complaint with reason
  async function rejectComplaint(id) {
    const reason = (reasons[id] || "").trim();

    if (!reason) {
      setMessage("Please enter a reason before rejecting the complaint.");
      return;
    }

    if (updatingId) return;

    try {
      setUpdatingId(id);
      setMessage("");

      const response = await getApi().patch(
        `/api/complaints/${id}/status`,
        {
          status: "Rejected",
          rejectionReason: reason
        }
      );

      setComplaints(previous =>
        previous.map(c =>
          c._id === id
            ? { ...c, ...response.data.complaint, citizen: c.citizen }
            : c
        )
      );

      setMessage("Complaint rejected successfully.");
      setReasons(previous => ({
        ...previous,
        [id]: ""
      }));
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "Unable to reject complaint."
      );
    } finally {
      setUpdatingId("");
    }
  }

  useEffect(() => {
    loadComplaints();
  }, []);

  const total = complaints.length;
  const submitted = complaints.filter(c => c.status === "Submitted").length;
  const reviewing = complaints.filter(c => c.status === "Under Review").length;
  const completed = complaints.filter(c => c.status === "Completed").length;
  const rejected = complaints.filter(c => c.status === "Rejected").length;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.heading}>EcoStream Administrator Panel</h1>
          <p style={styles.subtitle}>
            Manage citizen complaints and monitor waste collection requests.
          </p>
        </div>

        <button
          onClick={loadComplaints}
          disabled={loading}
          style={styles.refreshButton}
        >
          {loading ? "Refreshing..." : "↻ Refresh Complaints"}
        </button>
      </header>

      {message && (
        <div style={styles.message}>
          {message}
        </div>
      )}

      {/* Dashboard statistics */}
      <div style={styles.stats}>
        <StatCard title="Total Complaints" value={total} />
        <StatCard title="Submitted" value={submitted} />
        <StatCard title="Under Review" value={reviewing} />
        <StatCard title="Completed" value={completed} />
        <StatCard title="Rejected" value={rejected} />
      </div>

      <h2 style={styles.sectionHeading}>Citizen Complaints</h2>

      {loading && complaints.length === 0 && (
        <p style={styles.info}>Loading complaints...</p>
      )}

      {!loading && complaints.length === 0 && !message && (
        <p style={styles.info}>No complaints available.</p>
      )}

      {complaints.map(c => (
        <div key={c._id} style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.complaintTitle}>{c.title}</h3>

            <span style={styles.status}>
              {c.status}
            </span>
          </div>

          <p><b>Description:</b> {c.description}</p>
          <p><b>Waste type:</b> {c.wasteType}</p>
          <p><b>Location:</b> {c.location}</p>
          <p><b>Citizen:</b> {c.citizen?.name || "Unknown"}</p>
          <p><b>Email:</b> {c.citizen?.email || "Not available"}</p>

          {c.createdAt && (
            <p>
              <b>Submitted on:</b>{" "}
              {new Date(c.createdAt).toLocaleString()}
            </p>
          )}

          {c.latitude != null && c.longitude != null && (
            <p>
              <b>GPS coordinates:</b> {c.latitude}, {c.longitude}
            </p>
          )}

          {c.photo && (
            <div style={styles.photoSection}>
              <b>Uploaded waste photo:</b>
              <img
                src={`${API}/uploads/${encodeURIComponent(c.photo)}`}
                alt="Citizen waste complaint"
                style={styles.photo}
              />
            </div>
          )}

          {c.status === "Rejected" && c.rejectionReason && (
            <p style={styles.rejection}>
              <b>Rejection reason:</b> {c.rejectionReason}
            </p>
          )}

          <div style={styles.updateSection}>
            <label style={styles.label}>
              Update Complaint Status
            </label>

            <select
              value={statuses.includes(c.status) ? c.status : "Submitted"}
              onChange={e => updateStatus(c._id, e.target.value)}
              disabled={updatingId === c._id || c.status === "Rejected"}
              style={styles.select}
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            {c.status !== "Rejected" && c.status !== "Completed" && (
              <div style={styles.rejectSection}>
                <input
                  type="text"
                  placeholder="Enter reason if rejecting"
                  value={reasons[c._id] || ""}
                  onChange={e =>
                    setReasons(previous => ({
                      ...previous,
                      [c._id]: e.target.value
                    }))
                  }
                  style={styles.input}
                  disabled={updatingId === c._id}
                />

                <button
                  onClick={() => rejectComplaint(c._id)}
                  disabled={updatingId === c._id}
                  style={styles.rejectButton}
                >
                  {updatingId === c._id
                    ? "Updating..."
                    : "Reject with Reason"}
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Dashboard statistic card
function StatCard({ title, value }) {
  return (
    <div style={styles.statCard}>
      <h3>{value}</h3>
      <p>{title}</p>
    </div>
  );
}

// Page styling
const styles = {
  page: {
    minHeight: "100vh",
    padding: "30px",
    background: "#f1f7f2",
    fontFamily: "Arial, sans-serif",
    color: "#263b2d"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px",
    marginBottom: "25px"
  },

  heading: {
    color: "#176b3a",
    marginBottom: "8px"
  },

  subtitle: {
    color: "#607568"
  },

  refreshButton: {
    background: "#176b3a",
    color: "white",
    border: "none",
    padding: "12px 18px",
    borderRadius: "8px",
    cursor: "pointer"
  },

  message: {
    background: "#e3f2e7",
    color: "#176b3a",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "20px"
  },

  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "15px",
    marginBottom: "30px"
  },

  statCard: {
    background: "white",
    padding: "18px",
    borderRadius: "12px",
    textAlign: "center",
    boxShadow: "0 2px 8px #00000012"
  },

  sectionHeading: {
    color: "#176b3a",
    marginBottom: "18px"
  },

  info: {
    background: "white",
    padding: "20px",
    borderRadius: "10px"
  },

  card: {
    background: "white",
    padding: "22px",
    marginBottom: "18px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px #00000012"
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px"
  },

  complaintTitle: {
    color: "#176b3a",
    marginTop: "0"
  },

  status: {
    background: "#e3f2e7",
    color: "#176b3a",
    padding: "7px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "bold"
  },

  photoSection: {
    marginTop: "15px"
  },

  photo: {
    display: "block",
    width: "180px",
    maxWidth: "100%",
    marginTop: "10px",
    borderRadius: "8px",
    objectFit: "cover"
  },

  rejection: {
    color: "#b71c1c",
    background: "#ffebee",
    padding: "10px",
    borderRadius: "7px"
  },

  updateSection: {
    marginTop: "20px",
    paddingTop: "15px",
    borderTop: "1px solid #e5e5e5"
  },

  label: {
    display: "block",
    fontWeight: "bold",
    marginBottom: "8px"
  },

  select: {
    display: "block",
    width: "100%",
    maxWidth: "350px",
    padding: "11px",
    border: "1px solid #ccc",
    borderRadius: "7px",
    marginBottom: "12px"
  },

  rejectSection: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px"
  },

  input: {
    padding: "11px",
    width: "100%",
    maxWidth: "350px",
    border: "1px solid #ccc",
    borderRadius: "7px"
  },

  rejectButton: {
    background: "#c62828",
    color: "white",
    border: "none",
    padding: "11px 16px",
    borderRadius: "7px",
    cursor: "pointer"
  }
};
