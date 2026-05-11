// Profanity filter utility
const bannedWords = [
  'porn', 'badword2', 'badword3', 'badword4', 'badword5',
  'inappropriate', 'offensive', 'explicit', 'curse', 'damn',
  'hell', 'crap', 'ass', 'bitch', 'bastard', 'shit', 'fuck',
  'piss', 'dick', 'pussy', 'cock', 'whore', 'slut', 'asshole',
  'dumbass', 'jackass', 'shitty', 'crappy', 'goddamn',
  // Add more as needed
];

export function containsProfanity(text) {
  if (!text || typeof text !== 'string') return false;
  const lowerText = text.toLowerCase().trim();
  return bannedWords.some(word => {
    // Match word anywhere (substring) for stricter filtering.
    // If it's a short word like 'ass', we require boundries to avoid 'glass'.
    // If it's a longer explicit word like 'fuck', we don't care, just match it anywhere.
    if (word === 'ass' || word === 'dick' || word === 'cock') {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(lowerText);
    } else {
      const regex = new RegExp(word, 'i');
      return regex.test(lowerText);
    }
  });
}

export function isProfane(text) {
  return containsProfanity(text);
}
