import { User } from '../types';

// This is a mock database of users. In a real application, this would be
// replaced with API calls to a backend authentication service.
// The default free user is now created dynamically in UserContext, so we can keep this empty.
const mockUsers: User[] = [
  
];

/**
 * Finds a user in the mock database by their email address.
 * @param email The email address to search for.
 * @returns The User object if found, otherwise undefined.
 */
export const findUserByEmail = (email: string): User | undefined => {
  const foundUser = mockUsers.find(user => user.email.toLowerCase() === email.toLowerCase());
  // Return a copy to prevent mutation of the original mock data
  return foundUser ? { ...foundUser } : undefined;
};

// --- PRO Access Codes ---
// For this mock setup, we use a simple set of plaintext codes for validation.
// In a real production environment, you would validate this against a secure backend.
const PRO_ACCESS_CODES = new Set([
  'unlock-pro-2024',
  'gemini-ultra-key',
  'flash-creative-access'
]);


/**
 * Verifies if a given access code is a valid PRO code by checking it
 * against a predefined list of valid codes.
 * @param accessCode The plaintext access code entered by the user.
 * @returns A promise that resolves to true if the code is valid, otherwise false.
 */
export async function verifyProAccessCode(accessCode: string): Promise<boolean> {
  if (!accessCode) return false;
  // Normalize the input to be case-insensitive and trim whitespace.
  const normalizedCode = accessCode.trim().toLowerCase();
  if (!normalizedCode) return false;

  return PRO_ACCESS_CODES.has(normalizedCode);
}