import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config';
import '../styles/Admin.css';

function Admin() {
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${config.API_BASE_URL}/admin/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ admin_key: adminKey }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store admin key in sessionStorage
        sessionStorage.setItem('adminKey', adminKey);
        navigate('/admin/dashboard');
      } else {
        setError(data.error || 'Invalid admin key');
      }
    } catch (err) {
      console.error('Admin verification error:', err);
      setError('Failed to verify admin key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-card">
        <div className="admin-header">
          <h1>🔐 Admin Access</h1>
          <p>Enter the secret key to access the admin panel</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="adminKey">Admin Secret Key</label>
            <input
              type="password"
              id="adminKey"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter secret key"
              required
              autoFocus
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="submit-button">
            {loading ? 'Verifying...' : 'Access Admin Panel'}
          </button>
        </form>

        <div className="admin-footer">
          <button onClick={() => navigate('/')} className="back-button">
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default Admin;
