/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - The user input to sanitize
 * @returns {string} - Sanitized input
 */
export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;

    // Remove HTML tags and script content
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();
};

/**
 * Sanitize HTML but allow safe tags for rich text
 * @param {string} html - The HTML to sanitize
 * @returns {string} - Sanitized HTML
 */
export const sanitizeHTML = (html) => {
    if (typeof html !== 'string') return html;

    // Remove dangerous tags and attributes
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/g, '')
        .replace(/on\w+='[^']*'/g, '')
        .replace(/javascript:/gi, '')
        .trim();
};

/**
 * Validate and sanitize quiz title
 * @param {string} title - Quiz title
 * @returns {string} - Sanitized title
 */
export const sanitizeQuizTitle = (title) => {
    const sanitized = sanitizeInput(title);
    // Limit length to prevent abuse
    return sanitized.substring(0, 200);
};

/**
 * Validate and sanitize question text
 * @param {string} questionText - Question text
 * @returns {string} - Sanitized question text
 */
export const sanitizeQuestionText = (questionText) => {
    const sanitized = sanitizeInput(questionText);
    // Limit length
    return sanitized.substring(0, 500);
};

/**
 * Validate and sanitize option text
 * @param {string} optionText - Option text
 * @returns {string} - Sanitized option text
 */
export const sanitizeOptionText = (optionText) => {
    const sanitized = sanitizeInput(optionText);
    // Limit length
    return sanitized.substring(0, 200);
};

/**
 * Validate file upload
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Object} - {valid: boolean, error: string}
 */
export const validateFileUpload = (file, options = {}) => {
    const {
        maxSize = 10 * 1024 * 1024, // 10MB default
        allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
    } = options;

    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    if (file.size > maxSize) {
        return { valid: false, error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit` };
    }

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'File type not allowed' };
    }

    return { valid: true, error: null };
};
