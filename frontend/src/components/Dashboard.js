import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Dashboard.css";
import config from "../config";

// Accurate slide preview component that renders exact visual representation
const SlidePreview = ({ presentation, template }) => {
  const [slideData, setSlideData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Constants from SlideEditor
  const SLIDE_WIDTH = 960;
  const SLIDE_HEIGHT = 540;

  useEffect(() => {
    const fetchSlideData = async () => {
      try {
        const res = await axios.get(`${config.API_BASE_URL}/presentation/${presentation.id}`);
        const slides = res.data.slides || [];
        if (slides.length > 0) {
          setSlideData(slides[0]); // Get first slide
        }
      } catch (err) {
        console.error("Failed to fetch slide data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSlideData();
  }, [presentation.id]);

  // Template background rendering functions (simplified from SlideEditor)
  const renderTemplateBackground = (templateId, isTitle = true) => {
    if (!templateId) return null;

    let imgSrc = null;
    switch (templateId) {
      case 'tailwind-business':
        imgSrc = isTitle
          ? "/static/template_backgrounds/tailwind-business_title.png"
          : "/static/template_backgrounds/tailwind-business_content.png";
        break;
      case 'tailwind-creative':
        imgSrc = isTitle
          ? "/static/template_backgrounds/tailwind-creative_title.png"
          : "/static/template_backgrounds/tailwind-creative_content.png";
        break;
      case 'tailwind-education':
        imgSrc = isTitle
          ? "/static/template_backgrounds/tailwind-education_title.png"
          : "/static/template_backgrounds/tailwind-education_content.png";
        break;
      case 'tailwind-abstract-gradient':
        imgSrc = isTitle
          ? "/static/template_backgrounds/tailwind-abstract-gradient_title.png"
          : "/static/template_backgrounds/tailwind-abstract-gradient_content.png";
        break;
      default:
        return null;
    }

    if (imgSrc) {
      return (
        <img
          src={imgSrc}
          alt="Template Background"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0
          }}
          draggable={false}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      );
    }
    return null;
  };

  const renderMiniSlide = () => {
    if (loading) {
      return (
        <div className="slide-preview-loading">
          <div className="mini-spinner"></div>
        </div>
      );
    }

    if (!slideData) {
      return (
        <div className="slide-preview-placeholder">
          <svg className="preview-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
          <span>Preview</span>
        </div>
      );
    }

    // Get template ID
    let templateId = null;
    if (template && typeof template === 'object' && template.id) {
      templateId = template.id;
    } else if (typeof template === 'string') {
      templateId = template;
    }

    // Determine if this is a title slide (first slide)
    const isTitle = true; // First slide is usually title slide

    return (
      <div 
        className="mini-slide-preview" 
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: templateId ? 'transparent' : '#fff'
        }}
      >
        {/* Render template background */}
        {templateId && renderTemplateBackground(templateId, isTitle)}
        
        {/* Render textboxes exactly as they appear in SlideEditor */}
        {slideData.textboxes && Array.isArray(slideData.textboxes) && slideData.textboxes.map((tb, index) => {
          const style = {
            position: "absolute",
            left: `${(tb.x / SLIDE_WIDTH) * 100}%`,
            top: `${(tb.y / SLIDE_HEIGHT) * 100}%`,
            width: `${(tb.width / SLIDE_WIDTH) * 100}%`,
            height: `${(tb.height / SLIDE_HEIGHT) * 100}%`,
            fontSize: `${(tb.fontSize / SLIDE_WIDTH) * 100}%`, // Scale font size
            fontFamily: tb.fontFamily || 'Arial',
            color: tb.fill || '#222222',
            fontWeight: tb.fontStyle?.bold ? "bold" : "normal",
            fontStyle: tb.fontStyle?.italic ? "italic" : "normal",
            textDecoration: tb.fontStyle?.underline ? "underline" : "none",
            lineHeight: tb.lineHeight || 1.2,
            textAlign: tb.align || 'left',
            background: "transparent",
            padding: "0.5%",
            boxSizing: "border-box",
            overflowWrap: "break-word",
            wordWrap: "break-word",
            overflow: "hidden",
            zIndex: 1,
            pointerEvents: 'none' // Disable interaction in preview
          };

          return (
            <div
              key={`preview-textbox-${index}`}
              style={style}
              dangerouslySetInnerHTML={{ __html: tb.text || '' }}
            />
          );
        })}

        {/* Render images exactly as they appear in SlideEditor */}
        {slideData.images && Array.isArray(slideData.images) && slideData.images.map((image, index) => (
          <div
            key={`preview-image-${index}`}
            style={{
              position: 'absolute',
              left: `${(image.x / SLIDE_WIDTH) * 100}%`,
              top: `${(image.y / SLIDE_HEIGHT) * 100}%`,
              width: `${(image.width / SLIDE_WIDTH) * 100}%`,
              height: `${(image.height / SLIDE_HEIGHT) * 100}%`,
              zIndex: image.zIndex || 2,
              pointerEvents: 'none'
            }}
          >
            <img
              src={image.src}
              alt="Slide image"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '2px'
              }}
              draggable={false}
            />
          </div>
        ))}

        {/* Handle legacy single image format */}
        {slideData.image && slideData.image.src && (
          <div
            style={{
              position: 'absolute',
              left: `${(slideData.image.x / SLIDE_WIDTH) * 100}%`,
              top: `${(slideData.image.y / SLIDE_HEIGHT) * 100}%`,
              width: `${(slideData.image.width / SLIDE_WIDTH) * 100}%`,
              height: `${(slideData.image.height / SLIDE_HEIGHT) * 100}%`,
              zIndex: 2,
              pointerEvents: 'none'
            }}
          >
            <img
              src={slideData.image.src}
              alt="Slide image"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '2px'
              }}
              draggable={false}
            />
          </div>
        )}

        {/* Handle simple format slides (fallback) */}
        {(!slideData.textboxes || slideData.textboxes.length === 0) && (slideData.title || slideData.content) && (
          <div 
            style={{
              position: 'absolute',
              top: '20%',
              left: '8%',
              right: '8%',
              zIndex: 1,
              color: '#222',
              pointerEvents: 'none'
            }}
          >
            {slideData.title && (
              <div style={{
                fontSize: '3.5%',
                fontWeight: 'bold',
                marginBottom: '2%',
                fontFamily: 'Arial'
              }}>
                {slideData.title}
              </div>
            )}
            {slideData.content && (
              <div style={{
                fontSize: '2.2%',
                lineHeight: 1.4,
                fontFamily: 'Arial'
              }}>
                {Array.isArray(slideData.content) 
                  ? slideData.content.join('\n') 
                  : slideData.content}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return renderMiniSlide();
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [presentations, setPresentations] = useState([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false); // Add this line


  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.id) {
      navigate("/auth");
      return;
    }
    axios
      .get(`${config.API_BASE_URL}/presentations/${user.id}`)
      .then((res) => {
        setPresentations(res.data.presentations || []);
      })
      .catch((err) => {
        setPresentations([]);
      });
  }, [navigate]);

  const handleHelpClick = () => {
    navigate("/help");
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

   const confirmLogout = () => {
    localStorage.removeItem("user");
    navigate("/auth");
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };


  const handlePresentationClick = async (presentation) => {
    try {
      const res = await axios.get(`${config.API_BASE_URL}/presentation/${presentation.id}`);
      const slides = res.data.slides || [{ title: presentation.title, content: ["No slide content stored."] }];
      navigate("/slides-generating", {
        state: {
          slides,
          template: res.data.template || presentation.template,
          presentationType: res.data.presentationType || presentation.presentation_type || "Default",
          presentationId: presentation.id, // Add presentationId to the navigation state
        },
      });
    } catch (err) {
      navigate("/slides-generating", {
        state: {
          slides: [{ title: presentation.title, content: ["No slide content stored. This is a placeholder."] }],
          template: presentation.template,
          presentationType: presentation.presentation_type || "Default",
          presentationId: presentation.id, // Add presentationId to the navigation state
        },
      });
    }
  };

  const handleDeletePresentation = async (presentationId) => {
    if (!window.confirm("Are you sure you want to delete this presentation?")) return;
    try {
      await axios.delete(`${config.API_BASE_URL}/presentation/${presentationId}`);
      setPresentations((prev) => prev.filter((p) => p.id !== presentationId));
    } catch (err) {
      alert("Failed to delete presentation.");
    }
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar logo"></div> 
        <nav className="menu">
          <Link to="/create" className="menu-item">CREATE</Link>
          <Link to="/saved-quizzes-and-scripts" className="menu-item">QUIZZES & SCRIPTS</Link>
          <Link to="/analytics" className="menu-item">ANALYTICS</Link>
          <Link to="/upload-templates" className="menu-item">UPLOAD TEMPLATES</Link>
        </nav>
        <button className="logout-btn" onClick={handleLogoutClick}>
          Logout
        </button>
      </aside>

      <main className="main-content">        
        <header className="dashboard-header">
          <h1>WELCOME BACK!</h1>
          <div className="header-actions"> 
            <Link to="/account" className="account-btn" title="Account Settings">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </Link>
          </div>
        </header>

        <section className="recent-presentations">
          <h2>RECENT PRESENTATIONS</h2>          <div className="presentation-list">
            {presentations.length === 0 ? (
              <>
                <div className="presentation-card empty">
                  <div>No recent presentations found.</div>
                </div>
                {/* Show backend error if present */}
                {presentations.error && (
                  <div className="presentation-card error">
                    <div>Backend error: {presentations.error}</div>
                  </div>
                )}
              </>
            ) : (              presentations.map((p) => (
                <div className="presentation-card" key={p.id} onClick={() => handlePresentationClick(p)}>
                  {/* Slide Preview Area (Upper Half) */}
                  <div className="slide-preview">
                    <SlidePreview presentation={p} template={p.template} />
                  </div>
                  
                  {/* Presentation Info Area (Lower Half) */}
                  <div className="presentation-info">
                    <div className="presentation-title">{p.title}</div>
                    <div className="presentation-meta">
                      <div>{new Date(p.created_at).toLocaleDateString()}</div>
                      {p.template && <div>Template: {p.template}</div>}
                      {p.presentation_type && <div>Type: {p.presentation_type}</div>}
                    </div>
                    <div className="presentation-actions">
                      <button
                        className="delete-btn"
                        onClick={e => { e.stopPropagation(); handleDeletePresentation(p.id); }}
                        title="Delete presentation"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <button className="need-help-btn" onClick={handleHelpClick}>
      </button>

      {/* Add the logout modal before the closing div */}
      {showLogoutModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to log out?</p>
            <div className="logout-modal-buttons">
              <button className="logout-confirm-btn" onClick={confirmLogout}>
                Proceed
              </button>
              <button className="logout-cancel-btn" onClick={cancelLogout}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;