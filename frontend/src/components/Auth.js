import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Slide } from "react-slideshow-image"; // Import the Slide component
import "react-slideshow-image/dist/styles.css"; // Import default styles
import axios from "axios";
import "../styles/Auth.css";
import config from "../config";
import ForgotPassword from "./ForgotPassword";


const slideImages = [
  "/images/preview1.png",
  "/images/preview2.png",
  "/images/preview3.png",
];

// --- Slideshow Properties ---
const properties = {
  duration: 5000,
  transitionDuration: 500,
  infinite: true,
  indicators: true, // Use CSS to style/position indicators
  arrows: true, // Use CSS to style/position arrows
  // Removed pauseOnHover as it might interfere with arrow clicks sometimes
};

const AuthPage = ({ isLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLogin) {
      // Login validation
      if (!email || !password) {
        alert("Please fill all fields correctly.");
        return;
      }
    } else {
      // Registration validation
      if (!email || !password || !fullName || !birthday || !contactNumber || password !== confirmPassword) {
        alert("Please fill all fields correctly and ensure passwords match.");
        return;
      }
    }
    
    try {
      if (isLogin) {
        const res = await axios.post(`${config.API_BASE_URL}/login`, { email, password });
        const user = res.data.user;
        localStorage.setItem("user", JSON.stringify(user));
        
        // Check if user has completed registration (selected user type)
        if (user.registration_completed) {
          navigate("/dashboard");
        } else {
          navigate("/select-user-type", { state: { userId: user.id } });
        }
      } else {
        // Register user with additional information
        const registerRes = await axios.post(`${config.API_BASE_URL}/register`, { 
          email, 
          password, 
          fullName, 
          birthday, 
          contactNumber 
        });
        
        alert("Registration successful! Please select your user type.");
        
        // Navigate to user type selection page
        navigate("/select-user-type", { state: { userId: registerRes.data.user_id } });
      }    } catch (err) {
      alert(err.response?.data?.error || "Authentication failed.");
    }
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setEmail("");
    setPassword("");
  };

  const handleForgotPasswordClick = () => {
    setShowForgotPassword(true);
  };

  // If showing forgot password, render the ForgotPassword component
  if (showForgotPassword) {
    return <ForgotPassword onBackToLogin={handleBackToLogin} />;
  }

  return (
    <div className="auth-container">
      <div className="auth-main-content">
        {/* --- Slideshow Section --- */}
        <div className="auth-slideshow-container">
                <Link to="/">
                <img src="/SS_Logo_3.png" alt="SmartSlide Logo" className="slideshow-logo" />
                </Link>

                <h1 className="slideshow-title">Discover SmartSlide</h1>
                <p className="slideshow-subtitle">Generate stunning presentations effortlessly.</p>

                {/* Add a wrapper div for slideshow sizing */}
          <div className="slide-container">
            <Slide {...properties}>
              {slideImages.map((slideImage, index) => (
                <div className="each-slide" key={index}>
                  <div
                    style={{ backgroundImage: `url(${slideImage})` }}
                    className="slide-image"
                  >
                    {/* Display placeholder text if image fails to load */}
                    {`Preview ${index + 1}`}
                  </div>
                </div>
              ))}
            </Slide>
          </div>

          <p className="slideshow-footer">Create your own presentations, quizzes and scripts efficiently .</p>
        </div>

        {/* --- Form Section --- */}
        <div className="auth-box">
          <h2>{isLogin ? "Enter your Account" : "Create an Account"}</h2>
          <p className="auth-subtitle">
            {isLogin
              ? "Get started on creating presentations."
              : "Join SmartSlide and start creating."}
          </p>          <form className="auth-form" onSubmit={handleSubmit}>
            {!isLogin && (
              <input
                type="text"
                placeholder="Full Name (e.g. Juan Dela Cruz)"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                aria-label="Full Name (e.g. Juan Dela Cruz)"
              />
            )}            {!isLogin && (
              <div className="form-field">
                <label htmlFor="birthdate">Birthdate</label>
                <input
                  id="birthdate"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  required
                  aria-label="Birthdate"
                />
              </div>
            )}
            {!isLogin && (
              <input
                type="tel"
                placeholder="Contact Number"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                required
                aria-label="Contact Number"
              />
            )}
            <input
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="Email Address"
            />            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-label="Password"
            />
            {!isLogin && (
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                aria-label="Confirm Password"
              />
            {isLogin && (
              <div className="forgot-password-link">
                <button Add commentMore actions
                  type="button" 
                  className="forgot-password-btn"
                  onClick={handleForgotPasswordClick}
                >
                  Forgot Password?
                </button>
              </div>
            )}
            <button type="submit" className="auth-btn">
              {isLogin ? "Sign In" : "Sign Up"}
            </button>
          </form>
          <p className="auth-footer">
            {isLogin ? (
              <>
                Don't have an account? <Link to="/register">Create an account</Link>
              </>
            ) : (
              <>
                Already have an account? <Link to="/auth">Sign In</Link>
              </>
            )}
          </p>
        </div>
      </div> {/* End auth-main-content */}
    </div>
  );
};

export default AuthPage;
