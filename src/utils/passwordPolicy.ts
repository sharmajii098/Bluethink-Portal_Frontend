export const passwordHelp = "Use at least 12 characters including a letter and number, within 72 UTF-8 bytes.";
export function validPassword(password: string): boolean {
  return password.length >= 12 && new TextEncoder().encode(password).length <= 72
    && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}
