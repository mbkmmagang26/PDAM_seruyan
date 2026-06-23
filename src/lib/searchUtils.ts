/**
 * Menghasilkan token pencarian (search tokens) untuk Firestore array-contains query.
 * Contoh: "Andri Hermawan" -> ["a", "an", "and", "andr", "andri", "h", "he", "her", "herm", "herma", "hermaw", "hermawa", "hermawan", "andri h", "andri he", ...]
 */
export const generateSearchTokens = (name: string): string[] => {
  if (!name) return [];
  const lowercaseName = name.trim().toLowerCase();
  const words = lowercaseName.split(/\s+/);
  const tokens = new Set<string>();

  // 1. Tambahkan prefiks dari setiap kata (contoh: "her" untuk "hermawan")
  words.forEach(word => {
    for (let i = 1; i <= word.length; i++) {
      tokens.add(word.substring(0, i));
    }
  });

  // 2. Tambahkan prefiks dari nama lengkap (contoh: "andri h" untuk "andri hermawan")
  for (let i = 1; i <= lowercaseName.length; i++) {
    tokens.add(lowercaseName.substring(0, i));
  }

  return Array.from(tokens);
};
