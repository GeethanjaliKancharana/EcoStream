import Admin from "./Admin";
import { useEffect, useState } from "react";
import axios from "axios";

import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  MapPin,
  User,
  LogOut,
  Leaf,
  RefreshCw,
  Image,
  Navigation,
  Trash2
} from "lucide-react";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  useMap,
  useMapEvents
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "./App.css";

const API = import.meta.env.VITE_API_URL;

const DEFAULT_CENTER = [17.6868, 83.2185];

function getApi() {
  const token = localStorage.getItem("ecostreamToken");

  return axios.create({
    baseURL: API,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

function MapUpdater({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 16);
    }
  }, [position, map]);

  return null;
}

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    }
  });

  return null;
}

function LocationMap({ latitude, longitude, onSelect }) {
  const position =
    latitude !== null && longitude !== null
      ? [latitude, longitude]
      : null;

  return (
    <div style={{ marginTop: "15px" }}>
      <p>
        <strong>Click on the map to select the waste location.</strong>
      </p>

      <MapContainer
        center={position || DEFAULT_CENTER}
        zoom={position ? 16 : 12}
        style={{
          height: "300px",
          width: "100%",
          borderRadius: "12px",
          zIndex: 1
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater position={position} />
        <MapClickHandler onSelect={onSelect} />

        {position && (
          <CircleMarker
            center={position}
            radius={10}
            pathOptions={{
              color: "#ffffff",
              fillColor: "#16834a",
              fillOpacity: 1,
              weight: 3
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [complaints, setComplaints] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingLogin, setCheckingLogin] = useState(true);

  // Delete complaint loading state
  const [deletingId, setDeletingId] = useState(null);

  // Photo upload states
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  // GPS location states
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Complaint form states
  const [form, setForm] = useState({
    title: "",
    description: "",
    wasteType: "Household Waste",
    location: ""
  });

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  // Load user profile
  async function loadProfile() {
    try {
      const response = await getApi().get("/api/users/profile");
      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem("ecostreamToken");
      setUser(null);
    } finally {
      setCheckingLogin(false);
    }
  }

  // Load citizen complaints
  async function loadComplaints() {
    try {
      const response = await getApi().get("/api/complaints/my");
      setComplaints(response.data.complaints);
      setMessage("");
    } catch (error) {
      console.error(
        "Complaint loading error:",
        error.response?.data || error.message
      );

      setMessage(
        error.response?.data?.message ||
        "Unable to load complaints."
      );
    }
  }

  // Check existing login
  useEffect(() => {
    const token = localStorage.getItem("ecostreamToken");

    if (token) {
      loadProfile();
      loadComplaints();
    } else {
      setCheckingLogin(false);
    }
  }, []);

  // Update form fields
  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  }

  // Set selected map coordinates
  function selectLocation(lat, lng) {
    setLatitude(lat);
    setLongitude(lng);

    setForm(previous => ({
      ...previous,
      location: previous.location.trim()
        ? previous.location
        : `Selected map location (${lat.toFixed(6)}, ${lng.toFixed(6)})`
    }));

    setMessage("Map location selected successfully.");
  }

  // Detect current GPS location
  function detectLocation() {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported by this browser.");
      return;
    }

    setLocationLoading(true);
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLatitude(lat);
        setLongitude(lng);

        setForm(previous => ({
          ...previous,
          location: `GPS location (${lat.toFixed(6)}, ${lng.toFixed(6)})`
        }));

        setMessage("Your GPS location was detected successfully.");
        setLocationLoading(false);
      },
      error => {
        let errorMessage = "Unable to detect your location.";

        if (error.code === 1) {
          errorMessage =
            "Location permission denied. Allow location access in your browser.";
        } else if (error.code === 2) {
          errorMessage =
            "Your current location is unavailable. Try again.";
        } else if (error.code === 3) {
          errorMessage =
            "Location request timed out. Please try again.";
        }

        setMessage(errorMessage);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }

  // Clear selected coordinates
  function clearLocation() {
    setLatitude(null);
    setLongitude(null);

    setForm(previous => ({
      ...previous,
      location: ""
    }));

    setMessage("Selected location cleared.");
  }

  // Select and validate complaint photo
  function handlePhotoChange(e) {
    const file = e.target.files[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Please select a JPG, PNG or WebP image.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Image size must be less than 5 MB.");
      e.target.value = "";
      return;
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setMessage("");
  }

  // Remove selected photo
  function removePhoto() {
    setPhoto(null);
    setPhotoPreview("");

    const fileInput = document.getElementById("complaintPhoto");

    if (fileInput) {
      fileInput.value = "";
    }
  }

  // Submit complaint
  async function submitComplaint(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const complaintData = new FormData();

      complaintData.append("title", form.title);
      complaintData.append("description", form.description);
      complaintData.append("wasteType", form.wasteType);
      complaintData.append("location", form.location);

      if (latitude !== null && longitude !== null) {
        complaintData.append("latitude", latitude);
        complaintData.append("longitude", longitude);
      }

      if (photo) {
        complaintData.append("photo", photo);
      }

      const response = await getApi().post(
        "/api/complaints",
        complaintData
      );

      setForm({
        title: "",
        description: "",
        wasteType: "Household Waste",
        location: ""
      });

      setLatitude(null);
      setLongitude(null);
      removePhoto();

      await loadComplaints();

      setMessage(response.data.message);
      setPage("complaints");
    } catch (error) {
      console.error(
        "Complaint submission error:",
        error.response?.data || error.message
      );

      setMessage(
        error.response?.data?.message ||
        "Complaint submission failed."
      );
    } finally {
      setLoading(false);
    }
  }

  // DELETE COMPLAINT
  async function deleteComplaint(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this complaint?"
    );

    if (!confirmed) return;

    setDeletingId(id);
    setMessage("");

    try {
      const response = await getApi().delete(
        `/api/complaints/${id}`
      );

      setComplaints(previous =>
        previous.filter(c => c._id !== id)
      );

      setMessage(
        response.data.message || "Complaint deleted successfully."
      );
    } catch (error) {
      console.error(
        "Complaint deletion error:",
        error.response?.data || error.message
      );

      setMessage(
        error.response?.data?.message ||
        "Unable to delete complaint."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // Citizen login
  async function login(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const data = new FormData(e.target);

    try {
      const response = await axios.post(
        `${API}/api/auth/login`,
        {
          email: data.get("email"),
          password: data.get("password")
        }
      );

      localStorage.setItem(
        "ecostreamToken",
        response.data.token
      );

      setUser(response.data.user);
      setPage("dashboard");

      await loadComplaints();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "Login failed."
      );
    } finally {
      setLoading(false);
    }
  }

  // Logout
  function logout() {
    localStorage.removeItem("ecostreamToken");

    setUser(null);
    setComplaints([]);
    setPage("dashboard");
    setMessage("Logged out successfully.");
  }

  if (checkingLogin) {
    return (
      <div className="login-page">
        <h2>Checking your account...</h2>
      </div>
    );
  }

  // Login screen
  if (!user) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={login}>
          <Leaf size={42} color="#23864d" />

          <h1>EcoStream</h1>

          <p>Cleaner Cities. Smarter Communities.</p>

          <input
            name="email"
            type="email"
            placeholder="Email Address"
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : "Login"}
          </button>

          {message && (
            <p className="notice">{message}</p>
          )}
        </form>
      </div>
    );
  }

  // Admin Dashboard
  if (user.role === "Admin" || user.role === "Administrator") {
    return <Admin />;
  }

  // Dashboard statistics
  const submitted = complaints.length;

  const completed = complaints.filter(
    c => c.status === "Completed"
  ).length;

  const pending = submitted - completed;

  return (
    <div className="dashboard">

      {/* Sidebar */}
      <aside className="sidebar">
        <h2>
          <Leaf /> EcoStream
        </h2>

        <p className="side-label">CITIZEN PORTAL</p>

        <button
          onClick={() => {
            setPage("dashboard");
            setMessage("");
          }}
        >
          <LayoutDashboard /> Dashboard
        </button>

        <button
          onClick={() => {
            setPage("submit");
            setMessage("");
          }}
        >
          <PlusCircle /> Submit Complaint
        </button>

        <button
          onClick={() => {
            setPage("complaints");
            setMessage("");
            loadComplaints();
          }}
        >
          <ClipboardList /> My Complaints
        </button>

        <button
          onClick={() => {
            setPage("profile");
            setMessage("");
          }}
        >
          <User /> My Profile
        </button>

        <button className="logout" onClick={logout}>
          <LogOut /> Logout
        </button>
      </aside>

      {/* Main content */}
      <main className="main-content">

        {/* Header */}
        <header className="topbar">
          <div>
            <h2>Citizen Dashboard</h2>
            <p>Manage your waste complaints and reports.</p>
          </div>

          <strong>Welcome, {user.name}</strong>
        </header>

        {message && (
          <p className="notice">{message}</p>
        )}

        {/* Dashboard */}
        {page === "dashboard" && (
          <>
            <section className="welcome">
              <h2>Let's Build a Cleaner City!</h2>

              <p>
                Report waste problems and help improve
                your neighbourhood.
              </p>

              <button
                onClick={() => {
                  setPage("submit");
                  setMessage("");
                }}
              >
                Report Waste
              </button>
            </section>

            <section className="stats">
              <div>
                <h3>{submitted}</h3>
                <p>Total Complaints</p>
              </div>

              <div>
                <h3>{pending}</h3>
                <p>Pending Complaints</p>
              </div>

              <div>
                <h3>{completed}</h3>
                <p>Completed Complaints</p>
              </div>
            </section>

            <div className="section-heading">
              <h2>Recent Complaints</h2>

              <button onClick={loadComplaints}>
                <RefreshCw size={16} /> Refresh
              </button>
            </div>

            <ComplaintList
              complaints={complaints.slice(0, 5)}
              onDelete={deleteComplaint}
              deletingId={deletingId}
            />
          </>
        )}

        {/* Submit complaint */}
        {page === "submit" && (
          <section className="content-card">
            <h2>Submit a Waste Complaint</h2>

            <p>
              Provide the details of the waste problem.
            </p>

            <form
              className="complaint-form"
              onSubmit={submitComplaint}
            >
              <label>Complaint Title</label>

              <input
                name="title"
                required
                value={form.title}
                onChange={handleChange}
                placeholder="Enter complaint title"
              />

              <label>Waste Category</label>

              <select
                name="wasteType"
                value={form.wasteType}
                onChange={handleChange}
              >
                <option>Household Waste</option>
                <option>Plastic Waste</option>
                <option>Industrial Waste</option>
                <option>Medical Waste</option>
                <option>Construction Waste</option>
                <option>Other</option>
              </select>

              <label>
                <MapPin size={18} /> Waste Location
              </label>

              <input
                name="location"
                required
                value={form.location}
                onChange={handleChange}
                placeholder="Enter waste location or use GPS"
              />

              <button
                type="button"
                onClick={detectLocation}
                disabled={locationLoading}
                style={{ marginTop: "8px" }}
              >
                <Navigation size={17} />

                {locationLoading
                  ? "Detecting Location..."
                  : "Detect My Location"}
              </button>

              {latitude !== null && longitude !== null && (
                <div style={{ marginTop: "10px" }}>
                  <p>
                    <strong>Latitude:</strong> {latitude.toFixed(6)}
                  </p>

                  <p>
                    <strong>Longitude:</strong> {longitude.toFixed(6)}
                  </p>

                  <button
                    type="button"
                    onClick={clearLocation}
                  >
                    Clear Selected Location
                  </button>
                </div>
              )}

              <LocationMap
                latitude={latitude}
                longitude={longitude}
                onSelect={selectLocation}
              />

              <p className="photo-help">
                GPS coordinates are optional. You can also
                select a point directly on the map.
              </p>

              <label>Description</label>

              <textarea
                name="description"
                required
                rows="5"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the waste problem"
              />

              <label>
                <Image size={18} /> Upload Waste Photo
              </label>

              <input
                id="complaintPhoto"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
              />

              <p className="photo-help">
                Accepted formats: JPG, PNG and WebP.
                Maximum size: 5 MB.
              </p>

              {photoPreview && (
                <div className="photo-preview">
                  <p>Selected Photo Preview:</p>

                  <img
                    src={photoPreview}
                    alt="Selected waste"
                    style={{
                      width: "220px",
                      maxHeight: "180px",
                      objectFit: "contain",
                      borderRadius: "10px"
                    }}
                  />

                  <button
                    type="button"
                    onClick={removePhoto}
                  >
                    Remove Photo
                  </button>
                </div>
              )}

              <button type="submit" disabled={loading}>
                {loading
                  ? "Submitting..."
                  : "Submit Complaint"}
              </button>
            </form>
          </section>
        )}

        {/* Complaint history */}
        {page === "complaints" && (
          <section className="content-card">
            <div className="section-heading">
              <h2>My Complaints</h2>

              <button onClick={loadComplaints}>
                Refresh
              </button>
            </div>

            <ComplaintList
              complaints={complaints}
              onDelete={deleteComplaint}
              deletingId={deletingId}
            />
          </section>
        )}

        {/* Profile */}
        {page === "profile" && (
          <section className="content-card">
            <h2>My Profile</h2>

            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Phone:</strong> {user.phone}</p>
            <p><strong>Role:</strong> {user.role}</p>
          </section>
        )}

      </main>
    </div>
  );
}

// Complaint list with Delete Complaint option
function ComplaintList({ complaints, onDelete, deletingId }) {
  if (complaints.length === 0) {
    return <p>No complaints submitted yet.</p>;
  }

  return (
    <div className="complaint-list">
      {complaints.map(c => (
        <article
          className="complaint-item"
          key={c._id}
        >
          <div>
            <h3>{c.title}</h3>

            {c.photo && (
              <img
                src={`${API}/uploads/${encodeURIComponent(c.photo)}`}
                alt="Complaint"
                style={{
                  width: "150px",
                  maxHeight: "120px",
                  objectFit: "contain",
                  borderRadius: "8px",
                  marginTop: "10px"
                }}
              />
            )}

            <p>
              <MapPin size={14} /> {c.location}
            </p>

            {c.latitude != null && c.longitude != null && (
              <small>
                GPS: {Number(c.latitude).toFixed(6)},{" "}
                {Number(c.longitude).toFixed(6)}
              </small>
            )}

            <br />

            <small>
              {c.wasteType} ·{" "}
              {new Date(c.createdAt).toLocaleDateString()}
            </small>
          </div>

          <div>
            <span className="status">
              {c.status}
            </span>

            {c.status === "Submitted" && (
              <button
                type="button"
                onClick={() => onDelete(c._id)}
                disabled={deletingId === c._id}
                style={{
                  display: "block",
                  marginTop: "12px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  padding: "9px 12px",
                  cursor: "pointer"
                }}
              >
                <Trash2 size={15} />
                {deletingId === c._id
                  ? "Deleting..."
                  : "Delete Complaint"}
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export default App;
