import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/App.css';

function App() {
    return (
        <div className="welcome-container">
            <header className="welcome-header">
                <h1 className="welcome-title">SmartSlide</h1>
                <p className="welcome-subtitle">Create stunning presentations effortlessly with AI.</p>
                <Link to="/create">
                    <button className="welcome-btn">Get Started</button>
                </Link>
            </header>
        </div>
    );
}

export default App;