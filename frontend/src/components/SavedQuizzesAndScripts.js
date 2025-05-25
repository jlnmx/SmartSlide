import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/SavedQuizzesAndScripts.css';

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
        let item, name; // Removed 'content' from here as it's handled by dataToProcess

        if (type === 'quiz') {
            item = savedQuizzes.find(q => q.id === id);
            if (!item) return;

            name = item.name; // Default to item's name from the list
            let questionsArray = null;
            let dataToProcess = item.content; // Initialize with raw content

            if (typeof item.content === 'string') {
                try {
                    dataToProcess = JSON.parse(item.content); // Attempt to parse if it's a string
                } catch (e) {
                    // Parsing failed, dataToProcess remains the original string content
                    // console.error("Failed to parse quiz content string:", e);
                }
            }

            // dataToProcess is now either parsed content (array/object) or the original string
            
            let currentTitleInModal = name; // Use item.name for the title inside the modal by default

            if (Array.isArray(dataToProcess)) {
                questionsArray = dataToProcess;
            } else if (typeof dataToProcess === 'object' && dataToProcess !== null) {
                if (Array.isArray(dataToProcess.questions)) {
                    questionsArray = dataToProcess.questions;
                    // If content has its own name/title, prefer that for the modal's H1
                    if (typeof dataToProcess.name === 'string' && dataToProcess.name) {
                        currentTitleInModal = dataToProcess.name;
                    } else if (typeof dataToProcess.title === 'string' && dataToProcess.title) {
                        currentTitleInModal = dataToProcess.title;
                    }
                }
            }
            // If questionsArray is still null, it means we couldn't find a structured question list.
            // The fallback will handle displaying dataToProcess.

            setModalTitle(name); // Set the title for the modal frame (usually item.name)
            setModalContent(
                <div style={{ maxWidth: 700, margin: '0 auto', background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px #0001', padding: 32, overflowY: 'auto', maxHeight: '80vh' }}>
                    <h1 style={{ textAlign: 'center', fontWeight: 700, marginBottom: 32 }}>{currentTitleInModal}</h1>
                    {questionsArray ? (
                        questionsArray.map((q, idx) => (
                            <div key={idx} style={{ marginBottom: 24 }}> {/* Style from GeneratedQuiz.js */}
                                <b>Q{idx + 1}:</b> {q.question}
                                {q.choices && Array.isArray(q.choices) && (
                                    <ul style={{ marginTop: 8, paddingLeft: 20 }}> {/* Style from GeneratedQuiz.js (added paddingLeft) */}
                                        {q.choices.map((choice, cidx) => (
                                            <li key={cidx}>{choice}</li>
                                        ))}
                                    </ul>
                                )}
                                {q.answer && (
                                    <div style={{ color: "#1976d2", marginTop: 6 }}> {/* Style from GeneratedQuiz.js */}
                                        <b>Answer:</b> {q.answer}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        // Fallback: Display dataToProcess (parsed or original string)
                        // or stringify if it's an object we couldn't process into questionsArray
                        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '1.08rem', lineHeight: 1.7 }}>
                            {typeof dataToProcess === 'string' ? dataToProcess : JSON.stringify(dataToProcess, null, 2)}
                        </pre>
                    )}
                </div>
            );
        } else { // type === 'script'
            item = savedScripts.find(s => s.id === id);
            if (!item) return;
            // For scripts, the name is not taken from content, and title is hardcoded for the modal frame.
            setModalTitle('Speaker Script'); // Modal frame title
            setModalContent(
                <div style={{ maxWidth: 700, margin: '0 auto', background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px #0001', padding: 32, overflowY: 'auto', maxHeight: '80vh' }}>
                    <h1 style={{ textAlign: 'center', fontWeight: 700, marginBottom: 32 }}>Speaker Script</h1> {/* Title inside content */}
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '1.08rem', lineHeight: 1.7 }}>{item.content}</pre>
                </div>
            );
        }
        setModalOpen(true);
    };

    if (isLoading) return <div className="loading-container"><p>Loading saved items...</p></div>;
    if (error) return <div className="error-container"><p>{error}</p></div>;

    return (
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
                                        <button onClick={() => handleView('quiz', quiz.id)} className="action-btn view-btn">View</button>
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
                                        <button onClick={() => handleView('script', script.id)} className="action-btn view-btn">View</button>
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
    );
};

export default SavedQuizzesAndScripts;
