import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Auth.css";

const AuthPage = ({ isLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Email:", email);
    console.log("Password:", password);
    navigate("/dashboard");
  };

  return (
    <div className="auth-container">
      {/* Clickable Logo */}
      <Link to="/" className="auth-logo">
        <img src="/SS_Logo_3.png" alt="SmartSlide Logo" />
      </Link>

      <div className="auth-box">
        <h2>{isLogin ? "Enter your Account." : "Create an Account"}</h2>
        <p>
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
          />
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {!isLogin && (
            <input
              type="password"
              placeholder="Confirm password"
              required
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
    </div>
  );
};

export default AuthPage;