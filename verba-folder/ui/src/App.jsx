import 'leaflet/dist/leaflet.css'; // ← fix missing CSS
import './App.css';

import avatar from './verba.png'; 

import { useEffect, useState } from 'react';
import {
  Users, AlertTriangle, Heart, Clock, Activity, User,
  ChevronDown, ChevronUp, MapPin
} from 'lucide-react';

import MapView from './components/MapView.jsx';

const lc = (s) => (s ? s.toLowerCase() : '');

// Helper function to sort by criticality priority
const sortReportsByCriticality = (reports) => {
  // Define priority order (lower number = higher priority)
  const priorityOrder = {
    'critical': 1,
    'emergent': 2,
    'urgent': 3,
    'high': 4,
    'medium': 5,
    'low': 6,
    'non-urgent': 7
  };

  return [...reports].sort((a, b) => {
    const urgencyA = lc(a.treatment_urgency) || 'unknown';
    const urgencyB = lc(b.treatment_urgency) || 'unknown';
    
    const priorityA = priorityOrder[urgencyA] || 999; // Unknown gets lowest priority
    const priorityB = priorityOrder[urgencyB] || 999;
    
    // Primary sort: by urgency priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Secondary sort: by dispatch time (most recent first) for same urgency level
    if (a.dispatch_time && b.dispatch_time) {
      const timeA = new Date(a.dispatch_time);
      const timeB = new Date(b.dispatch_time);
      return timeB - timeA;
    }
    
    // If one has dispatch time and other doesn't, prioritize the one with time
    if (a.dispatch_time && !b.dispatch_time) return -1;
    if (!a.dispatch_time && b.dispatch_time) return 1;
    
    return 0;
  });
};

