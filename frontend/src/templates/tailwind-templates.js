export const tailwindTemplates = [
  {
    id: "tailwind-modern-dark",
    name: "Modern Dark (Tailwind)",
    preview: "/images/preview-modern-dark.png", // Placeholder for actual preview image
    description: "A sleek, dark-themed template using Tailwind conventions.",
    styles: {
      slide: {
        backgroundColor: "bg-gray-800", // Tailwind class for background
      },
      title: {
        fontFamily: "Arial, sans-serif", // Standard font family
        fontSize: "text-4xl", // Tailwind class for size
        textColor: "text-white", // Tailwind class for color
        fontWeight: "font-bold", // Tailwind class for weight
        textAlign: "center", // Konva direct value
      },
      body: {
        fontFamily: "Arial, sans-serif",
        fontSize: "text-lg",
        textColor: "text-gray-300",
        lineHeight: 1.5, // Konva direct value
        textAlign: "left",
      },
      accent: { // Example for an accent color that might be used for shapes or highlights
        backgroundColor: "bg-blue-500",
        textColor: "text-blue-100",
      }
    }
  },
  {
    id: "tailwind-light-professional",
    name: "Light Professional (Tailwind)",
    preview: "/images/preview-light-pro.png", // Placeholder
    description: "A clean, light-themed template for professional presentations.",
    styles: {
      slide: {
        backgroundColor: "bg-white",
      },
      title: {
        fontFamily: "Verdana, sans-serif",
        fontSize: "text-5xl",
        textColor: "text-gray-900",
        fontWeight: "font-bold",
        textAlign: "left",
      },
      body: {
        fontFamily: "Verdana, sans-serif",
        fontSize: "text-xl",
        textColor: "text-gray-700",
        lineHeight: 1.6,
        textAlign: "left",
      },
      accent: {
        backgroundColor: "bg-green-600",
        textColor: "text-green-50",
      }
    }
  },
  {
    id: "tailwind-abstract-gradient",
    name: "Abstract Gradient (Tailwind)",
    preview: "/images/preview-abstract-gradient.png", // Create this preview image
    description: "An abstract design with a soft blue-green gradient and geometric elements.",
    styles: {
      slide: {
        // Approximate gradient. Complex shapes (squares, circles) would need
        // to be drawn by Konva in SlideEditor based on this template's ID or specific flags.
        backgroundColor: "bg-gradient-to-br from-green-200 via-blue-300 to-purple-200", // Example gradient
        // For Konva, you'd translate this to:
        // backgroundKonva: {
        //   fillLinearGradientStartPoint: { x: 0, y: 0 },
        //   fillLinearGradientEndPoint: { x: SLIDE_WIDTH, y: SLIDE_HEIGHT },
        //   fillLinearGradientColorStops: [0, '#A0D2DB', 0.5, '#B4C5E4', 1, '#D8BFD8'], // Approx hex values
        // },
        // complexBackgroundElements: true, // Flag for SlideEditor to draw extra shapes
      },
      title: { // For "Title Here" on title slide, and "Subheading" on content slides
        fontFamily: "'Arial', 'Helvetica', sans-serif",
        fontSize: "text-5xl", // Tailwind class for size (e.g., 3rem or 48px)
        konvaFontSize: 48, // Corresponding pixel value for Konva
        textColor: "text-white", // Tailwind class
        konvaTextColor: "#FFFFFF",
        fontWeight: "font-bold", // Tailwind class
        textAlign: "left", // Konva direct value
        textVerticalAlign: "top", // Custom property for Konva vertical alignment if needed
        padding: 20, // General padding for Konva text box
      },
      description: { // For "Description" on title slide
        fontFamily: "'Arial', 'Helvetica', sans-serif",
        fontSize: "text-2xl", // e.g., 1.5rem or 24px
        konvaFontSize: 24,
        textColor: "text-gray-800", // Dark color
        konvaTextColor: "#2D3748", // Approx dark gray/navy
        fontWeight: "font-normal",
        textAlign: "left",
        textVerticalAlign: "top",
        padding: 10,
      },
      body: { // For "Add a little bit of body text"
        fontFamily: "'Arial', 'Helvetica', sans-serif",
        fontSize: "text-xl", // e.g., 1.25rem or 20px
        konvaFontSize: 20,
        textColor: "text-gray-700",
        konvaTextColor: "#4A5568", // Approx gray
        lineHeight: 1.5, // Konva direct value
        textAlign: "left",
        padding: 10,
        bullet: {
          color: "text-gray-700", // Color of the bullet point itself
          konvaBulletColor: "#4A5568",
          indent: 20, // Indentation for bulleted text
        }
      },
      imagePlaceholder: { // For "INSERT IMAGE" area
        borderColor: "text-black", // Tailwind class
        konvaBorderColor: "#000000",
        borderWidth: 1, // Konva direct value
        borderRadius: 15, // Konva direct value (or use Tailwind rounded-lg if applying to an HTML div)
        textColor: "text-black",
        konvaTextColor: "#000000",
        fontFamily: "'Arial', 'Helvetica', sans-serif",
        fontSize: "text-lg",
        konvaFontSize: 18,
        text: "INSERT IMAGE",
        backgroundColor: "bg-transparent", // Or a semi-transparent fill
        konvaBackgroundColor: "rgba(255, 255, 255, 0.3)", // Example semi-transparent
      },
      // You might add more specific styles for different layouts if needed
      // e.g., titleSlideTextAlignment, contentSlideTextAlignment
    }
  }
];

// Helper to get a template by ID (optional, but can be useful)
export const getTailwindTemplateById = (id) => {
  return tailwindTemplates.find(t => t.id === id);
};
