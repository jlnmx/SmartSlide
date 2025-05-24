import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Stage, Layer, Text, Rect, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import { saveAs } from "file-saver";
import { FaBold, FaItalic, FaUnderline, FaAlignLeft, FaAlignCenter, FaAlignRight, FaAlignJustify, FaHighlighter } from "react-icons/fa";
import { v4 as uuidv4 } from "uuid";
import "../styles/SlideEditor.css";

const SLIDE_WIDTH = 800;
const SLIDE_HEIGHT = 450;

function SlideImage({ src, x, y, width, height, isSelected, onSelect, onChange }) {
  const [image] = useImage(src);
  return (
    <KonvaImage
      image={image}
      x={x}
      y={y}
      width={width}
      height={height}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={e => {
        onChange({ x: e.target.x(), y: e.target.y() });
      }}
      stroke={isSelected ? "#1976d2" : undefined}
      strokeWidth={isSelected ? 3 : 0}
    />
  );
}

const defaultTextBox = (type = "body") => ({
  id: Math.random().toString(36).substr(2, 9),
  type, // 'title' or 'body'
  text: type === "title" ? "Title" : "Body text here...",
  x: 60,
  y: type === "title" ? 60 : 150,
  width: 400,
  height: 60,
  fontSize: type === "title" ? 36 : 24,
  fill: type === "title" ? "#222222" : "#444444", // Updated to full #rrggbb format
  fontFamily: "Arial",
  fontStyle: {},
  align: "left",
  lineHeight: 1,
  paragraphSpacing: 0,
  bullets: false,
  highlight: "#ffffff" // Updated to full #rrggbb format
});

const defaultSlide = () => ({
  textboxes: [
    { ...defaultTextBox("title"), y: 60 },
    { ...defaultTextBox("body"), y: 150 }
  ],
  background: { fill: "#fff" },
  image: null
});

function mapGeneratedSlideToEditorFormat(s) {
  return {
    textboxes: [
      { ...defaultTextBox("title"), text: s.title || "Title", y: 60 },
      { ...defaultTextBox("body"), text: Array.isArray(s.content) ? s.content.join("\n") : (s.content || "Body text here..."), y: 150 }
    ],
    background: { fill: "#fff" },
    image: s.image_url
      ? { src: s.image_url, x: 400, y: 100, width: 200, height: 150 }
      : null
  };
}

// --- Helper function to ensure slides are in editor format ---
const mapIfNeeded = (slideArray) => {
  if (!slideArray || !Array.isArray(slideArray) || slideArray.length === 0) {
    return [defaultSlide()]; // Return a default slide if input is invalid or empty
  }
  // Check if the first slide is already in editor format
  const firstSlide = slideArray[0];
  if (firstSlide && typeof firstSlide === 'object' && Array.isArray(firstSlide.textboxes)) {
    // Already in editor format (or compatible)
    return slideArray;
  }
  // Needs mapping
  return slideArray.map(mapGeneratedSlideToEditorFormat);
};

const FONT_FAMILIES = [
  "Arial", "Verdana", "Tahoma", "Times New Roman", "Georgia", "Courier New", "Comic Sans MS", "Impact"
];
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64];
const LINE_HEIGHTS = [1, 1.15, 1.5, 2];
const TEXT_ALIGNS = ["left", "center", "right", "justify"];

const TOOLBAR_BUTTON_STYLE = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "4px 6px",
  margin: "0 2px",
  fontSize: "18px",
};

const SLIDE_THUMB_WIDTH = 120;
const SLIDE_THUMB_HEIGHT = 68;

