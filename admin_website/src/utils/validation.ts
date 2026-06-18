// Validation utility functions for form validation

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation (supports various formats)
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// Name validation (letters, spaces, hyphens, apostrophes)
export const validateName = (name: string): boolean => {
  const nameRegex = /^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžæÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ∂ð\s\'\-\.]+$/;
  return nameRegex.test(name) && name.trim().length >= 2;
};

// Password validation
export const validatePassword = (password: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' });
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one lowercase letter' });
  }
  
  if (!/\d/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one number' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// User profile validation
export const validateUserProfile = (data: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // First name validation
  if (!data.firstName.trim()) {
    errors.push({ field: 'firstName', message: 'First name is required' });
  } else if (!validateName(data.firstName)) {
    errors.push({ field: 'firstName', message: 'First name contains invalid characters' });
  } else if (data.firstName.trim().length > 50) {
    errors.push({ field: 'firstName', message: 'First name cannot exceed 50 characters' });
  }

  // Last name validation
  if (!data.lastName.trim()) {
    errors.push({ field: 'lastName', message: 'Last name is required' });
  } else if (!validateName(data.lastName)) {
    errors.push({ field: 'lastName', message: 'Last name contains invalid characters' });
  } else if (data.lastName.trim().length > 50) {
    errors.push({ field: 'lastName', message: 'Last name cannot exceed 50 characters' });
  }

  // Email validation
  if (!data.email.trim()) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validateEmail(data.email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  } else if (data.email.length > 100) {
    errors.push({ field: 'email', message: 'Email cannot exceed 100 characters' });
  }

  // Phone validation (optional)
  if (data.phone && data.phone.trim()) {
    if (!validatePhone(data.phone)) {
      errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
    } else if (data.phone.length > 20) {
      errors.push({ field: 'phone', message: 'Phone number cannot exceed 20 characters' });
    }
  }

  // Address validation (optional)
  if (data.address && data.address.trim()) {
    if (data.address.length > 500) {
      errors.push({ field: 'address', message: 'Address cannot exceed 500 characters' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Store validation
export const validateStore = (data: {
  name: string;
  description?: string;
  address: string;
  phone: string;
  email: string;
  category: string;
  openingHours: string;
  closingHours: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // Store name validation
  if (!data.name.trim()) {
    errors.push({ field: 'name', message: 'Store name is required' });
  } else if (data.name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Store name must be at least 2 characters long' });
  } else if (data.name.length > 100) {
    errors.push({ field: 'name', message: 'Store name cannot exceed 100 characters' });
  }

  // Address validation
  if (!data.address.trim()) {
    errors.push({ field: 'address', message: 'Address is required' });
  } else if (data.address.length > 500) {
    errors.push({ field: 'address', message: 'Address cannot exceed 500 characters' });
  }

  // Phone validation
  if (!data.phone.trim()) {
    errors.push({ field: 'phone', message: 'Phone number is required' });
  } else if (!validatePhone(data.phone)) {
    errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
  }

  // Email validation
  if (!data.email.trim()) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validateEmail(data.email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  // Category validation
  if (!data.category.trim()) {
    errors.push({ field: 'category', message: 'Category is required' });
  }

  // Opening hours validation
  if (!data.openingHours.trim()) {
    errors.push({ field: 'openingHours', message: 'Opening hours are required' });
  }

  // Closing hours validation
  if (!data.closingHours.trim()) {
    errors.push({ field: 'closingHours', message: 'Closing hours are required' });
  }

  // Description validation (optional)
  if (data.description && data.description.length > 1000) {
    errors.push({ field: 'description', message: 'Description cannot exceed 1000 characters' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Category validation
export const validateCategory = (data: {
  name: string;
  description?: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // Category name validation
  if (!data.name.trim()) {
    errors.push({ field: 'name', message: 'Category name is required' });
  } else if (data.name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Category name must be at least 2 characters long' });
  } else if (data.name.length > 50) {
    errors.push({ field: 'name', message: 'Category name cannot exceed 50 characters' });
  }

  // Description validation (optional)
  if (data.description && data.description.length > 500) {
    errors.push({ field: 'description', message: 'Description cannot exceed 500 characters' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generic required field validation
export const validateRequired = (value: string, fieldName: string): ValidationError | null => {
  if (!value.trim()) {
    return { field: fieldName, message: `${fieldName} is required` };
  }
  return null;
};

// Generic length validation
export const validateLength = (
  value: string, 
  fieldName: string, 
  min?: number, 
  max?: number
): ValidationError | null => {
  if (min && value.length < min) {
    return { field: fieldName, message: `${fieldName} must be at least ${min} characters long` };
  }
  if (max && value.length > max) {
    return { field: fieldName, message: `${fieldName} cannot exceed ${max} characters` };
  }
  return null;
};
