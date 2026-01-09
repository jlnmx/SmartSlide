import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Stage, Layer, Text, Rect, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import { saveAs } from "file-saver";
import { FaBold, FaItalic, FaUnderline, FaAlignLeft, FaAlignCenter, FaAlignRight, FaAlignJustify, FaHighlighter } from "react-icons/fa";
import { v4 as uuidv4 } from "uuid";
import "../styles/SlideEditor.css";
import config from "../config";
import { getAllTemplates, getCurrentUserId, BUILTIN_TEMPLATES } from "../utils/templateUtils";

// Returns the template object by id (for static image-based templates)
const getTailwindTemplateById = (id, templatesList = []) => {
  return templatesList.find(t => t.id === id) || BUILTIN_TEMPLATES.find(t => t.id === id);
};

const SLIDE_WIDTH = 960;
const SLIDE_HEIGHT = 540;
const TEXTBOX_PADDING = 10;

function getNodePath(root, node) {
  const path = [];
  let current = node;
  while (current && current !== root) {
    const parent = current.parentNode;
    if (!parent) break;
    const index = Array.prototype.indexOf.call(parent.childNodes, current);
    path.unshift(index);
    current = parent;
  }
  return path;
}
// Returns the node at a given path from root
function getNodeByPath(root, path) {
  let node = root;
  for (let i = 0; i < path.length; i++) {
    if (!node || !node.childNodes) return null;
    node = node.childNodes[path[i]];
  }
  return node;
}
// Returns selection state (path and offset for start/end)
function getSelectionState(element) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  return {
    start: {
      path: getNodePath(element, range.startContainer),
      offset: range.startOffset
    },
    end: {
      path: getNodePath(element, range.endContainer),
      offset: range.endOffset
    }
  };
}

// Helper for restoring selection state (ensure this is at the top of the file)
function restoreSelectionState(element, state) {
  if (!state) return;
  const sel = window.getSelection();
  sel.removeAllRanges();
  const range = document.createRange();
  const startNode = getNodeByPath(element, state.start.path);
  const endNode = getNodeByPath(element, state.end.path);
  if (startNode && endNode) {
    try {
      range.setStart(startNode, Math.min(state.start.offset, startNode.nodeType === Node.TEXT_NODE ? startNode.textContent.length : startNode.childNodes.length));
      range.setEnd(endNode, Math.min(state.end.offset, endNode.nodeType === Node.TEXT_NODE ? endNode.textContent.length : endNode.childNodes.length));
      sel.addRange(range);
    } catch (e) {
      // Fallback: place cursor at end
      range.selectNodeContents(element);
      range.collapse(false);
      sel.addRange(range);
    }
  }
}

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

const defaultTextBox = (type = "body") => {
  if (type === "title") {
    return {
      id: Math.random().toString(36).substr(2, 9),
      type: "title",
      text: "Title",
      x: 60,
      y: 60,
      width: 680, // Title width
      height: 80, // Title height
      fontSize: 36,
      fill: "#000000",
      fontFamily: "Arial",
      fontStyle: { bold: true },
      align: "left",
      lineHeight: 1,
      paragraphSpacing: 0,
      bullets: false,
      highlight: "#ffffff"
    };
  } else {
    return {
      id: Math.random().toString(36).substr(2, 9),
      type: "body",
      text: "Body text here...",
      x: 60,
      y: 150,
      width: 800, // Body width
      height: 350, // Body height
      fontSize: 24,
      fill: "#000000",
      fontFamily: "Arial",
      fontStyle: {},
      align: "left",
      lineHeight: 1,
      paragraphSpacing: 0,
      bullets: false,
      highlight: "#ffffff"
    };
  }
};


// --- BUSINESS TEMPLATE ---
function renderBusinessBackground({ isTitle = false } = {}) {
  const imgSrc = isTitle
    ? "/static/template_backgrounds/tailwind-business_title.png"
    : "/static/template_backgrounds/tailwind-business_content.png";
  return (
    <img
      src={imgSrc}
      alt="Business Template Background"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        zIndex: 0,
        objectFit: "cover"
      }}
      draggable={false}
    />
  );
}

function renderBusinessContentBox(children, { isTitle = false } = {}) {
  return <>{children}</>;
}

// --- CREATIVE TEMPLATE ---
function renderCreativeBackground({ isTitle = false } = {}) {
  const imgSrc = isTitle
    ? "/static/template_backgrounds/tailwind-creative_title.png"
    : "/static/template_backgrounds/tailwind-creative_content.png";
  return (
    <img
      src={imgSrc}
      alt="Creative Template Background"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        zIndex: 0,
        objectFit: "cover"
      }}
      draggable={false}
    />
  );
}

function renderCreativeContentBox(children, { isTitle = false } = {}) {
  return <>{children}</>;
}

// --- EDUCATION TEMPLATE ---
function renderEducationBackground({ isTitle = false } = {}) {
  const imgSrc = isTitle
    ? "/static/template_backgrounds/tailwind-education_title.png"
    : "/static/template_backgrounds/tailwind-education_content.png";
  return (
    <img
      src={imgSrc}
      alt="Education Template Background"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        zIndex: 0,
        objectFit: "cover"
      }}
      draggable={false}
    />
  );
}

function renderEducationContentBox(children, { isTitle = false } = {}) {
  return <>{children}</>;
}

// --- ABSTRACT TEMPLATE ---
function renderAbstractBackground({ isTitle = false } = {}) {
  const imgSrc = isTitle
    ? "/static/template_backgrounds/tailwind-abstract-gradient_title.png"
    : "/static/template_backgrounds/tailwind-abstract-gradient_content.png";
  return (
    <img
      src={imgSrc}
      alt="Abstract Template Background"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        zIndex: 0,
        objectFit: "cover"
      }}
      draggable={false}
      onError={e => {
        console.error("Failed to load abstract background image:", imgSrc);
        e.target.style.display = 'none';
      }}
    />
  );
}

function renderAbstractContentBox(children, { isTitleSlide = false }) {
  return <>{children}</>;
}

// --- CUSTOM TEMPLATE BACKGROUND ---
function renderCustomBackground({ templateUrl, isTitle = false } = {}) {
  if (!templateUrl) return null;
  
  return (
    <img
      src={templateUrl}
      alt="Custom Template Background"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        zIndex: 0,
        objectFit: "cover"
      }}
      draggable={false}
      onError={e => {
        console.error("Failed to load custom background image:", templateUrl);
        e.target.style.display = 'none';
      }}
    />
  );
}

const defaultSlide = (templateId) => {
  switch (templateId) {
    case "tailwind-business":
      return {
        textboxes: [
          { ...defaultTextBox("title"), y: 80, x: 80, width: 800 },
          { ...defaultTextBox("body"), y: 180, x: 100, width: 760 }
        ],
        background: { fill: "#fff" },
        image: null
      };
    case "tailwind-creative":
      return {
        textboxes: [
          { ...defaultTextBox("title"), y: 70, x: 70, width: 820 },
          { ...defaultTextBox("body"), y: 200, x: 120, width: 720 }
        ],
        background: { fill: "#FFF8DC" },
        image: null
      };
    case "tailwind-education":
      return {
        textboxes: [
          { ...defaultTextBox("title"), x: 180, y: 90, width: 600, height: 60 }, // Centered in white box
          { ...defaultTextBox("body"), x: 200, y: 180, width: 560, height: 320 } // Centered in white box
        ],
        background: { fill: "#fff" },
        image: null
      };
    default:
      return {
        textboxes: [
          { ...defaultTextBox("title"), y: 60 },
          { ...defaultTextBox("body"), y: 150 }
        ],
        background: { fill: "#fff" },
        image: null
      };
  }
};

function mapGeneratedSlideToEditorFormat(s) {
  const slide = {
    textboxes: [
      { ...defaultTextBox("title"), text: s.title || "Title", x: 40, y: 30, width: 400 },
      { ...defaultTextBox("body"), text: Array.isArray(s.content) ? s.content.join("\n") : (s.content || "Body text here..."), x: 40, y: 130, width: 400 }
    ],
    background: { fill: "#fff" },
    image: null,
    images: s.images || []
  };
  
  // If slide has AI-generated image_url, add it to images array on right side
  if (s.image_url && !slide.images.some(img => img.src === s.image_url)) {
    slide.images.push({
      id: `ai-image-${Date.now()}`,
      src: s.image_url,
      x: 480,
      y: 50,
      width: 450,
      height: 440,
      zIndex: 101
    });
  }
  
  return slide;
}