const SlideEditor = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { slides: slidesFromNav, template, presentationType } = location.state || {};

  // --- Load slides: 1. Nav state, 2. LocalStorage, 3. Default ---
  let loadedSlidesInitial;
  if (slidesFromNav && Array.isArray(slidesFromNav) && slidesFromNav.length > 0) {
    loadedSlidesInitial = mapIfNeeded(slidesFromNav);
  } else {
    const storedSlides = localStorage.getItem('latestEditedSlides');
    if (storedSlides) {
      try {
        const parsedSlides = JSON.parse(storedSlides);
        loadedSlidesInitial = mapIfNeeded(parsedSlides);
      } catch (e) {
        console.error("Failed to parse slides from localStorage in SlideEditor:", e);
        loadedSlidesInitial = [defaultSlide()];
      }
    } else {
      loadedSlidesInitial = [defaultSlide()];
    }
  }

  const [slides, setSlides] = useState(loadedSlidesInitial);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedTextBoxId, setSelectedTextBoxId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(false);
  const [resizingBoxId, setResizingBoxId] = useState(null);
  const [resizeStart, setResizeStart] = useState(null);
  const [selectedTextRange, setSelectedTextRange] = useState(null);
  const fileInputRef = useRef();
  const stageRef = useRef();

  const slide = slides[currentIdx];
  const selectedTextBox = slide.textboxes.find(tb => tb.id === selectedTextBoxId);
  const isFormattingEnabled = !!selectedTextBox || selectedImage;

  // 3. Handle contenteditable changes for any textbox
  const handleContentEdit = (id, e) => {
    setSlides(prev => prev.map((s, i) =>
      i === currentIdx ? {
        ...s,
        textboxes: s.textboxes.map(tb => tb.id === id ? { ...tb, text: e.target.innerText } : tb)
      } : s
    ));
  };

  // 4. Handle drag for any textbox
  const handleTextDrag = (id, dx, dy) => {
    setSlides(prev => prev.map((s, i) =>
      i === currentIdx ? {
        ...s,
        textboxes: s.textboxes.map(tb => tb.id === id ? { ...tb, x: tb.x + dx, y: tb.y + dy } : tb)
      } : s
    ));
  };

  // 5. Handle resize for any textbox
  const handleTextResize = (id, newWidth, newHeight) => {
    setSlides(prev => prev.map((s, i) =>
      i === currentIdx ? {
        ...s,
        textboxes: s.textboxes.map(tb => tb.id === id ? { ...tb, width: newWidth, height: newHeight } : tb)
      } : s
    ));
  };

  // NEW: Handle setting absolute position for a textbox
  const handleTextSetPosition = (id, newX, newY) => {
    setSlides(prev => prev.map((s, i) =>
      i === currentIdx ? {
        ...s,
        textboxes: s.textboxes.map(tb => tb.id === id ? { ...tb, x: newX, y: newY } : tb)
      } : s
    ));
  };

  // Toolbar actions
  const handleToolbarChange = (prop, value) => {
    if (selectedTextBoxId) {
      setSlides(prev => prev.map((s, i) => {
        if (i === currentIdx) {
          return {
            ...s,
            textboxes: s.textboxes.map(tb => {
              if (tb.id === selectedTextBoxId) {
                if (selectedTextRange) {
                  const { start, end } = selectedTextRange;
                  const before = tb.text.slice(0, start);
                  const selected = tb.text.slice(start, end);
                  const after = tb.text.slice(end);
                  const styledText = `<span style="${prop}: ${value};">${selected}</span>`;
                  return { ...tb, text: `${before}${styledText}${after}` };
                } else {
                  return { ...tb, [prop]: value };
                }
              }
              return tb;
            })
          };
        }
        return s;
      }));
    }
  };
  const handleToolbarToggle = prop => {
    if (selectedTextBoxId) {
      setSlides(prev => prev.map((s, i) => {
        if (i === currentIdx) {
          return {
            ...s,
            textboxes: s.textboxes.map(tb => {
              if (tb.id === selectedTextBoxId) {
                if (selectedTextRange) {
                  const { start, end } = selectedTextRange;
                  const before = tb.text.slice(0, start);
                  const selected = tb.text.slice(start, end);
                  const after = tb.text.slice(end);
                  const toggledText = `<span style="${prop}: ${!tb.fontStyle?.[prop]};">${selected}</span>`;
                  return { ...tb, text: `${before}${toggledText}${after}` };
                } else {
                  return {
                    ...tb,
                    fontStyle: { ...tb.fontStyle, [prop]: !tb.fontStyle?.[prop] }
                  };
                }
              }
              return tb;
            })
          };
        }
        return s;
      }));
    }
  };
  // Bullets
  const handleBulletsToggle = id => {
    setSlides(prev => prev.map((s, i) =>
      i === currentIdx ? {
        ...s,
        textboxes: s.textboxes.map(tb => tb.id === id ? { ...tb, bullets: !tb.bullets } : tb)
      } : s
    ));
  };
  // Paragraph spacing
  const handleParagraphSpacing = value => {
    if (!selectedTextBox) return;
    setSlides(prev => prev.map((s, i) =>
      i === currentIdx
        ? {
            ...s,
            textboxes: s.textboxes.map(tb =>
              tb.id === selectedTextBox.id ? { ...tb, paragraphSpacing: value } : tb
            ),
          }
        : s
    ));
  };
  // 6. Add textbox (title/body)
  const handleAddTextBox = type => {
    setSlides(prev => prev.map((s, i) =>
      i === currentIdx ? {
        ...s,
        textboxes: [
          ...s.textboxes,
          { ...defaultTextBox(type), y: 200 + 40 * s.textboxes.length }
        ]
      } : s
    ));
  };
  // 7. Delete textbox
  const handleDeleteTextBox = id => {
    setSlides(prev => prev.map((s, i) =>
      i === currentIdx ? {
        ...s,
        textboxes: s.textboxes.filter(tb => tb.id !== id)
      } : s
    ));
    setSelectedTextBoxId(null);
  };
  // 8. Keyboard support for deleting selected textbox
  useEffect(() => {
    const handleKeyDown = e => {
      if ((e.key === "Backspace" || e.key === "Delete") && selectedTextBoxId) {
        handleDeleteTextBox(selectedTextBoxId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTextBoxId]);

  // 9. Handle formatting changes for any textbox
  const handleTextBoxFormat = (id, prop, value) => {
    setSlides(prev => prev.map((s, i) =>
      i === currentIdx ? {
        ...s,
        textboxes: s.textboxes.map(tb => tb.id === id ? { ...tb, [prop]: value } : tb)
      } : s
    ));
  };

  // 10. Handle fontStyle toggles (bold, italic, underline)
  const handleTextBoxStyleToggle = (id, styleProp) => {
    setSlides(prev => prev.map((s, i) =>
      i === currentIdx ? {
        ...s,
        textboxes: s.textboxes.map(tb => tb.id === id ? {
          ...tb,
          fontStyle: { ...tb.fontStyle, [styleProp]: !tb.fontStyle?.[styleProp] }
        } : tb)
      } : s
    ));
  };

  // Slide navigation
  const handleAddSlide = () => {
    setSlides(prev => {
      const updated = [...prev];
      updated.splice(currentIdx + 1, 0, defaultSlide());
      return updated;
    });
    setCurrentIdx(idx => idx + 1);
  };
  const handleDeleteSlide = () => {
    if (slides.length === 1) return;
    setSlides(prev => {
      const updated = [...prev];
      updated.splice(currentIdx, 1);
      return updated;
    });
    setCurrentIdx(idx => Math.max(0, idx - 1));
  };
  const handleBackgroundColor = e => {
    setSlides(prev => {
      const updated = prev.map((s, i) =>
        i === currentIdx ? { ...s, background: { ...s.background, fill: e.target.value } } : s
      );
      return updated;
    });
  };
  // Font and paragraph controls
  const handleFontChange = (key, prop, value) => {
    setSlides(prev => {
      const updated = prev.map((s, i) =>
        i === currentIdx ? { ...s, [key]: { ...s[key], [prop]: value } } : s
      );
      return updated;
    });
  };
  // Toolbar handlers
  const handleToolbarToggleSection = (section, prop) => {
    if (section === "title") {
      setSlides(prev => prev.map((s, i) => i === currentIdx ? { ...s, title: { ...s.title, fontStyle: { ...s.title.fontStyle, [prop]: !s.title.fontStyle?.[prop] } } } : s));
    } else {
      setSlides(prev => prev.map((s, i) => i === currentIdx ? { ...s, body: { ...s.body, fontStyle: { ...s.body.fontStyle, [prop]: !s.body.fontStyle?.[prop] } } } : s));
    }
  };
  const handleToolbarColor = (section, color) => {
    if (section === "title") {
      setSlides(prev => prev.map((s, i) => i === currentIdx ? { ...s, title: { ...s.title, fill: color } } : s));
    } else {
      setSlides(prev => prev.map((s, i) => i === currentIdx ? { ...s, body: { ...s.body, fill: color } } : s));
    }
  };
  const handleToolbarHighlight = (section, color) => {
    if (section === "title") {
      setSlides(prev => prev.map((s, i) => i === currentIdx ? { ...s, title: { ...s.title, highlight: color } } : s));
    } else {
      setSlides(prev => prev.map((s, i) => i === currentIdx ? { ...s, body: { ...s.body, highlight: color } } : s));
    }
  };

  // Export to PowerPoint (calls backend)
  const handleExportPowerPoint = async () => {
    try {
      const response = await fetch("http://localhost:5000/generate-presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides,
          template: typeof template === "object" ? template.id : template,
          presentationType,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate the presentation.");
      }
      const blob = await response.blob();
      saveAs(blob, "edited_presentation.pptx");
    } catch (error) {
      alert(error.message || "An error occurred while exporting the presentation.");
    }
  };

  // Save and return
  const handleSave = () => {
    localStorage.setItem('latestEditedSlides', JSON.stringify(slides));
    navigate("/slides-generating", {
      state: {
        slides: slides, // Send the current, edited slides back
        template,
        presentationType,
        fromEditor: true, // Flag that these slides are from the editor
      },
    });
  };

  // Handlers for image
  const handleImageUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      setSlides(prev => {
        const updated = prev.map((s, i) =>
          i === currentIdx
            ? {
                ...s,
                image: {
                  src: evt.target.result,
                  x: 400,
                  y: 100,
                  width: 200,
                  height: 150,
                },
              }
            : s
        );
        return updated;
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="slide-editor-root">
      {/* Canva-style slide selector */}
      <div className="slide-selector-bar">
        {slides.map((s, idx) => {
          // Find title/body textboxes for thumbnail
          const titleBox = s.textboxes?.find(tb => tb.type === "title");
          const bodyBox = s.textboxes?.find(tb => tb.type === "body");
          return (
            <div
              key={idx}
              className={"slide-thumb" + (idx === currentIdx ? " selected" : "")}
              onClick={() => setCurrentIdx(idx)}
            >
              <div className="slide-thumb-label">Slide {idx + 1}</div>
              <div className="slide-thumb-content" style={{ background: s.background?.fill || "#fff" }}>
                <div className="slide-thumb-title">{titleBox ? titleBox.text : ""}</div>
                <div className="slide-thumb-body">{bodyBox ? bodyBox.text : ""}</div>
              </div>
              {slides.length > 1 && (
                <button
                  className="slide-thumb-delete"
                  onClick={e => {
                    e.stopPropagation();
                    setCurrentIdx(idx === 0 ? 0 : idx - 1);
                    setSlides(prev => prev.filter((_, i) => i !== idx));
                  }}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        <button className="slide-thumb-add" onClick={handleAddSlide}>+</button>
      </div>

      {/* Main editor area: sidebar | main (toolbar + slide) */}
      <div className="slide-editor-main">
        {/* --- Sidebar: only slide actions --- */}
        <div className="slide-editor-sidebar">
          <button onClick={() => handleAddTextBox('title')}>Add Title</button>
          <button onClick={() => handleAddTextBox('body')}>Add Body</button>
          <div style={{ width: '100%', margin: '12px 0' }}>
            <label style={{ fontSize: 13, color: '#222', marginBottom: 4 }}>Background</label>
            <input type="color" className="background-color-picker" value={slide.background?.fill || '#fff'} onChange={handleBackgroundColor} style={{ width: 28, height: 28, marginLeft: 8 }} />
          </div>
          <div style={{ width: '100%' }}>
            <label style={{ fontSize: 13, color: '#222', marginBottom: 4 }}>Image</label>
            <div className="image-upload-row">
              <button className="image-upload-btn" onClick={() => fileInputRef.current.click()}>Upload Image</button>
              <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
              {slide.image && <button className="remove-image-btn" onClick={() => setSlides(prev => prev.map((s, i) => i === currentIdx ? { ...s, image: null } : s))}>Remove</button>}
            </div>
          </div>
        </div>

        {/* --- Main area: toolbar above slide --- */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          {/* --- Formatting Toolbar (horizontal, above slide) --- */}
          <div className="slide-toolbar">
            <select
              value={selectedTextBox?.fontFamily || 'Arial'}
              onChange={e => handleToolbarChange('fontFamily', e.target.value)}
              disabled={!selectedTextBox} // Enable when a textbox is selected
            >
              {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select
              value={selectedTextBox?.fontSize || 24}
              onChange={e => handleToolbarChange('fontSize', Number(e.target.value))}
              disabled={!selectedTextBox} // Enable when a textbox is selected
            >
              {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              style={{ ...TOOLBAR_BUTTON_STYLE, fontSize: 15 }}
              onClick={() => handleToolbarToggle('bold')}
              disabled={!selectedTextBox} // Enable when a textbox is selected
              className={selectedTextBox?.fontStyle?.bold ? 'active' : ''}
            >
              <FaBold />
            </button>
            <button
              style={{ ...TOOLBAR_BUTTON_STYLE, fontSize: 15 }}
              onClick={() => handleToolbarToggle('italic')}
              disabled={!selectedTextBox} // Enable when a textbox is selected
              className={selectedTextBox?.fontStyle?.italic ? 'active' : ''}
            >
              <FaItalic />
            </button>
            <button
              style={{ ...TOOLBAR_BUTTON_STYLE, fontSize: 15 }}
              onClick={() => handleToolbarToggle('underline')}
              disabled={!selectedTextBox} // Enable when a textbox is selected
              className={selectedTextBox?.fontStyle?.underline ? 'active' : ''}
            >
              <FaUnderline />
            </button>
            <button
              style={{ ...TOOLBAR_BUTTON_STYLE, fontSize: 15 }}
              onClick={() => handleToolbarChange('align', 'left')}
              disabled={!selectedTextBox} // Enable when a textbox is selected
              className={selectedTextBox?.align === 'left' ? 'active' : ''}
            >
              <FaAlignLeft />
            </button>
            <button
              style={{ ...TOOLBAR_BUTTON_STYLE, fontSize: 15 }}
              onClick={() => handleToolbarChange('align', 'center')}
              disabled={!selectedTextBox} // Enable when a textbox is selected
              className={selectedTextBox?.align === 'center' ? 'active' : ''}
            >
              <FaAlignCenter />
            </button>
            <button
              style={{ ...TOOLBAR_BUTTON_STYLE, fontSize: 15 }}
              onClick={() => handleToolbarChange('align', 'right')}
              disabled={!selectedTextBox} // Enable when a textbox is selected
              className={selectedTextBox?.align === 'right' ? 'active' : ''}
            >
              <FaAlignRight />
            </button>
            <button
              style={{ ...TOOLBAR_BUTTON_STYLE, fontSize: 15 }}
              onClick={() => handleToolbarChange('align', 'justify')}
              disabled={!selectedTextBox} // Enable when a textbox is selected
              className={selectedTextBox?.align === 'justify' ? 'active' : ''}
            >
              <FaAlignJustify />
            </button>
            <button
              style={{ ...TOOLBAR_BUTTON_STYLE, fontSize: 15 }}
              onClick={() => selectedTextBox && handleBulletsToggle(selectedTextBox.id)}
              disabled={!selectedTextBox} // Enable when a textbox is selected
              className={selectedTextBox?.bullets ? 'active' : ''}
            >
              •
            </button>
            <input
              type="color"
              value={selectedTextBox?.fill || '#222'}
              onChange={e => handleToolbarChange('fill', e.target.value)}
              disabled={!selectedTextBox}
            />
            <button style={{ ...TOOLBAR_BUTTON_STYLE, fontSize: 15 }} onClick={() => {}} disabled={!selectedTextBox}><FaHighlighter /></button>
          </div>

          {/* --- Slide Preview/Editor --- */}
          <div
            className="slide-preview"
            style={{
              position: "relative",
              background: slide.background?.fill || "#fff",
              width: "80%",
              aspectRatio: "16 / 9",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              margin: "auto",
              border: "1px solid #ccc",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              overflow: "hidden"
            }}
            onDragOver={e => { // ADDED onDragOver to slide-preview
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={e => { // ADDED onDrop to slide-preview
              e.preventDefault();
              const dragDataString = e.dataTransfer.getData("text/plain");
              if (!dragDataString) return;

              try {
                const dragData = JSON.parse(dragDataString);
                const slidePreviewRect = e.currentTarget.getBoundingClientRect();

                let newX = e.clientX - slidePreviewRect.left - dragData.offsetX;
                let newY = e.clientY - slidePreviewRect.top - dragData.offsetY;

                // Basic boundary checks
                newX = Math.max(0, newX);
                newY = Math.max(0, newY);
                // Optionally, prevent dragging out of right/bottom bounds too
                // newX = Math.min(newX, slidePreviewRect.width - dragData.width); // dragData would need width
                // newY = Math.min(newY, slidePreviewRect.height - dragData.height); // dragData would need height

                handleTextSetPosition(dragData.id, newX, newY);
              } catch (error) {
                console.error("Error processing drop data:", error);
              }
            }}
          >
            {/* Render all textboxes */}
            {slide.textboxes.map(tb => (
              <div
                key={tb.id}
                className={"slide-textbox" + (selectedTextBoxId === tb.id ? " selected" : "")}
                style={{
                  position: "absolute",
                  left: `${tb.x}px`,
                  top: `${tb.y}px`,
                  width: `${tb.width}px`,
                  height: `${tb.height}px`, // Ensure height is from state
                  fontSize: `${tb.fontSize}px`,
                  fontFamily: tb.fontFamily,
                  color: tb.fill,
                  fontWeight: tb.fontStyle?.bold ? "bold" : "normal",
                  fontStyle: tb.fontStyle?.italic ? "italic" : "normal",
                  textDecoration: tb.fontStyle?.underline ? "underline" : "none",
                  lineHeight: tb.lineHeight,
                  textAlign: tb.align,
                  outline: selectedTextBoxId === tb.id ? "2px solid #1976d2" : "none",
                  background: selectedTextBoxId === tb.id ? "#f5faff" : "transparent",
                  padding: "8px",
                  boxSizing: "border-box",
                  overflowWrap: "break-word",
                  wordWrap: "break-word",
                  overflow: "auto",
                  resize: "both",
                  cursor: "move"
                }}
                contentEditable
                suppressContentEditableWarning
                spellCheck={true}
                onInput={e => {
                  handleContentEdit(tb.id, e);
                  const selection = window.getSelection();
                  if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    // Ensure the selection is within the current contentEditable element
                    if (e.currentTarget.contains(range.commonAncestorContainer)) {
                      if (range.toString().length > 0) {
                        setSelectedTextBoxId(tb.id);
                        setSelectedTextRange({
                          start: range.startOffset,
                          end: range.endOffset
                        });
                      } else {
                        setSelectedTextRange(null); // Clear range if no text is highlighted
                      }
                    }
                  }
                }}
                onClick={e => { e.stopPropagation(); setSelectedTextBoxId(tb.id); setSelectedTextRange(null); }} // Clear text range on simple click
                onBlur={e => {
                  const textboxDiv = e.currentTarget;
                  const currentWidth = textboxDiv.offsetWidth;
                  const currentHeight = textboxDiv.offsetHeight;

                  handleTextResize(tb.id, currentWidth, currentHeight);

                  const relatedTarget = e.relatedTarget;
                  const slidePreviewDiv = textboxDiv.closest('.slide-preview');
                  if (!slidePreviewDiv) {
                    setSelectedTextBoxId(null);
                    setSelectedTextRange(null);
                    return;
                  }
                  const mainContentArea = slidePreviewDiv.parentElement;
                  if (!mainContentArea) {
                    setSelectedTextBoxId(null);
                    setSelectedTextRange(null);
                    return;
                  }
                  const toolbarDiv = mainContentArea.querySelector('.slide-toolbar');
                  if (toolbarDiv && relatedTarget && toolbarDiv.contains(relatedTarget)) {
                    return;
                  }
                  setSelectedTextBoxId(null);
                  setSelectedTextRange(null);
                }}
                tabIndex={0}
                draggable // Keep draggable attribute
                onDragStart={e => { // MODIFIED onDragStart
                  const rect = e.target.getBoundingClientRect();
                  const dragData = {
                    id: tb.id,
                    offsetX: e.clientX - rect.left,
                    offsetY: e.clientY - rect.top
                    // You could also include tb.width and tb.height here if needed for boundary checks in onDrop
                    // width: rect.width,
                    // height: rect.height
                  };
                  e.dataTransfer.setData("text/plain", JSON.stringify(dragData));
                  e.dataTransfer.effectAllowed = "move";
                  setSelectedTextBoxId(tb.id);
                }}
                // REMOVED onDragEnd, onDragOver, onDrop from individual textboxes
              >
                {tb.bullets
                  ? tb.text.split("\n").map((line, i) => <div key={i} style={{ marginBottom: tb.paragraphSpacing }}>{line ? <>&bull; {line}</> : <br />}</div>)
                  : tb.text.split("\n").map((line, i) => <div key={i} style={{ marginBottom: tb.paragraphSpacing }}>{line || <br />}</div>)}
              </div>
            ))}
            {/* Konva image rendering (below text for drag/resize) */}
            {slide.image && (
              <Stage
                width={SLIDE_WIDTH}
                height={SLIDE_HEIGHT}
                style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
              >
                <Layer>
                  <SlideImage
                    src={slide.image.src}
                    x={slide.image.x}
                    y={slide.image.y}
                    width={slide.image.width}
                    height={slide.image.height}
                    isSelected={false}
                    onSelect={() => {}}
                    onChange={() => {}}
                  />
                </Layer>
              </Stage>
            )}
          </div>      {/* END slide-preview */}
        </div>  </div>  {/* --- Floating Action Bar (bottom) --- */}
  <div className="slide-editor-actions">
    {/* Ensure proper JSX closure */}
    <button onClick={handleAddSlide}>Add Slide</button>
    <button onClick={handleDeleteSlide}>Delete Slide</button>
    <button onClick={handleSave}>Save & Return</button>
    <button onClick={handleExportPowerPoint}>Export to PowerPoint</button>
  </div>
</div>
);
}

export default SlideEditor;
