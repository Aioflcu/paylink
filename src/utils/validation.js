// Input validation utilities
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  // At least 6 characters, 1 uppercase, 1 number
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
  return passwordRegex.test(password);
};

export const validatePhone = (phone) => {
  // Nigerian phone number: +234 or 0, followed by 10 digits
  const phoneRegex = /^(\+234|0)\d{10}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const validatePIN = (pin, length = 4) => {
  const pinRegex = new RegExp(`^\\d{${length}}$`);
  return pinRegex.test(pin);
};

export const validateUsername = (username) => {
  // 3-20 characters, alphanumeric and underscore only
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

export const validateAmount = (amount, min = 100, max = 100000) => {
  const numAmount = parseInt(amount);
  return !isNaN(numAmount) && numAmount >= min && numAmount <= max;
};

export const validateMeterNumber = (meter) => {
  // Nigerian meter numbers are typically 11-12 digits
  const meterRegex = /^\d{11,12}$/;
  return meterRegex.test(meter.replace(/\s/g, ''));
};

export const validateSmartcard = (smartcard) => {
  // Cable TV smartcards are typically 20 characters
  const smartcardRegex = /^[a-zA-Z0-9]{17,25}$/;
  return smartcardRegex.test(smartcard.replace(/\s/g, ''));
};

export const formatCurrency = (amount) => {
  return `₦${amount.toLocaleString('en-NG')}`;
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getInitials = (fullName) => {
  return fullName
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const generateTransactionRef = () => {
  return `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};