function Stat({ icon, num, label, css }) {
  return (
    <div className={`stat-card ${css}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <div className="stat-number">{num}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function Detail({ title, icon, children }) {
  return (
    <section className="detail-section">
      <h4>{icon} {title}</h4>
      {children}
    </section>
  );
}

function Row({ lbl, val }) {
  return (
    <div className="vital-item">
      <span className="vital-label">{lbl}</span>
      <span className="vital-value">{val || '—'}</span>
    </div>
  );
}

export default function App() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openSet, setOpenSet] = useState(new Set());

  /* fetch once */
  useEffect(() => {
    fetch('http://localhost:3001/api/reports')
      .then(r => r.json())
      .then(data => {
        console.log('Fetched reports:', data); // Debug fetched data
        const reportsArray = Array.isArray(data) ? data : [];
        // Sort by criticality immediately after fetching
        const sortedReports = sortReportsByCriticality(reportsArray);
        setReports(sortedReports);
      })
      .catch(error => {
        console.error('Fetch error:', error);
        setReports([]);
      })
      .finally(() => setLoading(false));
  }, []);

  /* stats */
  const stats = {
    total: reports.length,
    critical: reports.filter(r => lc(r.treatment_urgency) === 'critical').length,
    high: reports.filter(r => lc(r.treatment_urgency) === 'high').length,
    medium: reports.filter(r => lc(r.treatment_urgency) === 'medium').length,
    low: reports.filter(r => lc(r.treatment_urgency) === 'low').length,
    avgAge: reports.length
      ? Math.round(
          reports.reduce((s, r) => s + (parseInt(r.patient_age, 10) || 0), 0) /
          reports.filter(r => r.patient_age).length
        )
      : 0
  };

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner" />
      <p>Loading emergency reports…</p>
    </div>
  );

  if (!reports.length) return (
    <div className="empty-state">
      <AlertTriangle size={48} />
      <h2>No Active Reports</h2>
      <p>All clear – no emergency reports at this time.</p>
    </div>
  );

  const toggle = (i) => {
    const s = new Set(openSet);
    s.has(i) ? s.delete(i) : s.add(i);
    setOpenSet(s);
  };

  return (
    <div className="dashboard">
 <header className="dashboard-header">
  <div className="header-content">
    <div className="header-left">
      <Activity className="header-icon" />
      <h1>VERBA Dashboard</h1>
      <img src={avatar} alt="User profile" className="avatar" />
    </div>
    <span className="last-updated">Last updated {new Date().toLocaleTimeString()}</span>
  </div>
</header>


      {/* interactive map */}
      <MapView reports={reports} />

      {/* stats */}
      <div className="stats-grid">
        <Stat icon={<Users />} num={stats.total} label="Total Cases" css="total" />
        <Stat icon={<AlertTriangle />} num={stats.critical} label="Critical" css="critical" />
        <Stat icon={<User />} num={stats.avgAge} label="Avg Age" css="avg-age" />
      </div>

      {/* patient cards */}
      <div className="cards-container">
        {reports.map((r, i) => {
          const open = openSet.has(i);
          return (
            <article
              key={i}
              className={`patient-card ${lc(r.treatment_urgency) || 'unknown'} ${open ? 'expanded' : ''}`}
            >
              {/* compact header */}
              <div className="card-header" onClick={() => toggle(i)}>
                <div className="patient-info">
                  <h3>{r.patient_full_name || 'Unnamed'}</h3>
                  <div className="patient-meta">
                    {r.patient_age && <span>{r.patient_age}y</span>}
                    {r.patient_sex && <span>• {r.patient_sex}</span>}
                    {r.incident_location && (
                      <span className="location"><MapPin size={14} />{r.incident_location}</span>
                    )}
                  </div>
                </div>

                <div className="card-summary">
                  <span className={`urgency-badge ${lc(r.treatment_urgency) || 'unknown'}`}>
                    {r.treatment_urgency || 'Unknown'}
                  </span>
                  <div className="vitals-preview">
                    {r.heart_rate && <span className="vital">HR {r.heart_rate}</span>}
                    {r.oxygen_saturation && <span className="vital">O₂ {r.oxygen_saturation}%</span>}
                    {r.blood_pressure && <span className="vital">BP {r.blood_pressure}</span>}
                  </div>
                  {open ? <ChevronUp /> : <ChevronDown />}
                </div>
              </div>

              {/* expanded */}
              {open && (
                <div className="card-details">
                  <div className="details-grid">
                    <Detail title="Vital Signs" icon={<Heart size={16} />}>
                      <Row lbl="Heart Rate" val={r.heart_rate} />
                      <Row lbl="Blood Pressure" val={r.blood_pressure} />
                      <Row lbl="O₂ Saturation" val={r.oxygen_saturation} />
                      <Row lbl="Temperature" val={r.temperature} />
                      <Row lbl="Resp. Rate" val={r.respiratory_rate} />
                      <Row lbl="Consciousness" val={r.level_of_consciousness} />
                    </Detail>

                    <Detail title="Symptoms" icon={<AlertTriangle size={16} />}>
                      {r.symptoms?.length
                        ? r.symptoms.map((s, k) => <span key={k} className="symptom-text">{s}</span>)
                        : <span className="no-data">No symptoms recorded</span>}
                    </Detail>

                    <Detail title="Recommendations" icon={<Activity size={16} />}>
                      <p className="recommendation-text">
                        {r.recommendations || 'No specific recommendations.'}
                      </p>
                    </Detail>

                    {r.abbreviations?.length > 0 && (
                      <Detail title="Medical Terminology" icon={<Clock size={16} />}>
                        <div className="symptoms-list">
                          {r.abbreviations.map((ab, i) => (
                            <span key={i} className="symptom-tag">
                              {ab.abbr}{ab.category ? ` (${ab.category})` : ''}
                            </span>
                          ))}
                        </div>
                      </Detail>
                    )}

                    <Detail title="Logistics" icon={<User size={16} />}>
                      <Row lbl="EMS Officer" val={r.ems_officer_name} />
                      <Row lbl="Vehicle #" val={r.vehicle_number} />
                      <Row lbl="Dispatch Time" val={r.dispatch_time} />
                      <Row lbl="Allergies" val={r.allergies_and_reactions || 'None'} />
                      <Row lbl="History" val={r.medical_history || 'None'} />
                    </Detail>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}