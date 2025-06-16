import React, { useState } from "react";
import "../styles/ForgotPassword.css";
import config from "../config";

const ForgotPassword = ({ onBackToLogin }) => {
    const [step, setStep] = useState('select-method'); // 'select-method', 'enter-identifier', 'verify-code', 'reset-password'
    const [method, setMethod] = useState(''); // 'email' or 'phone'
    const [identifier, setIdentifier] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [resetId, setResetId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [displayedCode, setDisplayedCode] = useState(''); // For displaying verification code in UI

    const handleMethodSelection = (selectedMethod) => {
        setMethod(selectedMethod);
        setStep('enter-identifier');
        setError('');
        setDisplayedCode(''); // Clear any displayed code
    };

    const handleSendVerification = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate identifier based on method
        if (method === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(identifier)) {
                setError('Please enter a valid email address');
                setLoading(false);
                return;
            }
        } else if (method === 'phone') {
            const phoneRegex = /^[+]?[\d\s\-()]{10,15}$/;
            if (!phoneRegex.test(identifier)) {
                setError('Please enter a valid phone number');
                setLoading(false);
                return;
            }
        }

        try {
            // Use backend for both email and phone verification
            const response = await fetch(`${config.API_BASE_URL}/forgot-password/send-verification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identifier: identifier,
                    method: method
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setResetId(data.reset_id);
                setMessage(data.message);
                setStep('verify-code');
                // Display the verification code in the UI for development
                if (data.verification_code) {
                    console.log('Verification code (DEV ONLY):', data.verification_code);
                    setDisplayedCode(data.verification_code);
                }
            } else {
                setError(data.error || 'Failed to send verification code');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!verificationCode || verificationCode.length !== 6) {
            setError('Please enter a valid 6-digit verification code');
            setLoading(false);
            return;
        }

        try {
            // Use backend verification for both email and phone
            const response = await fetch(`${config.API_BASE_URL}/forgot-password/verify-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reset_id: resetId,
                    verification_code: verificationCode
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                setStep('reset-password');
            } else {
                setError(data.error || 'Invalid verification code');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            setLoading(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${config.API_BASE_URL}/forgot-password/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reset_id: resetId,
                    new_password: newPassword
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('Password reset successfully! You can now login with your new password.');
                setTimeout(() => {
                    onBackToLogin();
                }, 2000);
            } else {
                setError(data.error || 'Failed to reset password');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderSelectMethod = () => (
        <div className="forgot-password-step">
            <h2>Reset Your Password</h2>
            <p>Choose how you'd like to receive your verification code:</p>
            
            <div className="method-selection">
                <button 
                    className="method-button email-method"
                    onClick={() => handleMethodSelection('email')}
                    disabled={loading}
                >
                    <div className="method-icon">📧</div>
                    <div className="method-text">
                        <h3>Email</h3>
                        <p>Get verification code via email</p>
                    </div>
                </button>
                
                <button 
                    className="method-button phone-method"
                    onClick={() => handleMethodSelection('phone')}
                    disabled={loading}
                >
                    <div className="method-icon">📱</div>
                    <div className="method-text">
                        <h3>SMS</h3>
                        <p>Get verification code via SMS</p>
                    </div>
                </button>
            </div>
        </div>
    );

    const renderEnterIdentifier = () => (
        <div className="forgot-password-step">
            <h2>Enter Your {method === 'email' ? 'Email' : 'Phone Number'}</h2>
            <p>
                We'll send a verification code to your {method === 'email' ? 'email address' : 'phone number'}
            </p>
            
            <form onSubmit={handleSendVerification}>
                <div className="form-group">
                    <input
                        type={method === 'email' ? 'email' : 'tel'}
                        placeholder={method === 'email' ? 'Enter your email address' : 'Enter your phone number'}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                        disabled={loading}
                    />
                </div>
                
                <button type="submit" className="submit-button" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Verification Code'}
                </button>
            </form>
            
            <button 
                className="back-button"
                onClick={() => setStep('select-method')}
                disabled={loading}
            >
                ← Back to method selection
            </button>
        </div>
    );

    const renderVerifyCode = () => (
        <div className="forgot-password-step">
            <h2>Enter Verification Code</h2>
            <p>
                We've sent a 6-digit code to your {method === 'email' ? 'email' : 'phone number'}: 
                <span className="identifier-display">{identifier}</span>
            </p>
            
            {/* Display verification code for development */}
            {displayedCode && (
                <div className="development-code-display">
                    <div className="dev-code-header">
                        <strong>Development Mode - Verification Code:</strong>
                    </div>
                    <div className="dev-code-value">
                        {displayedCode}
                    </div>
                    <div className="dev-code-note">
                        (This is displayed for testing purposes only)
                    </div>
                </div>
            )}
            
            <form onSubmit={handleVerifyCode}>
                <div className="form-group">
                    <input
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength="6"
                        required
                        disabled={loading}
                        className="verification-input"
                    />
                </div>
                
                <button type="submit" className="submit-button" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify Code'}
                </button>
            </form>
            
            <button 
                className="resend-button"
                onClick={() => {
                    setDisplayedCode(''); // Clear the displayed code
                    setStep('enter-identifier');
                }}
                disabled={loading}
            >
                Resend code
            </button>
            
            <button 
                className="back-button"
                onClick={() => {
                    setDisplayedCode(''); // Clear the displayed code
                    setStep('enter-identifier');
                }}
                disabled={loading}
            >
                ← Change {method === 'email' ? 'email' : 'phone number'}
            </button>
        </div>
    );

    const renderResetPassword = () => (
        <div className="forgot-password-step">
            <h2>Create New Password</h2>
            <p>Enter your new password below</p>
            
            <form onSubmit={handleResetPassword}>
                <div className="form-group">
                    <div className="password-input-container">
                        <input
                            type={showNewPassword ? "text" : "password"}
                            placeholder="New password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            disabled={loading}
                            minLength="6"
                        />
                        <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            disabled={loading}
                        >
                            {showNewPassword ? "🙈" : "👁️"}
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <div className="password-input-container">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading}
                            minLength="6"
                        />
                        <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={loading}
                        >
                            {showConfirmPassword ? "🙈" : "👁️"}
                        </button>
                    </div>
                </div>
                
                <button type="submit" className="submit-button" disabled={loading}>
                    {loading ? 'Resetting...' : 'Reset Password'}
                </button>
            </form>
        </div>
    );

    return (
        <div className="forgot-password-container">
            <div className="forgot-password-card">
                {error && <div className="error-message">{error}</div>}
                {message && <div className="success-message">{message}</div>}
                
                {step === 'select-method' && renderSelectMethod()}
                {step === 'enter-identifier' && renderEnterIdentifier()}
                {step === 'verify-code' && renderVerifyCode()}
                {step === 'reset-password' && renderResetPassword()}
                
                <div className="back-to-login">
                    <button onClick={onBackToLogin} className="link-button">
                        ← Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
