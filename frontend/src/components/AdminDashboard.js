import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config';
import '../styles/AdminDashboard.css';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('statistics');
  const [users, setUsers] = useState([]);
  const [presentations, setPresentations] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const adminKey = sessionStorage.getItem('adminKey');

  useEffect(() => {
    if (!adminKey) {
      navigate('/admin');
      return;
    }

    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'presentations') {
      fetchPresentations();
    } else if (activeTab === 'statistics') {
      fetchStatistics();
    }
  }, [activeTab, adminKey, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${config.API_BASE_URL}/admin/users`, {
        headers: {
          'X-Admin-Key': adminKey,
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setUsers(data.users);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchPresentations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${config.API_BASE_URL}/admin/presentations`, {
        headers: {
          'X-Admin-Key': adminKey,
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setPresentations(data.presentations);
      } else {
        setError(data.error || 'Failed to fetch presentations');
      }
    } catch (err) {
      console.error('Error fetching presentations:', err);
      setError('Failed to fetch presentations');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${config.API_BASE_URL}/admin/statistics`, {
        headers: {
          'X-Admin-Key': adminKey,
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setStatistics(data.statistics);
      } else {
        setError(data.error || 'Failed to fetch statistics');
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId) => {
    setLoading(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/admin/users/${userId}`, {
        headers: {
          'X-Admin-Key': adminKey,
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSelectedUser(data.user);
      } else {
        setError(data.error || 'Failed to fetch user details');
      }
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError('Failed to fetch user details');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This will permanently delete all their data.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Key': adminKey,
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert('User deleted successfully');
        setSelectedUser(null);
        fetchUsers();
      } else {
        setError(data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const deletePresentation = async (presentationId, title) => {
    if (!window.confirm(`Are you sure you want to delete presentation "${title}"?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/admin/presentations/${presentationId}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Key': adminKey,
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert('Presentation deleted successfully');
        fetchPresentations();
      } else {
        setError(data.error || 'Failed to delete presentation');
      }
    } catch (err) {
      console.error('Error deleting presentation:', err);
      setError('Failed to delete presentation');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminKey');
    navigate('/admin');
  };

  const filteredUsers = users.filter(user =>
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPresentations = presentations.filter(pres =>
    (pres.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pres.topic || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>🛡️ Admin Dashboard</h1>
        <div className="admin-actions">
          <button onClick={() => navigate('/')} className="btn-secondary">
            ← Back to Home
          </button>
          <button onClick={handleLogout} className="btn-danger">
            Logout
          </button>
        </div>
      </div>

      <div className="tabs">
        <button
          className={activeTab === 'statistics' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('statistics')}
        >
          📊 Statistics
        </button>
        <button
          className={activeTab === 'users' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('users')}
        >
          👥 Users ({users.length})
        </button>
        <button
          className={activeTab === 'presentations' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('presentations')}
        >
          📑 Presentations ({presentations.length})
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="tab-content">
        {activeTab === 'statistics' && (
          <div className="statistics-view">
            {loading ? (
              <div className="loading">Loading statistics...</div>
            ) : statistics ? (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-value">{statistics.total_users}</div>
                    <div className="stat-label">Total Users</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📑</div>
                    <div className="stat-value">{statistics.total_presentations}</div>
                    <div className="stat-label">Presentations</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">❓</div>
                    <div className="stat-value">{statistics.total_quizzes}</div>
                    <div className="stat-label">Quizzes</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div className="stat-value">{statistics.total_scripts}</div>
                    <div className="stat-label">Scripts</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">🎨</div>
                    <div className="stat-value">{statistics.total_templates}</div>
                    <div className="stat-label">Templates</div>
                  </div>
                </div>

                <div className="user-types-section">
                  <h3>User Types Distribution</h3>
                  <div className="user-types-list">
                    {Object.entries(statistics.user_types || {}).map(([type, count]) => (
                      <div key={type} className="user-type-item">
                        <span className="user-type-label">{type || 'Unknown'}</span>
                        <span className="user-type-count">{count} users</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div>No statistics available</div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-view">
            <div className="view-header">
              <input
                type="text"
                placeholder="Search users by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            {loading ? (
              <div className="loading">Loading users...</div>
            ) : (
              <div className="users-grid">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="user-card">
                    <div className="user-info">
                      <h3>{user.full_name || 'Unnamed User'}</h3>
                      <p className="user-email">{user.email}</p>
                      <div className="user-meta">
                        <span className="badge">{user.user_type || 'Unknown'}</span>
                        {user.institution && (
                          <span className="institution">{user.institution}</span>
                        )}
                      </div>
                      <p className="user-date">
                        Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                    <div className="user-actions">
                      <button
                        onClick={() => fetchUserDetails(user.id)}
                        className="btn-info"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => deleteUser(user.id, user.full_name || user.email)}
                        className="btn-danger"
                      >
                        Delete User
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedUser && (
              <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h2>User Details</h2>
                    <button onClick={() => setSelectedUser(null)} className="close-button">
                      ×
                    </button>
                  </div>
                  <div className="modal-body">
                    <div className="detail-row">
                      <strong>ID:</strong> {selectedUser.id}
                    </div>
                    <div className="detail-row">
                      <strong>Name:</strong> {selectedUser.full_name || 'N/A'}
                    </div>
                    <div className="detail-row">
                      <strong>Email:</strong> {selectedUser.email}
                    </div>
                    <div className="detail-row">
                      <strong>User Type:</strong> {selectedUser.user_type || 'N/A'}
                    </div>
                    <div className="detail-row">
                      <strong>Institution:</strong> {selectedUser.institution || 'N/A'}
                    </div>
                    <div className="detail-row">
                      <strong>Joined:</strong>{' '}
                      {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : 'N/A'}
                    </div>

                    {selectedUser.stats && (
                      <div className="user-stats">
                        <h3>Activity Statistics</h3>
                        <div className="stats-row">
                          <div className="stat-item">
                            <span className="stat-label">Presentations:</span>
                            <span className="stat-value">{selectedUser.stats.presentations}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Quizzes:</span>
                            <span className="stat-value">{selectedUser.stats.quizzes}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Scripts:</span>
                            <span className="stat-value">{selectedUser.stats.scripts}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button onClick={() => setSelectedUser(null)} className="btn-secondary">
                      Close
                    </button>
                    <button
                      onClick={() => {
                        deleteUser(selectedUser.id, selectedUser.full_name || selectedUser.email);
                        setSelectedUser(null);
                      }}
                      className="btn-danger"
                    >
                      Delete User
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'presentations' && (
          <div className="presentations-view">
            <div className="view-header">
              <input
                type="text"
                placeholder="Search presentations by title or topic..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            {loading ? (
              <div className="loading">Loading presentations...</div>
            ) : (
              <div className="presentations-table">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Topic</th>
                      <th>User ID</th>
                      <th>Created</th>
                      <th>Slides</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPresentations.map((pres) => (
                      <tr key={pres.id}>
                        <td>{pres.title || 'Untitled'}</td>
                        <td>{pres.topic || 'N/A'}</td>
                        <td className="mono">
                          {pres.user_id && typeof pres.user_id === 'string' 
                            ? `${pres.user_id.substring(0, 8)}...` 
                            : 'N/A'}
                        </td>
                        <td>{pres.created_at ? new Date(pres.created_at).toLocaleDateString() : 'N/A'}</td>
                        <td>{pres.slides?.length || 0}</td>
                        <td>
                          <button
                            onClick={() => deletePresentation(pres.id, pres.title)}
                            className="btn-danger-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
