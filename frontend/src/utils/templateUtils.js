// Template utility functions for managing built-in and custom templates
import config from "../config";

// Built-in templates that are always available
export const BUILTIN_TEMPLATES = [
    {
        id: "tailwind-abstract-gradient",
        name: "Abstract Gradient",
        preview: "/static/template_backgrounds/abstract_title.png",
        type: "builtin"
    },
    {
        id: "tailwind-business",
        name: "Business",
        preview: "/static/template_backgrounds/business_title.png",
        type: "builtin"
    },
    {
        id: "tailwind-creative",
        name: "Creative",
        preview: "/static/template_backgrounds/creative_title.png",
        type: "builtin"
    },
    {
        id: "tailwind-education",
        name: "Education",
        preview: "/static/template_backgrounds/education_title.png",
        type: "builtin"
    }
];

/**
 * Fetch custom templates for a user from the backend
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} Array of custom templates
 */
export const fetchCustomTemplates = async (userId) => {
    if (!userId) {
        return [];
    }

    try {
        const response = await fetch(`${config.API_BASE_URL}/user-templates/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('Failed to fetch custom templates:', response.statusText);
            return [];
        }

        const data = await response.json();
        
        // Transform custom templates to match the expected format
        return data.templates.map(template => ({
            id: `custom-${template.id}`,
            name: template.name,
            preview: `${config.API_BASE_URL}${template.preview}`,
            type: "custom",
            customId: template.id
        }));
    } catch (error) {
        console.error('Error fetching custom templates:', error);
        return [];
    }
};

/**
 * Get all available templates (built-in + custom) for a user
 * @param {string} userId - The user ID (optional)
 * @returns {Promise<Array>} Array of all available templates
 */
export const getAllTemplates = async (userId = null) => {
    const customTemplates = await fetchCustomTemplates(userId);
    return [...BUILTIN_TEMPLATES, ...customTemplates];
};

/**
 * Get user ID from localStorage
 * @returns {string|null} User ID or null if not found
 */
export const getCurrentUserId = () => {
    try {
        const user = JSON.parse(localStorage.getItem("user"));
        return user && user.id ? user.id : null;
    } catch (error) {
        console.error('Error getting user ID:', error);
        return null;
    }
};

/**
 * Hook-like function to manage templates state
 * This can be used in React components to get and update templates
 */
export const useTemplates = () => {
    const userId = getCurrentUserId();

    const loadTemplates = async () => {
        return await getAllTemplates(userId);
    };

    const refreshTemplates = async () => {
        return await getAllTemplates(userId);
    };

    return {
        loadTemplates,
        refreshTemplates,
        userId
    };
};
