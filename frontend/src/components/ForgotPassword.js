import React, { useState, useEffect } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';
import '../styles/ForgotPassword.css';

const ForgotPassword = ({ onBackToLogin }) => {
    const [step, setStep] = useState('select-method'); // 'select-method', 'enter-identifier', 'verify-code', 'reset-password'
    const [method, setMethod] = useState(''); // 'email' or 'phone'
    const [identifier, setIdentifier] = useState('');
    const [verificationCode, setVerificationCode] = useState('');    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [resetId, setResetId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
    const [confirmationResult, setConfirmationResult] = useState(null);// Initialize reCAPTCHA verifier only when phone method is selected and container exists
    const initializeRecaptcha = () => {
        if (!recaptchaVerifier && method === 'phone' && step === 'enter-identifier') {
            // Wait for DOM element to be available
            const container = document.getElementById('recaptcha-container');
            if (container) {
                try {
                    console.log('Initializing reCAPTCHA...');
                    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                        size: 'normal',
                        callback: (response) => {
                            console.log('reCAPTCHA solved:', response);
                        },
                        'expired-callback': () => {
                            console.log('reCAPTCHA expired');
                            setError('reCAPTCHA expired. Please try again.');
                        }
                    });
                    setRecaptchaVerifier(verifier);
                    console.log('reCAPTCHA initialized successfully');
                } catch (error) {
                    console.error('Failed to initialize reCAPTCHA:', error);
                    setError('Failed to initialize reCAPTCHA. Please refresh the page.');
                }
            } else {
                console.error('reCAPTCHA container not found');
            }
        }
    };

    // Initialize reCAPTCHA when method changes to phone and we're on the right step
    useEffect(() => {
        if (method === 'phone' && step === 'enter-identifier') {
            // Small delay to ensure DOM is rendered
            const timer = setTimeout(initializeRecaptcha, 100);
            return () => clearTimeout(timer);
        }

        // Cleanup reCAPTCHA when method changes away from phone
        return () => {
            if (recaptchaVerifier && method !== 'phone') {
                recaptchaVerifier.clear();
                setRecaptchaVerifier(null);
            }
        };
    }, [method, step]);

    const handleMethodSelection = (selectedMethod) => {
        setMethod(selectedMethod);
        setStep('enter-identifier');
        setError('');
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
        }        try {
            if (method === 'phone') {
                // Ensure reCAPTCHA is initialized
                if (!recaptchaVerifier) {
                    initializeRecaptcha();
                    // Wait a bit for initialization
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                if (!recaptchaVerifier) {
                    setError('reCAPTCHA failed to initialize. Please refresh the page and try again.');
                    setLoading(false);
                    return;
                }

                // First check if user exists in our backend
                const checkResponse = await fetch('http://localhost:5000/forgot-password/send-verification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        identifier: identifier,
                        method: method,
                        check_only: true // Just check if user exists
                    }),
                });

                if (!checkResponse.ok) {
                    const errorData = await checkResponse.json();
                    setError(errorData.error || 'User not found');
                    setLoading(false);
                    return;
                }                // Format phone number for Firebase Auth (be more strict about formatting)
                let formattedPhone = identifier.replace(/\D/g, ''); // Remove all non-digits
                
                // Add country code if not present
                if (!formattedPhone.startsWith('63') && !formattedPhone.startsWith('+63')) {
                    formattedPhone = '63' + formattedPhone;
                }
                
                // Ensure it starts with +
                if (!formattedPhone.startsWith('+')) {
                    formattedPhone = '+' + formattedPhone;
                }                console.log('Formatted phone number:', formattedPhone);                // Send SMS via Firebase Auth
                try {
                    const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
                    setConfirmationResult(confirmation);
                    setMessage('Verification code sent to your phone via Firebase Auth');
                    setStep('verify-code');
                } catch (firebaseError) {
                    console.error('Firebase SMS Error:', firebaseError);
                    
                    // Handle specific Firebase errors
                    if (firebaseError.code === 'auth/invalid-phone-number') {
                        setError('Invalid phone number format. Please check your number.');
                    } else if (firebaseError.code === 'auth/too-many-requests') {
                        setError('Too many requests. Please try again later.');
                    } else if (firebaseError.code === 'auth/captcha-check-failed') {
                        setError('reCAPTCHA verification failed. Please try again.');
                    } else if (firebaseError.code === 'auth/billing-not-enabled') {
                        console.log('Firebase billing not enabled, falling back to backend SMS service...');
                        // Fall back to backend SMS service
                        try {
                            const response = await fetch('http://localhost:5000/forgot-password/send-verification', {
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
                                setMessage('Verification code sent to your phone (backend service)');
                                setStep('verify-code');
                                // In development, show the verification code
                                if (data.verification_code) {
                                    console.log('Verification code (DEV ONLY):', data.verification_code);
                                }
                            } else {
                                setError(data.error || 'Failed to send verification code');
                            }
                        } catch (backendError) {
                            setError('Failed to send SMS verification. Please try email instead.');
                        }
                    } else {
                        setError(`SMS verification failed: ${firebaseError.message}`);
                    }
                    setLoading(false);
                    return;
                }
            } else {
                // Use backend for email verification
                const response = await fetch('http://localhost:5000/forgot-password/send-verification', {
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
                    // In development, show the verification code (remove in production)
                    if (data.verification_code) {
                        console.log('Verification code (DEV ONLY):', data.verification_code);
                    }
                } else {
                    setError(data.error || 'Failed to send verification code');
                }
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
        }        try {
            if (method === 'phone' && confirmationResult) {
                // Verify Firebase SMS code
                try {
                    const result = await confirmationResult.confirm(verificationCode);
                    
                    // Get the user ID token for backend verification
                    const idToken = await result.user.getIdToken();
                    
                    // Send to backend for password reset flow
                    const response = await fetch('http://localhost:5000/forgot-password/verify-firebase-sms', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            identifier: identifier,
                            id_token: idToken,
                            phone_number: result.user.phoneNumber
                        }),
                    });

                    const data = await response.json();

                    if (response.ok) {
                        setResetId(data.reset_id);
                        setMessage('Phone number verified successfully!');
                        setStep('reset-password');
                    } else {
                        setError(data.error || 'Verification failed');
                    }
                } catch (firebaseVerifyError) {
                    console.error('Firebase verification error:', firebaseVerifyError);
                    setError('Invalid verification code. Please try again.');
                }
            } else if (method === 'phone' && resetId) {
                // Use backend verification for phone (fallback case)
                const response = await fetch('http://localhost:5000/forgot-password/verify-code', {
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
            } else {
                // Use backend for email verification
                const response = await fetch('http://localhost:5000/forgot-password/verify-code', {
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
            const response = await fetch('http://localhost:5000/forgot-password/reset-password', {
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
                
                {/* Show reCAPTCHA only for phone verification */}
                {method === 'phone' && (
                    <div className="form-group">
                        <div id="recaptcha-container"></div>
                    </div>
                )}
                
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
                onClick={() => setStep('enter-identifier')}
                disabled={loading}
            >
                Resend code
            </button>
            
            <button 
                className="back-button"
                onClick={() => setStep('enter-identifier')}
                disabled={loading}
            >
                ← Change {method === 'email' ? 'email' : 'phone number'}
            </button>
        </div>
    );    const renderResetPassword = () => (
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