const mapIfNeeded = (slideArray) => {
  if (!slideArray || !Array.isArray(slideArray) || slideArray.length === 0) {
    return [defaultSlide()]; 
  }
  const firstSlide = slideArray[0];
  if (firstSlide && typeof firstSlide === 'object' && Array.isArray(firstSlide.textboxes)) {
    return slideArray;
  }
  return slideArray.map(mapGeneratedSlideToEditorFormat);
};

const FONT_FAMILIES = [
  // Sans-serif fonts
  "Arial", 
  "Helvetica", 
  "Verdana", 
  "Tahoma", 
  "Trebuchet MS", 
  "Geneva", 
  "Arial Black",
  "Impact",
  "Lucida Sans Unicode",
  "Franklin Gothic Medium",
  
  // Serif fonts
  "Times New Roman", 
  "Georgia", 
  "Times", 
  "Book Antiqua", 
  "Palatino Linotype",
  "Baskerville",
  "Garamond",
  "Cambria",
  
  // Monospace fonts
  "Courier New", 
  "Monaco", 
  "Consolas", 
  "Lucida Console",
  "Menlo",
  "Source Code Pro",
  
  // Display/Decorative fonts
  "Comic Sans MS",
  "Brush Script MT",
  "Papyrus",
  "Chalkduster",
  "Marker Felt",
  
  // Modern/Clean fonts
  "Calibri",
  "Segoe UI",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Inter",
  "Source Sans Pro",
  "Nunito"
];
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64];
const LINE_HEIGHTS = [1, 1.15, 1.5, 2];
const TEXT_ALIGNS = ["left", "center", "right", "justify"];
const PARAGRAPH_SPACINGS = [0, 4, 8, 12, 16, 20, 24, 28, 32]; // Corresponds to spacing options 1.0, 1.5, 2.0, 2.5, 3.0

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
  const { slides: slidesFromNav, template, presentationType, presentationId: presentationIdFromNav } = location.state || {};
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  // Load templates on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      setTemplatesLoading(true);
      try {
        const userId = getCurrentUserId();
        const allTemplates = await getAllTemplates(userId);
        setTemplates(allTemplates);
      } catch (error) {
        console.error('Error loading templates:', error);
        // Fallback to built-in templates only
        setTemplates(BUILTIN_TEMPLATES);
      } finally {
        setTemplatesLoading(false);
      }
    };

    loadTemplates();
  }, []);

  useEffect(() => {
    let templateObj = null;
    if (template && typeof template === "object" && template.id) {
      templateObj = getTailwindTemplateById(template.id, templates) || template;
    } else if (typeof template === "string") {
      templateObj = getTailwindTemplateById(template, templates) || null;
    }
    setCurrentTemplate(templateObj);
  }, [template, templates]);
  const [slides, setSlides] = useState([]);  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedTextBoxId, setSelectedTextBoxId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedTextRange, setSelectedTextRange] = useState(null);
  const [selectionRestore, setSelectionRestore] = useState(null); // For cursor position restoration
    // Image dragging and resizing states
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isResizingImage, setIsResizingImage] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  // Slide thumbnail dragging state for reordering
  const [draggedSlideIndex, setDraggedSlideIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
    // Template popup state
  const [showTemplatePopup, setShowTemplatePopup] = useState(false);
  
  // Text dragging states
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [draggedTextId, setDraggedTextId] = useState(null);
  const [textDragStart, setTextDragStart] = useState({ x: 0, y: 0 });
  
  // Undo/Redo History Management state
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedo, setIsUndoRedo] = useState(false);
  
  const fileInputRef = useRef();
  const stageRef = useRef();
  const contentEditableRefs = useRef(new Map()); // Track contentEditable DOM elements
  const [presentationId, setPresentationId] = useState(presentationIdFromNav || null); // Added to store presentation ID

  useEffect(() => {
    console.log("SlideEditor presentationId:", presentationId, "from nav:", presentationIdFromNav);
  }, [presentationId, presentationIdFromNav]);  // Load slides from localStorage on mount only
  useEffect(() => {
    // If we have a presentationId from navigation, prioritize navigation state over localStorage
    if (presentationIdFromNav && slidesFromNav && Array.isArray(slidesFromNav) && slidesFromNav.length > 0) {
      setSlides(mapIfNeeded(slidesFromNav));
      return;
    }
    
    // Otherwise, try localStorage first
    const storedSlides = localStorage.getItem('latestEditedSlides');
    if (storedSlides) {
      try {
        const parsedSlides = JSON.parse(storedSlides);
        if (Array.isArray(parsedSlides) && parsedSlides.length > 0) {
          setSlides(mapIfNeeded(parsedSlides));
          return;
        }
      } catch (e) {
        console.error('Failed to parse slides from localStorage:', e);
        localStorage.removeItem('latestEditedSlides');
      }
    }
    // Fallback to navigation state
    if (slidesFromNav && Array.isArray(slidesFromNav) && slidesFromNav.length > 0) {
      setSlides(mapIfNeeded(slidesFromNav));
    } else {
      setSlides([defaultSlide()]);
    }
  }, []); // Only run on mount

  // Save slides to localStorage whenever they change
  useEffect(() => {
    if (slides && Array.isArray(slides)) {
      localStorage.setItem('latestEditedSlides', JSON.stringify(slides));
    }  }, [slides]); // This effect runs when 'slides' state changes

  const slide = slides[currentIdx] || defaultSlide(currentTemplate?.id); // Ensure slide is always defined
  const selectedTextBox = slide.textboxes.find(tb => tb.id === selectedTextBoxId);
  const isFormattingEnabled = !!selectedTextBox || selectedImage;

  // Cleanup effect to prevent memory leaks and DOM conflicts
  useEffect(() => {
    return () => {
      // Clear all timeouts and contentEditable refs on unmount
      contentEditableRefs.current.forEach((ref) => {
        if (ref?.timeout) {
          clearTimeout(ref.timeout);
        }
      });
      contentEditableRefs.current.clear();
    };
  }, []);
  // Cleanup timeouts when textboxes are deleted
  useEffect(() => {
    const currentTextboxIds = new Set(slide.textboxes.map(tb => tb.id));
    
    // Clear refs for deleted textboxes
    const refsToDelete = [];
    contentEditableRefs.current.forEach((ref, id) => {
      if (!currentTextboxIds.has(id)) {
        if (ref?.timeout) {
          clearTimeout(ref.timeout);
        }
        refsToDelete.push(id);
      }
    });
    
    refsToDelete.forEach(id => {
      contentEditableRefs.current.delete(id);
    });  }, [slide.textboxes]);

  // Restore cursor position after slides state updates
  useEffect(() => {
    if (selectionRestore) {
      const { textboxId, state } = selectionRestore;
      const element = document.querySelector(`[data-tbid="${textboxId}"]`);
      if (element) {
        // Small delay to ensure DOM is updated
        setTimeout(() => {
          restoreSelectionState(element, state);
          setSelectionRestore(null);
        }, 10);
      } else {
        setSelectionRestore(null);
      }
    }  }, [slides, selectionRestore]);

  // Undo/Redo History Management
  const saveToHistory = useCallback((newSlides, newCurrentIdx, description = '') => {
    if (isUndoRedo) return; // Don't save during undo/redo operations
    
    const snapshot = {
      slides: JSON.parse(JSON.stringify(newSlides)), // Deep clone
      currentIdx: newCurrentIdx,
      selectedTextBoxId: selectedTextBoxId,
      selectedImage: selectedImage,
      currentTemplate: currentTemplate ? { ...currentTemplate } : null,
      timestamp: Date.now(),
      description
    };
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1); // Remove any future history
      newHistory.push(snapshot);
      // Limit history to 50 entries to prevent memory issues
      if (newHistory.length > 50) {
        newHistory.shift();
        setHistoryIndex(curr => curr); // Keep same relative position
        return newHistory;
      }
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [isUndoRedo, historyIndex, selectedTextBoxId, selectedImage, currentTemplate]);

  // Initialize history with current state
  useEffect(() => {
    if (slides.length > 0 && history.length === 0) {
      saveToHistory(slides, currentIdx, 'Initial state');
    }
  }, [slides, history.length, currentIdx, saveToHistory]);

  // Undo function
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setIsUndoRedo(true);
      const prevSnapshot = history[historyIndex - 1];
      
      setSlides(prevSnapshot.slides);
      setCurrentIdx(prevSnapshot.currentIdx);
      setSelectedTextBoxId(prevSnapshot.selectedTextBoxId);
      setSelectedImage(prevSnapshot.selectedImage);
      if (prevSnapshot.currentTemplate) {
        setCurrentTemplate(prevSnapshot.currentTemplate);
      }
      setHistoryIndex(historyIndex - 1);
      
      // Reset the flag after a short delay
      setTimeout(() => setIsUndoRedo(false), 10);
    }
  }, [history, historyIndex]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setIsUndoRedo(true);
      const nextSnapshot = history[historyIndex + 1];
      
      setSlides(nextSnapshot.slides);
      setCurrentIdx(nextSnapshot.currentIdx);
      setSelectedTextBoxId(nextSnapshot.selectedTextBoxId);
      setSelectedImage(nextSnapshot.selectedImage);
      if (nextSnapshot.currentTemplate) {
        setCurrentTemplate(nextSnapshot.currentTemplate);
      }
      setHistoryIndex(historyIndex + 1);
      
      // Reset the flag after a short delay
      setTimeout(() => setIsUndoRedo(false), 10);
    }
  }, [history, historyIndex]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in a contentEditable element
      if (e.target && e.target.contentEditable === 'true') {
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Helper function to update slides with history tracking
  const updateSlidesWithHistory = useCallback((newSlides, description = '') => {
    setSlides(newSlides);
    saveToHistory(newSlides, currentIdx, description);
  }, [currentIdx, saveToHistory]);

  // Helper function to update slides and current index with history tracking
  const updateSlidesAndIndexWithHistory = useCallback((newSlides, newIdx, description = '') => {
    setSlides(newSlides);
    setCurrentIdx(newIdx);
    saveToHistory(newSlides, newIdx, description);
  }, [saveToHistory]);
  const TEXT_Z_INDEX = 100;
  const MIN_IMAGE_Z_INDEX = 0;
  const DEFAULT_IMAGE_Z_INDEX = 101; // Should match what handleImageUpload sets

  // 3. Handle contenteditable changes for any textbox  
  const handleContentEdit = useCallback((id, e) => {
    e.stopPropagation();
    const newText = e.target.innerText;

    let selection = null;
    if (document.activeElement === e.target) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        selection = sel.getRangeAt(0);
      }
    }

    const newSlides = slides.map((s, i) =>
      i === currentIdx ? {
        ...s,
        textboxes: s.textboxes.map(tb => tb.id === id ? { ...tb, text: newText } : tb)
      } : s
    );
    updateSlidesWithHistory(newSlides, 'Edit text content');

    // --- Cursor Fix: Restore selection after update ---
    setTimeout(() => {
      if (selection && contentEditableRefs.current.has(id)) {
        const ref = contentEditableRefs.current.get(id);
        if (ref && ref.element) {
          ref.element.focus();
          // Restore selection
          const range = document.createRange();
          range.selectNodeContents(ref.element);
          range.collapse(false); // Place cursor at end
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }, 0);
  }, [currentIdx, slides, updateSlidesWithHistory]);
  // 4. Handle drag for any textbox
  const handleTextDrag = (id, dx, dy) => {
    const newSlides = slides.map((s, i) =>
      i === currentIdx ? {
        ...s,
        textboxes: s.textboxes.map(tb => tb.id === id ? { ...tb, x: tb.x + dx, y: tb.y + dy } : tb)
      } : s
    );
    updateSlidesWithHistory(newSlides, 'Move textbox');
  };
  // 5. Handle resize for any textbox
  const handleTextResize = (id, newWidth, newHeight) => {
    const newSlides = slides.map((s, i) =>
      i === currentIdx ? {
        ...s,
        textboxes: s.textboxes.map(tb => tb.id === id ? { ...tb, width: newWidth, height: newHeight } : tb)
      } : s
    );
    updateSlidesWithHistory(newSlides, 'Resize textbox');
  };
  // NEW: Handle setting absolute position for a textbox
  const handleTextSetPosition = (id, newX, newY) => {
    const newSlides = slides.map((s, i) =>
      i === currentIdx ? {
        ...s,
        textboxes: s.textboxes.map(tb => tb.id === id ? { ...tb, x: newX, y: newY } : tb)
      } : s
    );
    updateSlidesWithHistory(newSlides, 'Set textbox position');
  };
  // Enhanced image drag handling with mouse events
  const handleImageMouseDown = (e, idx) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedImage(idx);
    setIsDraggingImage(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleImageMouseMove = (e) => {
    if (!isDraggingImage || selectedImage === null) return;
    
    e.preventDefault();
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    const slide = slides[currentIdx];
    if (slide && slide.images && slide.images[selectedImage]) {
      const currentImage = slide.images[selectedImage];
      const newX = Math.max(0, Math.min(800 - currentImage.width, currentImage.x + deltaX));
      const newY = Math.max(0, Math.min(600 - currentImage.height, currentImage.y + deltaY));
      
      handleImageDrag(selectedImage, newX, newY);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleImageMouseUp = () => {
    setIsDraggingImage(false);
  };

  // Image resize handling
  const handleImageResizeMouseDown = (e, idx) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedImage(idx);
    setIsResizingImage(true);
    
    const slide = slides[currentIdx];
    if (slide && slide.images && slide.images[idx]) {
      const image = slide.images[idx];
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: image.width,
        height: image.height
      });
    }
  };

  const handleImageResizeMouseMove = (e) => {
    if (!isResizingImage || selectedImage === null) return;
    
    e.preventDefault();
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    
    const newWidth = Math.max(50, Math.min(400, resizeStart.width + deltaX));
    const newHeight = Math.max(50, Math.min(400, resizeStart.height + deltaY));
    
    handleImageResize(selectedImage, newWidth, newHeight);
  };  const handleImageResizeMouseUp = () => {
    setIsResizingImage(false);
  };
  // Enhanced text drag handling with mouse events
  const handleTextMouseDown = (e, textboxId) => {
    // Only start dragging if not clicking on contentEditable content
    if (e.target.contentEditable === 'true' || e.target.isContentEditable) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedTextBoxId(textboxId);
    setIsDraggingText(true);
    setDraggedTextId(textboxId);
    setTextDragStart({
      x: e.clientX,
      y: e.clientY
    });
    
    // Add visual feedback
    const textElement = document.querySelector(`[data-tbid="${textboxId}"]`);
    if (textElement) {
      textElement.classList.add('dragging');
    }
  };

  const handleTextMouseMove = (e) => {
    if (!isDraggingText || !draggedTextId) return;
    
    e.preventDefault();
    const deltaX = e.clientX - textDragStart.x;
    const deltaY = e.clientY - textDragStart.y;
    
    const slide = slides[currentIdx];
    if (slide && slide.textboxes) {
      const textbox = slide.textboxes.find(tb => tb.id === draggedTextId);
      if (textbox) {
        const newX = Math.max(0, Math.min(800 - textbox.width, textbox.x + deltaX));
        const newY = Math.max(0, Math.min(600 - textbox.height, textbox.y + deltaY));
        
        handleTextSetPosition(draggedTextId, newX, newY);
        setTextDragStart({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleTextMouseUp = () => {
    // Remove visual feedback
    if (draggedTextId) {
      const textElement = document.querySelector(`[data-tbid="${draggedTextId}"]`);
      if (textElement) {
        textElement.classList.remove('dragging');
      }
    }
    
    setIsDraggingText(false);
    setDraggedTextId(null);
  };

  // Slide thumbnail drag handlers for reordering
  const handleSlideThumbDragStart = (e, index) => {
    setDraggedSlideIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.dataTransfer.setDragImage(e.target, 60, 34); // Center the drag image
  };

  const handleSlideThumbDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleSlideThumbDragLeave = (e) => {
    // Only clear drag over if we're leaving the thumbnail area completely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleSlideThumbDrop = (e, dropIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (draggedSlideIndex === null || draggedSlideIndex === dropIndex) {
      setDraggedSlideIndex(null);
      return;
    }    // Reorder slides array
    const newSlides = (() => {
      const newSlidesArray = [...slides];
      const draggedSlide = newSlidesArray[draggedSlideIndex];
      
      // Remove dragged slide from its original position
      newSlidesArray.splice(draggedSlideIndex, 1);
      
      // Insert at new position
      const actualDropIndex = draggedSlideIndex < dropIndex ? dropIndex - 1 : dropIndex;
      newSlidesArray.splice(actualDropIndex, 0, draggedSlide);
      
      return newSlidesArray;
    })();

    // Update current slide index if necessary
    let newCurrentIdx = currentIdx;
    if (currentIdx === draggedSlideIndex) {
      // If current slide was moved, update currentIdx to follow it
      newCurrentIdx = draggedSlideIndex < dropIndex ? dropIndex - 1 : dropIndex;
    } else if (currentIdx > draggedSlideIndex && currentIdx <= dropIndex) {
      // Current slide shifted left
      newCurrentIdx = currentIdx - 1;
    } else if (currentIdx >= dropIndex && currentIdx < draggedSlideIndex) {
      // Current slide shifted right
      newCurrentIdx = currentIdx + 1;
    }

    updateSlidesAndIndexWithHistory(newSlides, newCurrentIdx, 'Reorder slides');

    setDraggedSlideIndex(null);
  };

  const handleSlideThumbDragEnd = () => {
    setDraggedSlideIndex(null);
    setDragOverIndex(null);
  };  // Global mouse event listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      handleImageMouseMove(e);
      handleImageResizeMouseMove(e);
      handleTextMouseMove(e);
    };

    const handleGlobalMouseUp = () => {
      handleImageMouseUp();
      handleImageResizeMouseUp();
      handleTextMouseUp();
    };

    if (isDraggingImage || isResizingImage || isDraggingText) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDraggingImage, isResizingImage, isDraggingText, dragStart, resizeStart, textDragStart, selectedImage, draggedTextId]);
  // Fix drag-and-drop functionality and add a side toolbar for image positioning
  const handleImageDrag = (idx, newX, newY) => {
    const newSlides = slides.map((s, i) =>
      i === currentIdx ? {
        ...s,
        images: s.images.map((img, j) =>
          j === idx ? { ...img, x: newX, y: newY } : img
        )
      } : s
    );
    updateSlidesWithHistory(newSlides, 'Move image');
  };
  const handleImageResize = (idx, newWidth, newHeight) => {
    const newSlides = slides.map((s, i) =>
      i === currentIdx ? {
        ...s,
        images: s.images.map((img, j) =>
          j === idx ? { ...img, width: newWidth, height: newHeight } : img
        )
      } : s
    );
    updateSlidesWithHistory(newSlides, 'Resize image');
  };
  const handleImagePositionChange = (command) => {
    if (selectedImage === null || typeof selectedImage !== 'number') {
      return;
    }

    const newSlides = (() => {
      const slidesCopy = [...slides];
      const slideToUpdate = { ...slidesCopy[currentIdx] };

      if (!slideToUpdate.images || selectedImage < 0 || selectedImage >= slideToUpdate.images.length) {
        console.warn("handleImagePositionChange: Invalid selectedImage index or images array missing.");
        return slides;
      }

      const imageToUpdate = slideToUpdate.images[selectedImage];
      const currentZ = typeof imageToUpdate.zIndex === 'number' ? imageToUpdate.zIndex : DEFAULT_IMAGE_Z_INDEX;
      let newZ = currentZ;

      const allImageZIndexes = slideToUpdate.images.map(img => typeof img.zIndex === 'number' ? img.zIndex : DEFAULT_IMAGE_Z_INDEX);

      let effectiveCommand = command;
      if (command === 'behind') effectiveCommand = 'to-back';
      if (command === 'in-front') effectiveCommand = 'to-front';

      switch (effectiveCommand) {
        case 'to-front':
          const maxZAmongAll = allImageZIndexes.length > 0 ? Math.max(...allImageZIndexes) : TEXT_Z_INDEX - 1;
          newZ = Math.max(maxZAmongAll, TEXT_Z_INDEX) + 1;
          break;
        case 'to-back':
          const minZAmongAll = allImageZIndexes.length > 0 ? Math.min(...allImageZIndexes) : TEXT_Z_INDEX + 1;
          newZ = Math.min(minZAmongAll, TEXT_Z_INDEX) - 1;
          newZ = Math.max(newZ, MIN_IMAGE_Z_INDEX);
          break;
        case 'forward':
          if (currentZ < TEXT_Z_INDEX) {
            newZ = TEXT_Z_INDEX + 1; 
          } else {
            newZ = currentZ + 1; 
          }
          break;
        case 'backward':
          if (currentZ > TEXT_Z_INDEX) {
            newZ = currentZ - 1;
            if (newZ === TEXT_Z_INDEX) { 
              newZ = TEXT_Z_INDEX - 1;
            }
          } else { 
            newZ = currentZ - 1;
          }
          newZ = Math.max(newZ, MIN_IMAGE_Z_INDEX); 
          break;
        default:
          console.warn(`Unknown image position command: ${effectiveCommand}`);
          return slides; 
      }

      const updatedImage = { ...imageToUpdate, zIndex: newZ };

      const newImagesArray = slideToUpdate.images.map((img, index) =>
        index === selectedImage ? updatedImage : img
      );

      slideToUpdate.images = newImagesArray;
      slidesCopy[currentIdx] = slideToUpdate;

      return slidesCopy;
    })();
    
    updateSlidesWithHistory(newSlides, `Change image layer: ${command}`);
  };
  const handleToolbarChange = (prop, value) => {
    if (selectedTextBoxId) {
      const newSlides = slides.map((s, i) => {
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
      });
      updateSlidesWithHistory(newSlides, `Change ${prop}`);
    }
  };  const handleToolbarToggle = prop => {
    if (selectedTextBoxId) {
      const newSlides = slides.map((s, i) => {
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
      });
      updateSlidesWithHistory(newSlides, `Toggle ${prop}`);
    }
  };  // Bullets
  const handleBulletsToggle = id => {
    const newSlides = slides.map((s, i) =>
      i === currentIdx ? {
        ...s,
        textboxes: s.textboxes.map(tb => tb.id === id ? { ...tb, bullets: !tb.bullets } : tb)
      } : s
    );
    updateSlidesWithHistory(newSlides, 'Toggle bullets');
  };
  
const handleParagraphSpacing = value => {
  if (!selectedTextBoxId) return;
  
  const newSlides = slides.map((s, i) =>
      i === currentIdx
        ? {
            ...s,
            textboxes: s.textboxes.map(tb =>
              tb.id === selectedTextBoxId ? { ...tb, paragraphSpacing: value } : tb
            ),
          }
        : s
    );
  updateSlidesWithHistory(newSlides, 'Change paragraph spacing');
};  const handleAddTextBox = type => {
    const newSlides = slides.map((s, i) =>
      i === currentIdx ? {
        ...s,
        textboxes: [
          ...s.textboxes,
          { ...defaultTextBox(type), y: 200 + 40 * s.textboxes.length }
        ]
      } : s
    );
    updateSlidesWithHistory(newSlides, `Add ${type} textbox`);
  };  // 7. Delete textbox
  const handleDeleteTextBox = id => {
    const newSlides = slides.map((s, i) =>
      i === currentIdx ? {
        ...s,
        textboxes: s.textboxes.filter(tb => tb.id !== id)
      } : s
    );
    updateSlidesWithHistory(newSlides, 'Delete textbox');
    setSelectedTextBoxId(null);
  };
  useEffect(() => {
    const handleKeyDown = e => {
    
      if (e.target && e.target.contentEditable === 'true') {
        return; 
      }
      
      if ((e.key === "Backspace" || e.key === "Delete") && selectedTextBoxId) {
        e.preventDefault();
        handleDeleteTextBox(selectedTextBoxId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTextBoxId]);
  const handleTextBoxFormat = (id, prop, value) => {
    const newSlides = slides.map((s, i) =>
      i === currentIdx ? {
        ...s,
        textboxes: s.textboxes.map(tb => tb.id === id ? { ...tb, [prop]: value } : tb)
      } : s
    );
    updateSlidesWithHistory(newSlides, `Change textbox ${prop}`);
  };
  const handleTextBoxStyleToggle = (id, styleProp) => {
    const newSlides = slides.map((s, i) =>
      i === currentIdx ? {
        ...s,
        textboxes: s.textboxes.map(tb => tb.id === id ? {
          ...tb,
          fontStyle: { ...tb.fontStyle, [styleProp]: !tb.fontStyle?.[styleProp] }
        } : tb)
      } : s
    );
    updateSlidesWithHistory(newSlides, `Toggle textbox ${styleProp}`);
  };
  const handleAddSlide = () => {
    const newSlides = [...slides];
    newSlides.splice(currentIdx + 1, 0, defaultSlide());
    const newIdx = currentIdx + 1;
    updateSlidesAndIndexWithHistory(newSlides, newIdx, 'Add slide');  };
  const handleDeleteSlide = () => {
    if (slides.length === 1) return;
    const newSlides = [...slides];
    newSlides.splice(currentIdx, 1);
    const newIdx = Math.max(0, currentIdx - 1);
    updateSlidesAndIndexWithHistory(newSlides, newIdx, 'Delete slide');
  };  const handleBackgroundColor = e => {
    const newSlides = slides.map((s, i) =>
      i === currentIdx ? { ...s, background: { ...s.background, fill: e.target.value } } : s
    );
    updateSlidesWithHistory(newSlides, 'Change slide background color');
  };
  // Template change handler
  const handleTemplateChange = (newTemplateId) => {
    const newTemplate = getTailwindTemplateById(newTemplateId, templates);
    if (!newTemplate) {
      console.warn(`Template with id "${newTemplateId}" not found`);
      return;
    }

    // Update the current template
    setCurrentTemplate(newTemplate);// Apply template-specific slide structure to all slides
    const newSlides = slides.map(slide => {
      const templateSlide = defaultSlide(newTemplateId);
      
      // Preserve existing textbox content but apply template positioning
      const updatedTextboxes = slide.textboxes.map(tb => {
        // Find corresponding template textbox by type
        const templateTextbox = templateSlide.textboxes.find(ttb => ttb.type === tb.type);
        if (templateTextbox) {
          // Keep content and styling but use template positioning
          return {
            ...tb,
            x: templateTextbox.x,
            y: templateTextbox.y,
            width: templateTextbox.width,
            height: templateTextbox.height
          };
        }
        return tb;
      });

      // Add any missing template textboxes
      const existingTypes = new Set(slide.textboxes.map(tb => tb.type));
      const missingTextboxes = templateSlide.textboxes.filter(ttb => !existingTypes.has(ttb.type));

      return {
        ...slide,
        textboxes: [...updatedTextboxes, ...missingTextboxes],
        background: templateSlide.background || slide.background
      };
    });
    updateSlidesWithHistory(newSlides, 'Change template');
  };
  const handleFontChange = (key, prop, value) => {
    const newSlides = slides.map((s, i) =>
      i === currentIdx ? { ...s, [key]: { ...s[key], [prop]: value } } : s
    );
    updateSlidesWithHistory(newSlides, `Change ${key} ${prop}`);
  };  const handleToolbarToggleSection = (section, prop) => {
    let newSlides;
    if (section === "title") {
      newSlides = slides.map((s, i) => i === currentIdx ? { ...s, title: { ...s.title, fontStyle: { ...s.title.fontStyle, [prop]: !s.title.fontStyle?.[prop] } } } : s);
    } else {
      newSlides = slides.map((s, i) => i === currentIdx ? { ...s, body: { ...s.body, fontStyle: { ...s.body.fontStyle, [prop]: !s.body.fontStyle?.[prop] } } } : s);
    }
    updateSlidesWithHistory(newSlides, `Toggle ${section} ${prop}`);
  };  const handleToolbarColor = (section, color) => {
    let newSlides;
    if (section === "title") {
      newSlides = slides.map((s, i) => i === currentIdx ? { ...s, title: { ...s.title, fill: color } } : s);
    } else {
      newSlides = slides.map((s, i) => i === currentIdx ? { ...s, body: { ...s.body, fill: color } } : s);
    }
    updateSlidesWithHistory(newSlides, `Change ${section} color`);
  };  const handleToolbarHighlight = (section, color) => {
    let newSlides;
    if (section === "title") {
      newSlides = slides.map((s, i) => i === currentIdx ? { ...s, title: { ...s.title, highlight: color } } : s);
    } else {
      newSlides = slides.map((s, i) => i === currentIdx ? { ...s, body: { ...s.body, highlight: color } } : s);
    }
    updateSlidesWithHistory(newSlides, `Change ${section} highlight`);
  };const handleExportPowerPoint = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/generate-presentation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides,
          template: currentTemplate, // Pass the full template object
          presentationType,
        }),
      });
      if (!response.ok) {
        let errorMessage = `Failed to generate presentation. Status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          // If response is not valid JSON, try to get text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            // Keep default error message
          }
        }
        throw new Error(errorMessage);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "generated_presentation.pptx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message || "An error occurred while generating the presentation.");
    }
  };
  // Save and return
  const handleSave = async () => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userId = user && user.id ? user.id : null;

    if (!userId) {
      console.error("Save failed: userId not found. Please ensure the user is logged in.");
      alert("Save failed: User ID not found. Please log in again.");
      return;
    }

    const processedSlides = slides.map(slide => {
      const processedSlide = { ...slide };
      
      if (processedSlide.image === null && processedSlide.images && processedSlide.images.length > 0) {
      } 
      else if ((!processedSlide.images || processedSlide.images.length === 0) && processedSlide.image) {
        processedSlide.images = [{
          src: processedSlide.image.src,
          x: processedSlide.image.x,
          y: processedSlide.image.y,
          width: processedSlide.image.width,
          height: processedSlide.image.height,
          id: uuidv4(),
          zIndex: DEFAULT_IMAGE_Z_INDEX
        }];
      }
      
      return processedSlide;
    });    const presentationData = {
      slides: processedSlides,
      templateId: template ? (typeof template === "object" ? template.id : template) : null,
      presentationType: presentationType || "custom",
      userId: userId,
      ...(presentationId && { presentationId: presentationId }),
    };

    console.log("Saving presentation with data:", {
      ...presentationData,
      slides: `[${processedSlides.length} slides]`, 
      presentationId: presentationId
    });    try {
      const response = await fetch(`${config.API_BASE_URL}/api/save-slides-state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(presentationData),
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorData = null;
        try {
          const text = await response.text();
          if (text) {
            errorData = JSON.parse(text);
            errorMessage = errorData.error || errorMessage;
          }
        } catch (e) {
          // Ignore JSON parse errors, keep default errorMessage
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Presentation saved:", result);
      if (result.presentationId) {
        setPresentationId(result.presentationId); 
      }
      alert("Presentation saved successfully!");
    } catch (error) {
      console.error("Failed to save presentation to backend:", error);
      alert(`Failed to save presentation: ${error.message}`);
    }
  };
  const handleImageUpload = e => {
    const files = Array.from(e.target.files);
    
    // Validate that all files are images
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml'];
    const invalidFiles = files.filter(file => !validImageTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      alert(`Invalid file types detected. Only image files are allowed. Invalid files: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }
    
    Promise.all(files.map(file => {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = evt => {
          resolve({
            src: evt.target.result,
            x: 100 + Math.random() * 200,
            y: 100 + Math.random() * 100,
            width: 200,
            height: 150,
            id: uuidv4(),
            zIndex: 101 
          });
        };
        reader.readAsDataURL(file);
      });    })).then(uploadedImages => {
      const newSlides = slides.map((s, i) =>
        i === currentIdx ? {
          ...s,
          images: [...(s.images || []), ...uploadedImages]
        } : s
      );
      updateSlidesWithHistory(newSlides, 'Upload image(s)');
    });
  };  const handleRemoveImage = idx => {
    const newSlides = slides.map((s, i) =>
      i === currentIdx ? {
        ...s,
        images: s.images.filter((_, j) => j !== idx)
      } : s
    );
    updateSlidesWithHistory(newSlides, 'Remove image');
    setSelectedImage(null);
  };
    const handleRemoveLegacyImage = () => {
    const newSlides = slides.map((s, i) => 
      i === currentIdx ? { 
        ...s, 
        image: null,
        images: (s.images && s.images.length > 0) ? s.images : []
      } : s
    );
    updateSlidesWithHistory(newSlides, 'Remove legacy image');
  };
    const handleRemoveAllImages = () => {
    const newSlides = slides.map((s, i) => 
      i === currentIdx ? { 
        ...s, 
        image: null,
        images: []
      } : s
    );
    updateSlidesWithHistory(newSlides, 'Remove all images');
    setSelectedImage(null);
  };

  const getTextBoxStyle = (type) => {
    if (!currentTemplate || !currentTemplate.styles) return {};
    if (type === "title" && currentTemplate.styles.title) return currentTemplate.styles.title;
    if (type === "body" && currentTemplate.styles.body) return currentTemplate.styles.body;
    return {};
  };

  const getSlideBackground = () => {
    if (!currentTemplate || !currentTemplate.styles || !currentTemplate.styles.slide) return { fill: "#fff" };
    if (currentTemplate.id === "tailwind-abstract-gradient") {
      return {
        background: "linear-gradient(120deg, #d1fae5 0%, #bfdbfe 50%, #ddd6fe 100%)", // Approximation
      };
    }
    if (currentTemplate.styles.slide.backgroundColor && currentTemplate.styles.slide.backgroundColor.startsWith("#")) {
      return { background: currentTemplate.styles.slide.backgroundColor };
    }
    return { background: "#fff" };
  };
  function renderTemplateBackground() {
    if (!currentTemplate) return null;
    const templateId = currentTemplate.id;
    const isTitleSlide = currentIdx === 0;

    // Handle custom templates
    if (currentTemplate.type === 'custom') {
      return renderCustomBackground({ templateUrl: currentTemplate.preview, isTitle: isTitleSlide });
    }

    // Handle built-in templates
    if (templateId === "abstract") {
      return renderAbstractBackground({ isTitle: isTitleSlide });
    }
    if (templateId === "tailwind-abstract-gradient") {
      return renderAbstractBackground({ isTitle: isTitleSlide });
    }
    if (templateId === "tailwind-creative") {
      return renderCreativeBackground({ isTitle: isTitleSlide });
    } else if (templateId === "tailwind-business") {
      return renderBusinessBackground({ isTitle: isTitleSlide });
    } else if (templateId === "tailwind-education") {
      return renderEducationBackground({ isTitle: isTitleSlide });
    }
    return null;
  }function renderTemplateContentBox(children) {
    if (!currentTemplate) return children;
    const templateId = currentTemplate.id;
    const isTitleSlide = currentIdx === 0;

    if (templateId === 'tailwind-abstract-gradient') {
      return renderAbstractContentBox(children, { isTitleSlide: isTitleSlide });
    } else if (templateId === 'tailwind-creative') {
      return renderCreativeContentBox(children, { isTitle: isTitleSlide });
    } else if (templateId === 'tailwind-business') {
      return renderBusinessContentBox(children, { isTitle: isTitleSlide });
    } else if (templateId === 'tailwind-education') {
      return renderEducationContentBox(children, { isTitle: isTitleSlide });
    }
    return children;
  }
  // Helper function to get template background image for slide thumbnails
  function getTemplateBackgroundImage(templateId, isTitle = false) {
    if (!templateId) return null;
    
    // Find the template object to check if it's custom
    const template = templates.find(t => t.id === templateId) || BUILTIN_TEMPLATES.find(t => t.id === templateId);
    
    if (template && template.type === 'custom') {
      // For custom templates, use the preview image
      return template.preview;
    }
    
    // For built-in templates, use the standard path
    const imagePath = isTitle 
      ? `/static/template_backgrounds/${templateId}_title.png`
      : `/static/template_backgrounds/${templateId}_content.png`;
    
    return imagePath;
  }

  // Render template-aware slide thumbnail
  function renderSlideThumb(slide, idx, isTitle = false) {
    const templateBgImage = currentTemplate ? getTemplateBackgroundImage(currentTemplate.id, isTitle) : null;
    
    return (
      <div className="slide-thumb-content">
        {/* Template background image */}
        {templateBgImage && (
          <img
            src={templateBgImage}
            alt="Template background"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '4px',
              zIndex: 0
            }}
            onError={(e) => {
              // Fallback to solid color if image fails to load
              e.target.style.display = 'none';
              e.target.parentElement.style.background = slide.background?.fill || "#fff";
            }}
          />
        )}
        
        {/* Content overlay */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          padding: '2px 4px',
          height: '100%',
          background: templateBgImage ? 'rgba(255, 255, 255, 0.1)' : (slide.background?.fill || "#fff")
        }}>
          <div className="slide-thumb-title">{slide.textboxes?.find(tb => tb.type === "title")?.text || ""}</div>
          <div className="slide-thumb-body">{slide.textboxes?.find(tb => tb.type === "body")?.text || ""}</div>
        </div>
      </div>
    );  }

  return (
    <div className="slide-editor-root">      <div className="slide-selector-bar">
        {slides.map((s, idx) => {
          const titleBox = s.textboxes?.find(tb => tb.type === "title");
          const bodyBox = s.textboxes?.find(tb => tb.type === "body");
          return (
            <div
              key={idx}
              className={
                "slide-thumb" + 
                (idx === currentIdx ? " selected" : "") +
                (draggedSlideIndex === idx ? " dragging" : "") +
                (dragOverIndex === idx ? " drag-over" : "")
              }
              draggable
              onClick={() => setCurrentIdx(idx)}
              onDragStart={(e) => handleSlideThumbDragStart(e, idx)}
              onDragOver={(e) => handleSlideThumbDragOver(e, idx)}
              onDragLeave={handleSlideThumbDragLeave}
              onDrop={(e) => handleSlideThumbDrop(e, idx)}
              onDragEnd={handleSlideThumbDragEnd}
              style={{
                opacity: draggedSlideIndex === idx ? 0.5 : 1,
                cursor: 'move'
              }}            >
              <div className="slide-thumb-label">Slide {idx + 1}</div>
              {renderSlideThumb(s, idx, idx === 0)}              {slides.length > 1 && (
                <button
    className="slide-thumb-delete"
    onClick={e => {
      e.stopPropagation();  // Prevent slide selection
      e.preventDefault();   // Prevent any default behavior
      
      // Confirm deletion
      if (window.confirm(`Delete Slide ${idx + 1}?`)) {
        const newSlides = slides.filter((_, i) => i !== idx);
        const newIdx = idx === 0 ? 0 : Math.max(0, currentIdx - (idx < currentIdx ? 1 : 0));
        updateSlidesAndIndexWithHistory(newSlides, newIdx, `Delete slide ${idx + 1}`);
      }
    }}
    onMouseDown={e => {
      e.stopPropagation();  // CRITICAL: Stop drag from starting
    }}
    onDragStart={e => {
      e.preventDefault();  // CRITICAL: Prevent button from being dragged
      e.stopPropagation();
    }}
    title={`Delete Slide ${idx + 1}`}  /* Add tooltip */
    aria-label={`Delete Slide ${idx + 1}`}  /* Accessibility */
  >
    ×
  </button>
              )}
            </div>            )})}

          <button className="slide-thumb-add" onClick={handleAddSlide}>+</button>
              </div>

              <div className="slide-editor-main">
          <div className="slide-editor-sidebar">
            <button onClick={() => handleAddTextBox('title')}>Add Title</button>
            <button onClick={() => handleAddTextBox('body')}>Add Body</button>
            <div style={{ width: '100%', margin: '12px 0' }}>
              <label style={{ fontSize: 13, color: '#222', marginBottom: 4 }}>Background</label>
              <input type="color" className="background-color-picker" value={slide.background?.fill || '#fff'} onChange={handleBackgroundColor} style={{ width: 28, height: 28, marginLeft: 8 }} />
            </div>
              {/* Template Selector */}
              <div style={{ width: '100%', margin: '12px 0' }}>
              <label style={{ fontSize: 13, color: '#222', marginBottom: 4, display: 'block' }}>Template</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '11px', color: '#555', padding: '4px 0' }}>
                {currentTemplate ? currentTemplate.name : 'No template selected'}
                </div>
                {/* Show current template preview */}
                {currentTemplate && (
                  <div style={{
                    textAlign: 'center',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      display: 'inline-block',
                      border: '1px solid #ccc',
                      borderRadius: 6,
                      background: '#fafbfc',
                      padding: 4,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                    }}>
                      <img
                  src={
                    currentTemplate.type === 'custom'
                      ? currentTemplate.preview
                      : `/static/template_backgrounds/${currentTemplate.id}_title.png`
                  }
                  alt={currentTemplate.name}
                  style={{
                    width: 120,
                    height: 68,
                    objectFit: 'cover',
                    borderRadius: 4,
                    background: '#fff'
                  }}
                  onError={e => {
                    e.target.src = "/images/default_preview.png";
                  }}
                      />
                    </div>
                  </div>
                )}
                <button
                onClick={() => setShowTemplatePopup(true)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: '11px',
                  backgroundColor: '#f0f4f8',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#fff' // changed to white
                }}
                >
                Change Template
                </button>
              </div>
              </div>              <div style={{ width: '100%' }}>
              <label style={{ fontSize: 13, color: '#222', marginBottom: 4 }}>Image</label>            <div className="image-upload-row">
                <button className="image-upload-btn" onClick={() => fileInputRef.current.click()}>Upload Image</button>
                <input type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/bmp,image/webp,image/svg+xml" multiple ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />              {slide.image && <button className="remove-image-btn" onClick={handleRemoveLegacyImage}>Remove Legacy Image</button>}
                {slide.images && slide.images.length > 0 && <button className="remove-image-btn" onClick={handleRemoveAllImages}>Remove All Images</button>}
              </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div className="slide-toolbar">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '8px', fontSize: '14px' }}>Font:</span>
                <select
                value={selectedTextBox?.fontFamily || 'Arial'}
                onChange={e => handleToolbarChange('fontFamily', e.target.value)}
                disabled={!selectedTextBox} 
                style={{ marginRight: '12px', padding: '4px', fontSize: '14px' }}
                >
                {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <span style={{ marginRight: '8px', fontSize: '14px' }}>Size:</span>
                <select
                value={selectedTextBox?.fontSize || 24}
                onChange={e => handleToolbarChange('fontSize', Number(e.target.value))}
                disabled={!selectedTextBox} 
                style={{ marginRight: '12px', padding: '4px', fontSize: '14px' }}
                >
                {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button
                style={{ ...TOOLBAR_BUTTON_STYLE, fontSize: 15 }}
                onClick={() => handleToolbarToggle('bold')}
                disabled={!selectedTextBox} 
                className={selectedTextBox?.fontStyle?.bold ? 'active' : ''}
              >
                <FaBold />
              </button>
              <button
                style={{ ...TOOLBAR_BUTTON_STYLE, fontSize: 15 }}
                onClick={() => handleToolbarToggle('italic')}
                disabled={!selectedTextBox} 
                className={selectedTextBox?.fontStyle?.italic ? 'active' : ''}
              >
                <FaItalic />
              </button>
              <button
                style={{ ...TOOLBAR_BUTTON_STYLE, fontSize: 15 }}
                onClick={() => handleToolbarToggle('underline')}
                disabled={!selectedTextBox} 
                className={selectedTextBox?.fontStyle?.underline ? 'active' : ''}
              >
                <FaUnderline />
              </button>
              <button
                style={{ ...TOOLBAR_BUTTON_STYLE, fontSize: 15 }}
                onClick={() => handleToolbarChange('align', 'left')}
                disabled={!selectedTextBox}
                className={selectedTextBox?.align === 'left' ? 'active' : ''}
              >
                <FaAlignLeft />
              </button>
              <button
                style={{ ...TOOLBAR_BUTTON_STYLE, fontSize: 15 }}
                onClick={() => handleToolbarChange('align', 'center')}
                disabled={!selectedTextBox} 
                className={selectedTextBox?.align === 'center' ? 'active' : ''}
              >
                <FaAlignCenter />
              </button>
              <button
                style={{ ...TOOLBAR_BUTTON_STYLE, fontSize: 15 }}
                onClick={() => handleToolbarChange('align', 'right')}
                disabled={!selectedTextBox} 
                className={selectedTextBox?.align === 'right' ? 'active' : ''}
              >
                <FaAlignRight />
              </button>
              <button
                style={{ ...TOOLBAR_BUTTON_STYLE, fontSize: 15 }}
                onClick={() => handleToolbarChange('align', 'justify')}
                disabled={!selectedTextBox} 
                className={selectedTextBox?.align === 'justify' ? 'active' : ''}
              >
                <FaAlignJustify />
              </button>
              <button
                style={{ ...TOOLBAR_BUTTON_STYLE, fontSize: 15 }}
                onClick={() => selectedTextBox && handleBulletsToggle(selectedTextBox.id)}
                disabled={!selectedTextBox} 
                className={selectedTextBox?.bullets ? 'active' : ''}
              >
                •
              </button>              <input
                type="color"
                value={selectedTextBox?.fill || '#000000'}
                onChange={e => handleToolbarChange('fill', e.target.value)}
                disabled={!selectedTextBox}
              />
              <div style={{ display: 'flex', alignItems: 'center', marginLeft: '12px' }}>
                <span style={{ marginRight: '8px', fontSize: '14px' }}>Spacing:</span>
                <select
                value={selectedTextBox?.paragraphSpacing || 0}
                onChange={e => handleParagraphSpacing(Number(e.target.value))}
                disabled={!selectedTextBox}
                style={{ padding: '4px', fontSize: '14px' }}
                >
            <option value="0">1.0</option>
            <option value="4">1.5</option>
            <option value="8">2.0</option>
            <option value="12">2.5</option>
            <option value="16">3.0</option>
            <option value="20">3.5</option>
            <option value="24">4.0</option>
            <option value="28">4.5</option>
            <option value="32">5.0</option> 
                </select>
              </div>
            </div>          {/* --- Slide Preview/Editor --- */}
          <div
            className="slide-preview"            style={{
              position: "relative",
              width: `${SLIDE_WIDTH}px`,
              height: `${SLIDE_HEIGHT}px`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              margin: "auto",
              border: "1px solid #ccc",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              overflow: "hidden",
              background: currentTemplate?.id ? undefined : "#fff"
            }}
            onDragOver={e => { 
              e.preventDefault(); 
              e.dataTransfer.dropEffect = "move";
              e.currentTarget.style.backgroundColor = "rgba(25, 118, 210, 0.05)";
              e.currentTarget.style.border = "2px dashed #1976d2";
            }}
            onDragLeave={e => {
              e.currentTarget.style.backgroundColor = "";
              e.currentTarget.style.border = "1px solid #ccc";
            }}            onDrop={e => {
              e.preventDefault();
              e.currentTarget.style.backgroundColor = "";
              e.currentTarget.style.border = "1px solid #ccc";
              
              const dragDataString = e.dataTransfer.getData("text/plain");
              if (!dragDataString) return;
              try {
                const dragData = JSON.parse(dragDataString);
                const slidePreviewRect = e.currentTarget.getBoundingClientRect();
                let newX = e.clientX - slidePreviewRect.left - dragData.offsetX;
                let newY = e.clientY - slidePreviewRect.top - dragData.offsetY;
                
                newX = Math.max(0, Math.min(newX, SLIDE_WIDTH - 100)); // Leave some margin for textbox width
                newY = Math.max(0, Math.min(newY, SLIDE_HEIGHT - 50)); // Leave some margin for textbox height
                
                if (dragData.type === 'textbox') {
                  handleTextSetPosition(dragData.id, newX, newY);
                }
              } catch (error) { 
                console.error("Error processing drop data:", error); 
              }
            }}
          >
            {/* Always render template-specific background for ALL templates */}
            {renderTemplateBackground()}            {/* Always wrap textboxes/content in template-specific content box for ALL templates */}
            {renderTemplateContentBox(
              <>
                {/* Render textboxes using standard positioning for all slides */}
                {slide.textboxes.map((tb, i) => {
                  const style = {
                    position: "absolute",
                    left: `${tb.x}px`,
                    top: `${tb.y}px`,
                    width: `${tb.width}px`,
                    height: `${tb.height}px`,
                    fontSize: `${tb.fontSize}px`,
                    fontFamily: tb.fontFamily,
                    color: tb.fill,
                    fontWeight: tb.fontStyle?.bold ? "bold" : "normal",
                    fontStyle: tb.fontStyle?.italic ? "italic" : "normal",
                    textDecoration: tb.fontStyle?.underline ? "underline" : "none",
                    lineHeight: tb.lineHeight || 1.2,
                    textAlign: tb.align,
                    outline: selectedTextBoxId === tb.id ? "2px solid #1976d2" : "none",
                    background: "transparent",
                    padding: "8px",
                    boxSizing: "border-box",
                    overflowWrap: "break-word",
                    wordWrap: "break-word",
                    overflow: "auto",
                    resize: "both",
                    cursor: "grab",
                    zIndex: TEXT_Z_INDEX,
                    userSelect: "text",
                    transition: "all 0.2s ease"
                    // Remove the paragraph spacing from inline styles
                  };

                    if (tb.bullets) {
                      // Add bullet styles
                    }
                    return (                      <div
                        key={`textbox-${currentIdx}-${tb.id}`}
                        ref={el => {
                          if (el) {
                            const existingRef = contentEditableRefs.current.get(tb.id);
                            contentEditableRefs.current.set(tb.id, { element: el, timeout: existingRef?.timeout || null });
                          } else {
                            const existingRef = contentEditableRefs.current.get(tb.id);
                            if (existingRef?.timeout) clearTimeout(existingRef.timeout);
                            contentEditableRefs.current.delete(tb.id);
                          }
                        }}
                        className={"slide-textbox" + (selectedTextBoxId === tb.id ? " selected" : "") + (tb.paragraphSpacing ? ` paragraph-spacing-${tb.paragraphSpacing}` : "")}
                        style={style}
                        contentEditable
                        suppressContentEditableWarning
                        spellCheck={true}
                        draggable={true} 
                        data-tbid={tb.id}
                        // Enhanced mouse-based dragging (primary method)
                        onMouseDown={e => {
                          // Check if clicking on the textbox border/background (not text content)
                          if (e.target === e.currentTarget) {
                            handleTextMouseDown(e, tb.id);
                          }
                        }}
                        // HTML5 drag as fallback for better compatibility
                        onDragStart={e => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const offsetX = e.clientX - rect.left;
                          const offsetY = e.clientY - rect.top;
                          const dragData = {
                            type: 'textbox',
                            id: tb.id,
                            offsetX,
                            offsetY
                          };
                          e.dataTransfer.setData("text/plain", JSON.stringify(dragData));
                          e.dataTransfer.effectAllowed = "move";
                          setSelectedTextBoxId(tb.id);
                          
                          // Visual feedback during drag
                          e.currentTarget.style.opacity = "0.7";
                          e.currentTarget.style.transform = "rotate(2deg)";
                        }}
                        onDragEnd={e => {
                          // Reset visual feedback
                          e.currentTarget.style.opacity = "1";
                          e.currentTarget.style.transform = "none";
                        }}
                        onInput={e => { e.stopPropagation(); handleContentEdit(tb.id, e); }}
                        onFocus={e => { e.stopPropagation(); setSelectedTextBoxId(tb.id); setSelectedTextRange(null); }}
                        onKeyDown={e => {
                          e.stopPropagation();
                          if (e.key === 'Delete' || e.key === 'Backspace') {
                            const selection = window.getSelection();
                            if (selection && selection.rangeCount > 0) {
                              const range = selection.getRangeAt(0);
                              if (range.toString().length > 0 || e.target.innerText.length > 0) return;
                            }
                            e.preventDefault();
                          }
                        }}
                        onClick={e => { e.stopPropagation(); setSelectedTextBoxId(tb.id); setSelectedTextRange(null); }}
                        onBlur={e => {
                          const textboxDiv = e.currentTarget;
                          const currentWidth = textboxDiv.offsetWidth;
                          const currentHeight = textboxDiv.offsetHeight;
                          handleTextResize(tb.id, currentWidth, currentHeight);
                          const relatedTarget = e.relatedTarget;
                          const slidePreviewDiv = textboxDiv.closest('.slide-preview');
                          if (!slidePreviewDiv) { setSelectedTextBoxId(null); setSelectedTextRange(null); return; }
                          const mainContentArea = slidePreviewDiv.parentElement;
                          if (!mainContentArea) { setSelectedTextBoxId(null); setSelectedTextRange(null); return; }
                          const toolbarDiv = mainContentArea.querySelector('.slide-toolbar');
                          if (toolbarDiv && relatedTarget && toolbarDiv.contains(relatedTarget)) return;
                          setSelectedTextBoxId(null); setSelectedTextRange(null);
                        }}
                        tabIndex={0}                      >
                        <div dangerouslySetInnerHTML={{ __html: tb.text }} />
                      </div>
                    );                  })
                }
              </>
            )}
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
            )}            {slide.images && slide.images.map((image, idx) => (
              <div
                key={image.id}
                className="image-container"
                style={{
                  position: 'absolute',
                  left: image.x,
                  top: image.y,
                  width: image.width,
                  height: image.height,
                  cursor: isDraggingImage && selectedImage === idx ? 'grabbing' : 'grab',
                  border: selectedImage === idx ? '2px solid #1976d2' : '1px solid transparent',
                  boxSizing: 'border-box',
                  userSelect: 'none',
                  background: 'transparent',
                  zIndex: typeof image.zIndex === 'number' ? image.zIndex : DEFAULT_IMAGE_Z_INDEX
                }}
                onMouseDown={e => handleImageMouseDown(e, idx)}
                onClick={e => {
                  e.stopPropagation();
                  setSelectedImage(idx);
                }}
              >
                <img
                  src={image.src}
                  alt="slide visual"
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    pointerEvents: 'none', 
                    borderRadius: 8,
                    display: 'block'
                  }}
                  draggable={false}
                />
                
                {/* Resize handles - only show when image is selected */}
                {selectedImage === idx && (
                  <>
                    {/* Corner resize handles */}
                    <div
                      style={{
                        position: 'absolute',
                        top: -4,
                        left: -4,
                        width: 8,
                        height: 8,
                        backgroundColor: '#1976d2',
                        cursor: 'nw-resize',
                        borderRadius: '50%'
                      }}
                      onMouseDown={e => handleImageResizeMouseDown(e, idx)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        width: 8,
                        height: 8,
                        backgroundColor: '#1976d2',
                        cursor: 'ne-resize',
                        borderRadius: '50%'
                      }}
                      onMouseDown={e => handleImageResizeMouseDown(e, idx)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: -4,
                        left: -4,
                        width: 8,
                        height: 8,
                        backgroundColor: '#1976d2',
                        cursor: 'sw-resize',
                        borderRadius: '50%'
                      }}
                      onMouseDown={e => handleImageResizeMouseDown(e, idx)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: -4,
                        right: -4,
                        width: 8,
                        height: 8,
                        backgroundColor: '#1976d2',
                        cursor: 'se-resize',
                        borderRadius: '50%'

                      }}
                      onMouseDown={e => handleImageResizeMouseDown(e, idx)}
                    />
                    
                    {/* Edge resize handles */}
                    <div
                      style={{
                        position: 'absolute',
                        top: -4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 8,
                        height: 8,
                        backgroundColor: '#1976d2',
                        cursor: 'n-resize',
                        borderRadius: '50%'
                      }}
                      onMouseDown={e => handleImageResizeMouseDown(e, idx)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: -4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 8,
                        height: 8,
                        backgroundColor: '#1976d2',
                        cursor: 's-resize',
                        borderRadius: '50%'
                      }}
                      onMouseDown={e => handleImageResizeMouseDown(e, idx)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: -4,
                        transform: 'translateY(-50%)',
                        width: 8,
                        height: 8,
                        backgroundColor: '#1976d2',
                        cursor: 'w-resize',
                        borderRadius: '50%'
                      }}
                      onMouseDown={e => handleImageResizeMouseDown(e, idx)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        right: -4,
                        transform: 'translateY(-50%)',
                        width: 8,
                        height: 8,
                        backgroundColor: '#1976d2',
                        cursor: 'e-resize',
                        borderRadius: '50%'
                      }}
                      onMouseDown={e => handleImageResizeMouseDown(e, idx)}                    />
                  </>
                )}
              </div>
            ))}
          </div>
          {/* Image Positioning Toolbar - ensure visibility condition and commands are correct */}
          {selectedImage !== null && typeof selectedImage === 'number' && (
            <div className="image-position-toolbar">
              <button style={{ fontSize: '12px', margin: '4px' }} onClick={() => handleImagePositionChange('behind')}>To Back</button>
              <button style={{ fontSize: '12px', margin: '4px' }} onClick={() => handleImagePositionChange('in-front')}>To Front</button>
              <button style={{ fontSize: '12px', margin: '4px' }} onClick={() => handleImagePositionChange('backward')}>Backward</button>
              <button style={{ fontSize: '12px', margin: '4px' }} onClick={() => handleImagePositionChange('forward')}>Forward</button>
              <button style={{ fontSize: '12px', margin: '4px' }} onClick={() => handleRemoveImage(selectedImage)}>Remove</button>
            </div>
          )}
        </div>
      </div>      {/* --- Floating Action Bar (bottom) --- */}  <div className="slide-editor-actions">
    <button className="action-btn secondary" onClick={() => navigate("/slides-generating")}>
      <span>← Return to Slides</span>
    </button>
    <button 
      className="action-btn secondary" 
      onClick={handleUndo}
      disabled={historyIndex <= 0}
      title={`Undo (Ctrl+Z)${historyIndex > 0 ? ': ' + history[historyIndex].description : ''}`}
    >
      <span>↶ Undo</span>
    </button>
    <button 
      className="action-btn secondary" 
      onClick={handleRedo}
      disabled={historyIndex >= history.length - 1}
      title={`Redo (Ctrl+Y)${historyIndex < history.length - 1 ? ': ' + history[historyIndex + 1].description : ''}`}
    >
      <span>↷ Redo</span>
    </button>
    <button className="action-btn primary" onClick={handleExportPowerPoint}>
      <span>📄 Export to PowerPoint</span>
    </button>
    <button className="action-btn primary" onClick={handleSave}>
      <span>💾 Save</span>
    </button>
  </div>
  
  {/* Template Selection Popup */}  {showTemplatePopup && (
    <div className="template-popup-overlay" onClick={() => setShowTemplatePopup(false)}>
      <div
        className="template-popup"
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: 16, textAlign: 'center', color: '#333' }}>Select a Template</h2>
        {templatesLoading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div className="spinner"></div>
            <p style={{ marginTop: '10px', color: '#666' }}>Loading templates...</p>
          </div>
        ) : (
          <div className="template-list">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`template-box${currentTemplate && currentTemplate.id === template.id ? " selected" : ""}`}
                onClick={() => {
                  handleTemplateChange(template.id);
                  setShowTemplatePopup(false);
                }}
                style={{ cursor: "pointer" }}
              >
                <img
                  src={template.type === 'custom' 
                    ? template.preview 
                    : `/static/template_backgrounds/${template.id}_title.png`}
                  alt={template.name}
                  className="template-preview"
                  onError={e => {
                    e.target.src = "/images/default_preview.png";
                  }}
                />
                <p className="template-title">
                  {template.name}
                  {template.type === 'custom' && (
                    <span style={{ 
                      display: 'block', 
                      fontSize: '0.8em', 
                      color: '#666', 
                      fontWeight: 'normal' 
                    }}>
                      Custom
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )}
</div>
  );
};

export default SlideEditor;
