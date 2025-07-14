// Comprehensive validation utility for the attendance application
class ValidationManager {
    constructor() {
        this.rules = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            name: /^[a-zA-Z\s\-']{2,50}$/,
            password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
            subjectCode: /^[A-Z]{2,4}\d{3,4}$/,
            phoneNumber: /^\+?[\d\s\-\(\)]{10,15}$/
        };
        
        this.messages = {
            required: 'This field is required',
            email: 'Please enter a valid email address',
            name: 'Name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes',
            password: 'Password must be at least 8 characters with uppercase, lowercase, and number',
            subjectCode: 'Subject code must be 2-4 letters followed by 3-4 numbers (e.g., CS101)',
            phoneNumber: 'Please enter a valid phone number',
            minLength: 'Must be at least {min} characters long',
            maxLength: 'Must be no more than {max} characters long',
            match: 'Fields do not match',
            unique: 'This value already exists'
        };
    }

    // Validate individual field
    validateField(value, rules, fieldName = '') {
        const errors = [];
        
        // Check if required
        if (rules.required && (!value || value.toString().trim() === '')) {
            errors.push(this.messages.required);
            return { valid: false, errors };
        }
        
        // Skip other validations if field is empty and not required
        if (!value || value.toString().trim() === '') {
            return { valid: true, errors: [] };
        }
        
        const trimmedValue = value.toString().trim();
        
        // Type-specific validation
        if (rules.type) {
            switch (rules.type) {
                case 'email':
                    if (!this.rules.email.test(trimmedValue)) {
                        errors.push(this.messages.email);
                    }
                    break;
                case 'name':
                    if (!this.rules.name.test(trimmedValue)) {
                        errors.push(this.messages.name);
                    }
                    break;
                case 'password':
                    if (!this.rules.password.test(trimmedValue)) {
                        errors.push(this.messages.password);
                    }
                    break;
                case 'subjectCode':
                    if (!this.rules.subjectCode.test(trimmedValue)) {
                        errors.push(this.messages.subjectCode);
                    }
                    break;
                case 'phoneNumber':
                    if (!this.rules.phoneNumber.test(trimmedValue)) {
                        errors.push(this.messages.phoneNumber);
                    }
                    break;
            }
        }
        
        // Length validation
        if (rules.minLength && trimmedValue.length < rules.minLength) {
            errors.push(this.messages.minLength.replace('{min}', rules.minLength));
        }
        
        if (rules.maxLength && trimmedValue.length > rules.maxLength) {
            errors.push(this.messages.maxLength.replace('{max}', rules.maxLength));
        }
        
        // Custom pattern validation
        if (rules.pattern && !rules.pattern.test(trimmedValue)) {
            errors.push(rules.message || 'Invalid format');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors,
            value: trimmedValue
        };
    }

    // Validate form data
    validateForm(formData, validationRules) {
        const results = {};
        let isValid = true;
        
        for (const [fieldName, rules] of Object.entries(validationRules)) {
            const fieldValue = formData[fieldName];
            const validation = this.validateField(fieldValue, rules, fieldName);
            
            results[fieldName] = validation;
            if (!validation.valid) {
                isValid = false;
            }
        }
        
        // Cross-field validation
        if (validationRules.confirmPassword && formData.password && formData.confirmPassword) {
            if (formData.password !== formData.confirmPassword) {
                results.confirmPassword = {
                    valid: false,
                    errors: [this.messages.match],
                    value: formData.confirmPassword
                };
                isValid = false;
            }
        }
        
        return {
            valid: isValid,
            fields: results,
            errors: this.getErrorMessages(results)
        };
    }

    // Get all error messages
    getErrorMessages(validationResults) {
        const errors = [];
        for (const [fieldName, result] of Object.entries(validationResults)) {
            if (!result.valid) {
                errors.push(...result.errors.map(error => `${fieldName}: ${error}`));
            }
        }
        return errors;
    }

    // Validate attendance data structure
    validateAttendanceData(data) {
        const errors = [];
        
        if (!data) {
            errors.push('Attendance data is required');
            return { valid: false, errors };
        }
        
        if (!data.subjects || typeof data.subjects !== 'object') {
            errors.push('Subjects data is required and must be an object');
        }
        
        if (!data.todaysClasses || !Array.isArray(data.todaysClasses)) {
            errors.push('Today\'s classes data is required and must be an array');
        }
        
        // Validate subject structure
        if (data.subjects) {
            for (const [subjectName, subjectData] of Object.entries(data.subjects)) {
                if (!subjectData || typeof subjectData !== 'object') {
                    errors.push(`Subject ${subjectName} must be an object`);
                    continue;
                }
                
                if (typeof subjectData.present !== 'number' || subjectData.present < 0) {
                    errors.push(`Subject ${subjectName} must have a valid present count`);
                }
                
                if (typeof subjectData.absent !== 'number' || subjectData.absent < 0) {
                    errors.push(`Subject ${subjectName} must have a valid absent count`);
                }
                
                if (!Array.isArray(subjectData.sessions)) {
                    errors.push(`Subject ${subjectName} must have a sessions array`);
                }
            }
        }
        
        // Validate today's classes structure
        if (data.todaysClasses) {
            for (let i = 0; i < data.todaysClasses.length; i++) {
                const classData = data.todaysClasses[i];
                
                if (!classData.id || typeof classData.id !== 'number') {
                    errors.push(`Class at index ${i} must have a valid numeric ID`);
                }
                
                if (!classData.subject || typeof classData.subject !== 'string') {
                    errors.push(`Class at index ${i} must have a valid subject name`);
                }
                
                if (classData.status && !['present', 'absent', 'unmarked'].includes(classData.status)) {
                    errors.push(`Class at index ${i} has invalid status: ${classData.status}`);
                }
                
                // Check if subject exists in subjects data
                if (data.subjects && classData.subject && !data.subjects[classData.subject]) {
                    errors.push(`Subject ${classData.subject} in today's classes not found in subjects data`);
                }
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // Validate notification data
    validateNotificationData(notification) {
        const errors = [];
        
        if (!notification) {
            errors.push('Notification data is required');
            return { valid: false, errors };
        }
        
        if (!notification.message || typeof notification.message !== 'string' || notification.message.trim().length === 0) {
            errors.push('Notification message is required');
        }
        
        if (notification.message && notification.message.length > 500) {
            errors.push('Notification message must be less than 500 characters');
        }
        
        if (!notification.userId || typeof notification.userId !== 'string') {
            errors.push('Notification must have a valid user ID');
        }
        
        if (notification.type && !['info', 'warning', 'error', 'success'].includes(notification.type)) {
            errors.push('Notification type must be one of: info, warning, error, success');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // Sanitize input to prevent XSS
    sanitizeInput(input) {
        if (typeof input !== 'string') {
            return input;
        }
        
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    // Validate and sanitize form input
    processFormInput(formData, validationRules) {
        const validation = this.validateForm(formData, validationRules);
        
        if (validation.valid) {
            const sanitizedData = {};
            for (const [key, value] of Object.entries(formData)) {
                sanitizedData[key] = this.sanitizeInput(value);
            }
            validation.sanitizedData = sanitizedData;
        }
        
        return validation;
    }
}

// Create global validation manager instance
window.validationManager = new ValidationManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationManager;
}
