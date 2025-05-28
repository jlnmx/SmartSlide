import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Stage, Layer, Text, Rect, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import { saveAs } from "file-saver";
import { FaBold, FaItalic, FaUnderline, FaAlignLeft, FaAlignCenter, FaAlignRight, FaAlignJustify, FaHighlighter } from "react-icons/fa";
import { v4 as uuidv4 } from "uuid";
import "../styles/SlideEditor.css";
import { tailwindTemplates, getTailwindTemplateById } from "../templates/tailwind-templates";

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
      fill: "#222222",
      fontFamily: "Arial",
      fontStyle: {},
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
      fill: "#444444",
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

  // --- Load the selected template ---
  const [currentTemplate, setCurrentTemplate] = useState(null);
  useEffect(() => {
    let templateObj = null;
    if (template && typeof template === "object" && template.id) {
      templateObj = getTailwindTemplateById(template.id) || template;
    } else if (typeof template === "string") {
      templateObj = getTailwindTemplateById(template) || null;
    }
    setCurrentTemplate(templateObj);
  }, [template]);

  // --- Load slides: 1. LocalStorage, 2. Nav state, 3. Default ---
  const [slides, setSlides] = useState([]);  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedTextBoxId, setSelectedTextBoxId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedTextRange, setSelectedTextRange] = useState(null);
  const [selectionRestore, setSelectionRestore] = useState(null); // For cursor position restoration
  const fileInputRef = useRef();
  const stageRef = useRef();
  const contentEditableRefs = useRef(new Map()); // Track contentEditable DOM elements  
  const [presentationId, setPresentationId] = useState(presentationIdFromNav || null); // Added to store presentation ID

  // Debug log for presentationId
  useEffect(() => {
    console.log("SlideEditor presentationId:", presentationId, "from nav:", presentationIdFromNav);
  }, [presentationId, presentationIdFromNav]);
  // Load slides from localStorage on mount only
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

  const slide = slides[currentIdx] || defaultSlide(); // Ensure slide is always defined
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
    }
  }, [slides, selectionRestore]);

  // Define zIndex constants for clarity
  const TEXT_Z_INDEX = 100;
  const MIN_IMAGE_Z_INDEX = 0;
  const DEFAULT_IMAGE_Z_INDEX = 101; // Should match what handleImageUpload sets// 3. Handle contenteditable changes for any textbox
  const handleContentEdit = useCallback((id, e) => {
    e.stopPropagation();
    const newText = e.target.innerText;

    // --- Cursor Fix: Save selection before state update ---
    let selection = null;
    if (document.activeElement === e.target) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        selection = sel.getRangeAt(0);
      }
    }

    // Debounce the state update to prevent interference with typing
    setSlides(prev => prev.map((s, i) =>
      i === currentIdx ? {
        ...s,
        textboxes: s.textboxes.map(tb => tb.id === id ? { ...tb, text: newText } : tb)
      } : s
    ));

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
  }, [currentIdx]);

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

  // Fix drag-and-drop functionality and add a side toolbar for image positioning
  const handleImageDrag = (idx, newX, newY) => {
    setSlides(prev => prev.map((s, i) =>
      i === currentIdx ? {
        ...s,
        images: s.images.map((img, j) =>
          j === idx ? { ...img, x: newX, y: newY } : img
        )
      } : s
    ));
  };

  const handleImageResize = (idx, newWidth, newHeight) => {
    setSlides(prev => prev.map((s, i) =>
      i === currentIdx ? {
        ...s,
        images: s.images.map((img, j) =>
          j === idx ? { ...img, width: newWidth, height: newHeight } : img
        )
      } : s
    ));
  };

  const handleImagePositionChange = (command) => {
    if (selectedImage === null || typeof selectedImage !== 'number') {
      return;
    }

    setSlides(prevSlides => {
      const slidesCopy = [...prevSlides];
      const slideToUpdate = { ...slidesCopy[currentIdx] };

      if (!slideToUpdate.images || selectedImage < 0 || selectedImage >= slideToUpdate.images.length) {
        console.warn("handleImagePositionChange: Invalid selectedImage index or images array missing.");
        return prevSlides;
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
            newZ = TEXT_Z_INDEX + 1; // Bring in front of text
          } else {
            newZ = currentZ + 1; // Increment zIndex
          }
          break;
        case 'backward':
          if (currentZ > TEXT_Z_INDEX) {
            newZ = currentZ - 1;
            if (newZ === TEXT_Z_INDEX) { // If decrementing lands on text\'s zIndex
              newZ = TEXT_Z_INDEX - 1; // Send behind text
            }
          } else { // currentZ <= TEXT_Z_INDEX
            newZ = currentZ - 1; // Decrement further
          }
          newZ = Math.max(newZ, MIN_IMAGE_Z_INDEX); // Ensure not less than MIN_IMAGE_Z_INDEX
          break;
        default:
          console.warn(`Unknown image position command: ${effectiveCommand}`);
          return prevSlides; // No change
      }

      const updatedImage = { ...imageToUpdate, zIndex: newZ };

      const newImagesArray = slideToUpdate.images.map((img, index) =>
        index === selectedImage ? updatedImage : img
      );

      slideToUpdate.images = newImagesArray;
      slidesCopy[currentIdx] = slideToUpdate;

      return slidesCopy;
    });
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
  };  // 8. Keyboard support for deleting selected textbox
  useEffect(() => {
    const handleKeyDown = e => {
      // Don't delete textbox if user is typing in a contentEditable element
      if (e.target && e.target.contentEditable === 'true') {
        return; // Let the contentEditable handle its own keystrokes
      }
      
      if ((e.key === "Backspace" || e.key === "Delete") && selectedTextBoxId) {
        e.preventDefault();
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
          template: currentTemplate, // Pass the full template object
          presentationType,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate the presentation.");
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
    const user = JSON.parse(localStorage.getItem('user'));
    const userId = user && user.id ? user.id : null;

    if (!userId) {
      console.error("Save failed: userId not found. Please ensure the user is logged in.");
      alert("Save failed: User ID not found. Please log in again.");
      return;
    }

    // Ensure consistency between legacy image and images array before saving
    const processedSlides = slides.map(slide => {
      const processedSlide = { ...slide };
      
      // If legacy image is null but images array exists and has items, legacy was intentionally removed
      if (processedSlide.image === null && processedSlide.images && processedSlide.images.length > 0) {
        // Keep both as they are - legacy is intentionally null
      } 
      // If there's no images array but legacy image exists, it's legacy-only mode
      else if ((!processedSlide.images || processedSlide.images.length === 0) && processedSlide.image) {
        // Create images array from legacy image
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
      slides: `[${processedSlides.length} slides]`, // Don't log full slides, just count
      presentationId: presentationId
    });

    try {
      const response = await fetch("/api/save-slides-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(presentationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Presentation saved:", result);
      if (result.presentationId) {
        setPresentationId(result.presentationId); // Update presentationId if it's new
      }
      alert("Presentation saved successfully!");
      // Optionally navigate or give other feedback
    } catch (error) {
      console.error("Failed to save presentation to backend:", error);
      alert(`Failed to save presentation: ${error.message}`);
    }
  };

  // Replace the image upload handler to support multiple images and fix drag/disappear bug
  const handleImageUpload = e => {
    const files = Array.from(e.target.files);
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
            zIndex: 101 // Default zIndex for new images, in front of textboxes (at 100)
          });
        };
        reader.readAsDataURL(file);
      });
    })).then(uploadedImages => {
      setSlides(prev => prev.map((s, i) =>
        i === currentIdx ? {
          ...s,
          images: [...(s.images || []), ...uploadedImages]
        } : s
      ));
    });
  };
  // Remove image handler
  const handleRemoveImage = idx => {
    setSlides(prev => prev.map((s, i) =>
      i === currentIdx ? {
        ...s,
        images: s.images.filter((_, j) => j !== idx)
      } : s
    ));
    setSelectedImage(null);
  };
  
  // Remove legacy image and ensure consistency
  const handleRemoveLegacyImage = () => {
    setSlides(prev => prev.map((s, i) => 
      i === currentIdx ? { 
        ...s, 
        image: null,
        // If this was the only image representation, also clear the images array
        images: (s.images && s.images.length > 0) ? s.images : []
      } : s
    ));
  };
  
  // Remove all images from a slide
  const handleRemoveAllImages = () => {
    setSlides(prev => prev.map((s, i) => 
      i === currentIdx ? { 
        ...s, 
        image: null,
        images: []
      } : s
    ));
    setSelectedImage(null);
  };

  // Helper: get style for a textbox type from currentTemplate
  const getTextBoxStyle = (type) => {
    if (!currentTemplate || !currentTemplate.styles) return {};
    if (type === "title" && currentTemplate.styles.title) return currentTemplate.styles.title;
    if (type === "body" && currentTemplate.styles.body) return currentTemplate.styles.body;
    return {};
  };

  // Helper: get slide background style
  const getSlideBackground = () => {
    if (!currentTemplate || !currentTemplate.styles || !currentTemplate.styles.slide) return { fill: "#fff" };
    // For abstract gradient, use a linear gradient background (CSS for preview, Konva for export)
    if (currentTemplate.id === "tailwind-abstract-gradient") {
      return {
        background: "linear-gradient(120deg, #d1fae5 0%, #bfdbfe 50%, #ddd6fe 100%)", // Approximation
        // You can add more logic here for geometric shapes if you want to render them in the preview
      };
    }
    // Fallback to solid color
    if (currentTemplate.styles.slide.backgroundColor && currentTemplate.styles.slide.backgroundColor.startsWith("#")) {
      return { background: currentTemplate.styles.slide.backgroundColor };
    }
    // Tailwind class fallback (not used in inline style)
    return { background: "#fff" };
  };

  // Helper: Render Abstract Gradient background and shapes for Abstract template
  const renderAbstractBackground = () => {
    // Main gradient background
    const gradient = "linear-gradient(120deg, #d1fae5 0%, #bfdbfe 50%, #a5b4fc 100%)";
    // Squares (SVG for crispness)
    const squares = (
      <svg width={SLIDE_WIDTH} height={SLIDE_HEIGHT} style={{ position: 'absolute', left: 0, top: 0, zIndex: 1, pointerEvents: 'none' }}>
        <rect x="-40" y="-40" width="220" height="220" fill="#fff" opacity="0.13" transform="rotate(35 70 70)" />
        <rect x="120" y="-20" width="160" height="160" fill="#fff" opacity="0.13" transform="rotate(35 200 60)" />
      </svg>
    );
    // Right panel and circles
    const rightPanel = (
      <div style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: SLIDE_WIDTH * 0.42,
        height: SLIDE_HEIGHT,
        background: '#f3f7fb',
        zIndex: 2,
      }}>
        <svg width={SLIDE_WIDTH * 0.42} height={SLIDE_HEIGHT} style={{ position: 'absolute', right: 0, bottom: 0, zIndex: 3 }}>
          <circle cx={SLIDE_WIDTH * 0.32} cy={SLIDE_HEIGHT * 0.85} r={SLIDE_HEIGHT * 0.32} fill="none" stroke="#bbf7d0" strokeWidth="7" opacity="0.6" />
          <circle cx={SLIDE_WIDTH * 0.5} cy={SLIDE_HEIGHT * 0.7} r={SLIDE_HEIGHT * 0.22} fill="none" stroke="#bae6fd" strokeWidth="6" opacity="0.5" />
        </svg>
      </div>
    );
    return (
      <>
        <div style={{ position: 'absolute', left: 0, top: 0, width: SLIDE_WIDTH, height: SLIDE_HEIGHT, background: gradient, zIndex: 0 }} />
        {squares}
        {rightPanel}
      </>
    );
  };

  // Helper: Render Abstract content box (rounded rectangle with gradient)
  const renderAbstractContentBox = (children, withImagePlaceholder = false) => {
    return (
      <div style={{
        position: 'absolute',
        left: 40,
        top: 32,
        width: SLIDE_WIDTH - 80,
        height: SLIDE_HEIGHT - 64,
        borderRadius: 18,
        background: 'linear-gradient(120deg, #d1fae5 0%, #bfdbfe 50%, #a5b4fc 100%)',
        zIndex: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 0,
      }}>
        <div style={{ flex: withImagePlaceholder ? 0.6 : 1, padding: '36px 36px 0 36px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          {children}
        </div>
        {withImagePlaceholder && (
          <div style={{ flex: 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{
              width: '90%',
              height: '80%',
              borderRadius: 32,
              border: '2px solid #222',
              background: 'rgba(180, 220, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 600,
              color: '#222',
              letterSpacing: 1,
            }}>
              INSERT IMAGE
            </div>
          </div>
        )}
      </div>
    );
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
            <label style={{ fontSize: 13, color: '#222', marginBottom: 4 }}>Image</label>            <div className="image-upload-row">
              <button className="image-upload-btn" onClick={() => fileInputRef.current.click()}>Upload Image</button>
              <input type="file" accept="image/*" multiple ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
              {slide.image && <button className="remove-image-btn" onClick={() => setSlides(prev => prev.map((s, i) => i === currentIdx ? { ...s, image: null } : s))}>Remove Legacy Image</button>}
              {slide.images && slide.images.length > 0 && <button className="remove-image-btn" onClick={() => setSlides(prev => prev.map((s, i) => i === currentIdx ? { ...s, images: [] } : s))}>Remove All Images</button>}
            </div>
          </div>
        </div>

        {/* --- Main area: toolbar above slide --- */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          {/* --- Formatting Toolbar (horizontal, above slide) --- */}
          <div className="slide-toolbar">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '8px', fontSize: '14px' }}>Font:</span>
              <select
                value={selectedTextBox?.fontFamily || 'Arial'}
                onChange={e => handleToolbarChange('fontFamily', e.target.value)}
                disabled={!selectedTextBox} // Enable when a textbox is selected
                style={{ marginRight: '12px', padding: '4px', fontSize: '14px' }}
              >
                {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <span style={{ marginRight: '8px', fontSize: '14px' }}>Size:</span>
              <select
                value={selectedTextBox?.fontSize || 24}
                onChange={e => handleToolbarChange('fontSize', Number(e.target.value))}
                disabled={!selectedTextBox} // Enable when a textbox is selected
                style={{ marginRight: '12px', padding: '4px', fontSize: '14px' }}
              >
                {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
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
            </button>            <input
              type="color"
              value={selectedTextBox?.fill || '#222'}
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
            <button style={{ ...TOOLBAR_BUTTON_STYLE, fontSize: 15 }} onClick={() => {}} disabled={!selectedTextBox}><FaHighlighter /></button>
          </div>

          {/* --- Slide Preview/Editor --- */}
          <div
            className="slide-preview"
            style={{
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
              background: currentTemplate?.id === "tailwind-abstract-gradient" ? undefined : getSlideBackground().background,
            }}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
            onDrop={e => {
              e.preventDefault();
              const dragDataString = e.dataTransfer.getData("text/plain");
              if (!dragDataString) return;
              try {
                const dragData = JSON.parse(dragDataString);
                const slidePreviewRect = e.currentTarget.getBoundingClientRect();
                let newX = e.clientX - slidePreviewRect.left - dragData.offsetX;
                let newY = e.clientY - slidePreviewRect.top - dragData.offsetY;
                newX = Math.max(0, newX);
                newY = Math.max(0, newY);
                handleTextSetPosition(dragData.id, newX, newY);
              } catch (error) { console.error("Error processing drop data:", error); }
            }}
          >
            {/* Only render Abstract background on Slide 1 */}
            {currentTemplate?.id === "tailwind-abstract-gradient" && currentIdx === 0 && renderAbstractBackground()}

            {/* --- Abstract Template: Slide 1: constrain textboxes to gradient area, center, draggable, resizable --- */}
            {currentTemplate?.id === "tailwind-abstract-gradient" && currentIdx === 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: 60,
                  top: 60,
                  width: SLIDE_WIDTH * 0.62 - 100, // Gradient area width
                  height: SLIDE_HEIGHT - 120,    // Gradient area height
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "auto",
                }}
              >
                {slide.textboxes.map((tb, i) => {
                  const gradientContainerWidth = SLIDE_WIDTH * 0.62 - 100;
                  const textboxDefaultWidth = SLIDE_WIDTH * 0.62 - 120; // Default width for a textbox within the gradient area
                  const currentTextboxEffectiveWidth = tb.width || textboxDefaultWidth;
                  
                  const defaultCenteringX_local = (gradientContainerWidth - currentTextboxEffectiveWidth) / 2;
                  
                  let defaultStackingY_local;
                  if (i === 0 && tb.type === 'title') {
                    defaultStackingY_local = 60; // Adjusted default top for title
                  } else if (i === 1 && tb.type === 'body') {
                    defaultStackingY_local = 150; // Adjusted default top for body
                  } else {
                    // Fallback for additional textboxes, stacking them below the title area
                    defaultStackingY_local = 60 + i * 90; 
                  }

                  const gradientOffsetX = 60;
                  const gradientOffsetY = 60;

                  const styleLeft = tb.x !== undefined ? `${tb.x - gradientOffsetX}px` : `${defaultCenteringX_local}px`;
                  const styleTop = tb.y !== undefined ? `${tb.y - gradientOffsetY}px` : `${defaultStackingY_local}px`;

                  return (
                    <div
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
                      className={"slide-textbox" + (selectedTextBoxId === tb.id ? " selected" : "")}
                      style={{
                        position: "absolute",
                        left: styleLeft,
                        top: styleTop,
                        width: currentTextboxEffectiveWidth,
                        minHeight: 40,
                        maxWidth: gradientContainerWidth, // Constrain textbox width to gradient area
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
                        padding: "8px 16px",
                        boxSizing: "border-box",
                        overflowWrap: "break-word",
                        wordWrap: "break-word",
                        overflow: "auto",
                        resize: "both",
                        zIndex: TEXT_Z_INDEX,
                        cursor: "move",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      contentEditable
                      suppressContentEditableWarning
                      spellCheck={true}
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
                      tabIndex={0}
                      draggable
                      onDragStart={e => {
                        const rect = e.target.getBoundingClientRect();
                        const dragData = {
                          id: tb.id,
                          offsetX: e.clientX - rect.left,
                          offsetY: e.clientY - rect.top
                        };
                        e.dataTransfer.setData("text/plain", JSON.stringify(dragData));
                        e.dataTransfer.effectAllowed = "move";
                        setSelectedTextBoxId(tb.id);
                      }}
                    >
                      {tb.bullets
                        ? tb.text.split("\\\\n").map((line, idx) => <div key={idx} style={{ marginBottom: tb.paragraphSpacing }}>{line ? <>&bull; {line}</> : <br />}</div>)
                        : tb.text.split("\\\\n").map((line, idx) => <div key={idx} style={{ marginBottom: tb.paragraphSpacing }}>{line || <br />}</div>)}
                    </div>
                  );
                })}
              </div>
            ) :
            // --- Abstract Template: Slides 2+ use content box layout ---
            currentTemplate?.id === "tailwind-abstract-gradient" && currentIdx > 0 ? (
              renderAbstractContentBox(
                <>
                  {slide.textboxes.map(tb => (
                    <div
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
                      className={"slide-textbox" + (selectedTextBoxId === tb.id ? " selected" : "")}
                      style={{
                        position: "relative",
                        width: "100%",
                        minHeight: 40,
                        marginBottom: 18,
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
                        padding: "8px 16px",
                        boxSizing: "border-box",
                        overflowWrap: "break-word",
                        wordWrap: "break-word",
                        overflow: "auto",
                        resize: "none",
                        zIndex: TEXT_Z_INDEX
                      }}
                      contentEditable
                      suppressContentEditableWarning
                      spellCheck={true}
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
                      tabIndex={0}
                    >
                      {tb.bullets
                        ? tb.text.split("\n").map((line, i) => <div key={i} style={{ marginBottom: tb.paragraphSpacing }}>{line ? <>&bull; {line}</> : <br />}</div>)
                        : tb.text.split("\n").map((line, i) => <div key={i} style={{ marginBottom: tb.paragraphSpacing }}>{line || <br />}</div>)}
                    </div>
                  ))}
                </>,
                // withImagePlaceholder: show placeholder if no image, else show image
                (slide.images && slide.images.length > 0) || slide.image
              )
            ) : (
              // Default: render all textboxes absolutely positioned (original logic)
              slide.textboxes.map(tb => (
                <div
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
                  className={"slide-textbox" + (selectedTextBoxId === tb.id ? " selected" : "")}
                  style={{
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
                    cursor: "move",
                    zIndex: TEXT_Z_INDEX
                  }}
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck={true}
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
                  tabIndex={0}
                  draggable
                  onDragStart={e => {
                    const rect = e.target.getBoundingClientRect();
                    const dragData = {
                      id: tb.id,
                      offsetX: e.clientX - rect.left,
                      offsetY: e.clientY - rect.top
                    };
                    e.dataTransfer.setData("text/plain", JSON.stringify(dragData));
                    e.dataTransfer.effectAllowed = "move";
                    setSelectedTextBoxId(tb.id);
                  }}
                >
                  {tb.bullets
                    ? tb.text.split("\n").map((line, i) => <div key={i} style={{ marginBottom: tb.paragraphSpacing }}>{line ? <>&bull; {line}</> : <br />}</div>)
                    : tb.text.split("\n").map((line, i) => <div key={i} style={{ marginBottom: tb.paragraphSpacing }}>{line || <br />}</div>)}
                </div>
              ))
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
            )}
            {slide.images && slide.images.map((image, idx) => (
              <div
                key={image.id}
                style={{
                  position: 'absolute',
                  left: image.x,
                  top: image.y,
                  width: image.width,
                  height: image.height,
                  cursor: selectedImage === idx ? 'move' : 'pointer',
                  border: selectedImage === idx ? '2px solid #1976d2' : 'none',
                  boxSizing: 'border-box',
                  userSelect: 'none',
                  background: 'transparent',
                  zIndex: typeof image.zIndex === 'number' ? image.zIndex : DEFAULT_IMAGE_Z_INDEX // Apply zIndex from image object
                }}
                onMouseDown={e => {
                  if (e.target.className && typeof e.target.className === 'string' && e.target.className.includes('resize-handle')) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedImage(idx);
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const initialImageX = image.x;
                  const initialImageY = image.y;
                  const onMouseMove = (moveEvent) => {
                    const dx = moveEvent.clientX - startX;
                    const dy = moveEvent.clientY - startY;
                    handleImageDrag(idx, initialImageX + dx, initialImageY + dy);
                  };
                  const onMouseUp = () => {
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                  };
                  window.addEventListener('mousemove', onMouseMove);
                  window.addEventListener('mouseup', onMouseUp);
                }}
                onClick={e => { e.stopPropagation(); setSelectedImage(idx); }}
              >
                <img
                  src={image.src}
                  alt="Slide illustration"
                  style={{ width: '100%', height: '100%', pointerEvents: 'none', userSelect: 'none' }}
                  draggable={false}
                />
                {selectedImage === idx && (
                  <div
                    className="resize-handle"
                    style={{
                      position: 'absolute',
                      right: 0,
                      bottom: 0,
                      width: 16,
                      height: 16,
                      background: '#1976d2',
                      borderRadius: '50%',
                      cursor: 'nwse-resize',
                      zIndex: 20, 
                    }}
                    onMouseDown={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const initialImageWidth = image.width;
                      const initialImageHeight = image.height;
                      const onResizeMouseMove = (moveEvent) => {
                        const newWidth = Math.max(20, initialImageWidth + (moveEvent.clientX - startX));
                        const newHeight = Math.max(20, initialImageHeight + (moveEvent.clientY - startY));
                        handleImageResize(idx, newWidth, newHeight);
                      };
                      const onResizeMouseUp = () => {
                        window.removeEventListener('mousemove', onResizeMouseMove);
                        window.removeEventListener('mouseup', onResizeMouseUp);
                      };
                      window.addEventListener('mousemove', onResizeMouseMove);
                      window.addEventListener('mouseup', onResizeMouseUp);
                    }}
                  />
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
      </div>
      {/* --- Floating Action Bar (bottom) --- */}
  <div className="slide-editor-actions">
    {/* ...existing code ... */}
    <button onClick={() => navigate("/slides-generating")}>Return to Slides</button>
    <button onClick={handleAddSlide}>Add Slide</button>
    <button onClick={handleDeleteSlide}>Delete Slide</button>
    <button onClick={handleSave}>Save</button>
    <button onClick={handleExportPowerPoint}>Export to PowerPoint</button>
  </div>
</div>
);
}

export default SlideEditor;
