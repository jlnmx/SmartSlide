import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Slide } from "react-slideshow-image"; // Import the Slide component
import "react-slideshow-image/dist/styles.css"; // Import default styles
import axios from "axios";
import "../styles/Auth.css";
import config from "../../config";


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
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && password !== confirmPassword)) {
      alert("Please fill all fields correctly.");
      return;
    }
    try {
      if (isLogin) {
        const res = await axios.post(`${config.API_BASE_URL}/login`, { email, password });
        localStorage.setItem("user", JSON.stringify(res.data.user));
        navigate("/dashboard");
      } else {
        await axios.post(`${config.API_BASE_URL}/register`, { email, password });
        alert("Registration successful!");
        // Directly log in after registration
        const res = await axios.post(`${config.API_BASE_URL}/login`, { email, password });
        localStorage.setItem("user", JSON.stringify(res.data.user));
        navigate("/dashboard");
      }
    } catch (err) {
      alert(err.response?.data?.error || "Authentication failed.");
    }
  };

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
          </p>
          <form className="auth-form" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="Email Address"
            />
            <input
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