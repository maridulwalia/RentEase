const profanityWords = [
  'damn', 'hell', 'stupid', 'idiot', 'moron', 'jerk', 'hate',
  // Add more words as needed - keeping it simple for demo
];

const checkProfanity = (text) => {
  if (!text) return { hasProfanity: false, cleanText: text };

  const lowerText = text.toLowerCase();
  let hasProfanity = false;
  let cleanText = text;

  profanityWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(lowerText)) {
      hasProfanity = true;
      cleanText = cleanText.replace(regex, '*'.repeat(word.length));
    }
  });

  return { hasProfanity, cleanText };
};

const moderateContent = (content) => {
  const result = checkProfanity(content);
  return {
    originalContent: content,
    moderatedContent: result.cleanText,
    hasProfanity: result.hasProfanity,
    moderationFlag: result.hasProfanity ? 'profanity' : 'clean'
  };
};

module.exports = { checkProfanity, moderateContent };