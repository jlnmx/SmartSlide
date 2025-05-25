import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/SavedQuizzesAndScripts.css';
import Navbar from './Navbar';

const Modal = ({ open, onClose, title, children }) => {
    if (!open) return null;
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="modal-close-btn" onClick={onClose}>×</button>
                <h2 style={{ marginTop: 0 }}>{title}</h2>
                <div className="modal-body">{children}</div>
            </div>
        </div>
    );
};

const SavedQuizzesAndScripts = () => {
    const [savedQuizzes, setSavedQuizzes] = useState([]);
    const [savedScripts, setSavedScripts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalContent, setModalContent] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.id) {
            navigate('/auth');
            return;
        }

        const fetchSavedItems = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await axios.get(`http://localhost:5000/saved-items/${user.id}`);
                setSavedQuizzes(response.data.quizzes || []);
                setSavedScripts(response.data.scripts || []);
            } catch (err) {
                setError('Failed to load saved items. Please try again later.');
                console.error("Error fetching saved items:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSavedItems();
    }, [navigate]);

    const handleDelete = async (type, id) => {
        if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;

        const url = type === 'quiz' ? `http://localhost:5000/saved-quiz/${id}` : `http://localhost:5000/saved-script/${id}`;
        try {
            await axios.delete(url);
            if (type === 'quiz') {
                setSavedQuizzes(prev => prev.filter(item => item.id !== id));
            } else {
                setSavedScripts(prev => prev.filter(item => item.id !== id));
            }
            alert(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully.`);
        } catch (err) {
            alert(`Failed to delete ${type}.`);
            console.error(`Error deleting ${type}:`, err);
        }
    };

    const handleExport = async (type, id, name) => {
        const url = type === 'quiz' ? `http://localhost:5000/export-quiz/${id}/word` : `http://localhost:5000/export-script/${id}/word`;
        try {
            const response = await axios.get(url, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${type}.docx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(link.href);
        } catch (err) {
            alert(`Failed to export ${type}.`);
            console.error(`Error exporting ${type}:`, err);
        }
    };
    
    const handleView = async (type, id) => {
        let item;

        if (type === 'quiz') {
            item = savedQuizzes.find(q => q.id === id);
            if (!item) return;

            let quizData = item.content;
            if (typeof quizData === 'string') {
                try {
                    quizData = JSON.parse(quizData);
                } catch (e) {
                    // keep as string if parsing fails
                }
            }

            setModalTitle('Generated Quiz');
            setModalContent(
                <div
                    style={{
                        maxWidth: 700,
                        margin: "2rem auto",
                        background: "#fff",
                        borderRadius: 10,
                        boxShadow: "0 2px 8px #0001",
                        padding: 32,
                        overflowY: 'auto',
                        maxHeight: '70vh'
                    }}
                >
                    <h1>Generated Quiz</h1>
                    {quizData ? (
                        Array.isArray(quizData) ? (
                            quizData.map((q, idx) => (
                                <div key={idx} style={{ marginBottom: 24 }}>
                                    <b>Q{idx + 1}:</b> {q.question}
                                    {q.choices && (
                                        <ul style={{ marginTop: 8 }}>
                                            {q.choices.map((choice, cidx) => (
                                                <li key={cidx}>{choice}</li>
                                            ))}
                                        </ul>
                                    )}
                                    {q.answer && (
                                        <div style={{ color: "#1976d2", marginTop: 6 }}>
                                            <b>Answer:</b> {q.answer}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '1.08rem', lineHeight: 1.7 }}>
                                {typeof quizData === 'string' ? quizData : JSON.stringify(quizData, null, 2)}
                            </pre>
                        )
                    ) : (
                        <div>No quiz generated.</div>
                    )}
                </div>
            );
        } else {
            item = savedScripts.find(s => s.id === id);
            if (!item) return;

            setModalTitle('Speaker Script');
            setModalContent(
                <div
                    style={{
                        maxWidth: 700,
                        margin: "2rem auto",
                        background: "#fff",
                        borderRadius: 10,
                        boxShadow: "0 2px 8px #0001",
                        padding: 32,
                        overflowY: 'auto',
                        maxHeight: '70vh'
                    }}
                >
                    <h1>Speaker Script</h1>
                    {item.content ? (
                        <pre
                            style={{
                                whiteSpace: "pre-wrap",
                                fontSize: "1.08rem",
                                lineHeight: 1.7,
                            }}
                        >
                            {item.content}
                        </pre>
                    ) : (
                        <div>No script generated.</div>
                    )}
                </div>
            );
        }
        setModalOpen(true);
    };

    if (isLoading) return <div className="loading-container"><p>Loading saved items...</p></div>;
    if (error) return <div className="error-container"><p>{error}</p></div>;

    return (
        <div><Navbar />
        <div className="saved-items-page">
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle}>
                {modalContent}
            </Modal>
            <header className="saved-items-header">
                <h1>Saved Quizzes & Scripts</h1>
                <button onClick={() => navigate('/dashboard')} className="back-to-dashboard-btn">Back to Dashboard</button>
            </header>

            <div className="saved-sections-row">
                <section className="saved-section">
                    <h2>Saved Quizzes</h2>
                    {savedQuizzes.length === 0 ? (
                        <p>No saved quizzes found.</p>
                    ) : (
                        <ul className="items-list">
                            {savedQuizzes.map(quiz => (
                                <li key={quiz.id} className="item-card">
                                    <h3>{quiz.name}</h3>
                                    <p>Saved on: {new Date(quiz.created_at).toLocaleDateString()}</p>
                                    <div className="item-actions">
                                        <button onClick={() => handleExport('quiz', quiz.id, quiz.name)} className="action-btn export-btn">Export as Word</button>
                                        <button onClick={() => handleDelete('quiz', quiz.id)} className="action-btn delete-btn">Delete</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="saved-section">
                    <h2>Saved Scripts</h2>
                    {savedScripts.length === 0 ? (
                        <p>No saved scripts found.</p>
                    ) : (
                        <ul className="items-list">
                            {savedScripts.map(script => (
                                <li key={script.id} className="item-card">
                                    <h3>{script.name}</h3>
                                    <p>Saved on: {new Date(script.created_at).toLocaleDateString()}</p>
                                    <div className="item-actions">
                                        <button onClick={() => handleExport('script', script.id, script.name)} className="action-btn export-btn">Export as Word</button>
                                        <button onClick={() => handleDelete('script', script.id)} className="action-btn delete-btn">Delete</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
        </div>
    );
};

export default SavedQuizzesAndScripts;
