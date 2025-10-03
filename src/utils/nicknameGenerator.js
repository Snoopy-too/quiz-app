// Funny nickname generator for students

const adjectives = [
  'Sneaky', 'Dancing', 'Mighty', 'Clever', 'Brave', 'Silly', 'Happy', 'Crazy',
  'Smart', 'Swift', 'Funky', 'Jazzy', 'Bouncy', 'Sparkly', 'Groovy', 'Zippy',
  'Jolly', 'Wacky', 'Speedy', 'Giggly', 'Cosmic', 'Electric', 'Ninja', 'Turbo',
  'Epic', 'Super', 'Mega', 'Ultra', 'Rad', 'Cool', 'Awesome', 'Amazing'
];

const nouns = [
  'Panda', 'Pickle', 'Potato', 'Banana', 'Taco', 'Penguin', 'Burrito', 'Unicorn',
  'Avocado', 'Muffin', 'Platypus', 'Llama', 'Donut', 'Narwhal', 'Waffle', 'Dragon',
  'Ninja', 'Wizard', 'Robot', 'Pirate', 'Viking', 'Warrior', 'Champion', 'Legend',
  'Tiger', 'Eagle', 'Falcon', 'Phoenix', 'Wolf', 'Bear', 'Fox', 'Panther'
];

/**
 * Generate a random funny nickname
 */
export const generateNickname = () => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective} ${noun}`;
};

/**
 * Generate multiple unique nicknames
 */
export const generateUniqueNicknames = (count) => {
  const nicknames = new Set();
  let attempts = 0;
  const maxAttempts = count * 10;

  while (nicknames.size < count && attempts < maxAttempts) {
    nicknames.add(generateNickname());
    attempts++;
  }

  return Array.from(nicknames);
};
