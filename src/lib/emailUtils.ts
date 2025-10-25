/**
 * Masks an email address for privacy
 * Example: john.doe@example.com -> j***e@example.com
 */
export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return email;
  
  const [localPart, domain] = email.split('@');
  
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  
  const firstChar = localPart[0];
  const lastChar = localPart[localPart.length - 1];
  
  return `${firstChar}***${lastChar}@${domain}`;
};
