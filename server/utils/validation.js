export const isValidEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    // RFC 5322 compliant regex (simplified for common use cases)
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return emailRegex.test(email);
};

export const isValidPassword = (password) => {
    if (!password || typeof password !== 'string') return false;
    return password.length >= 8;
};
