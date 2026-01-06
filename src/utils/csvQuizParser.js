/**
 * Parses a Kahoot-format CSV file into quiz data
 *
 * Expected CSV format:
 * Row 1: Quiz Title
 * Row 2: (empty)
 * Row 3: Header - Question Number,Question,Option 1,Option 2,Option 3,Option 4,Correct Answer(s)
 * Row 4+: Questions - 1,"Question text","Opt1","Opt2","Opt3","Opt4","2"
 */

/**
 * Parse a CSV line handling quoted fields with embedded commas
 * @param {string} line - CSV line to parse
 * @returns {string[]} Array of field values
 */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Push the last field
  fields.push(current.trim());

  return fields;
}

/**
 * Generate a temporary ID for questions
 * @returns {string} Temporary ID
 */
function generateTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Parse CSV content into quiz data
 * @param {string} csvContent - Raw CSV file content
 * @returns {{ title: string, questions: Array }} Parsed quiz data
 */
export function parseKahootCSV(csvContent) {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');

  if (lines.length < 4) {
    throw new Error('CSV file must have at least a title, header, and one question');
  }

  // Extract title from first line
  const title = lines[0].replace(/^["']|["']$/g, '').trim();

  // Skip the header row (line index 1, which is the 3rd line in original with empty line)
  // Find the header row by looking for "Question Number" or similar
  let headerIndex = 1;
  for (let i = 1; i < Math.min(lines.length, 5); i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('question number') || line.includes('question,')) {
      headerIndex = i;
      break;
    }
  }

  const questions = [];

  // Parse question rows (everything after header)
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const fields = parseCSVLine(line);

    // Expect at least: Question Number, Question, 4 Options, Correct Answer
    if (fields.length < 7) {
      console.warn(`Skipping row ${i + 1}: insufficient fields`);
      continue;
    }

    const [, questionText, opt1, opt2, opt3, opt4, correctAnswer] = fields;

    // Parse correct answer (1-based index, could be multiple like "1,3")
    const correctIndices = correctAnswer
      .split(/[,;]/)
      .map(s => parseInt(s.trim(), 10) - 1) // Convert to 0-based
      .filter(n => !isNaN(n) && n >= 0 && n < 4);

    const options = [opt1, opt2, opt3, opt4].map((text, index) => ({
      text: text || '',
      is_correct: correctIndices.includes(index),
      image_url: ''
    }));

    // Validate that at least one correct answer exists
    if (!options.some(opt => opt.is_correct)) {
      console.warn(`Row ${i + 1}: No valid correct answer, defaulting to first option`);
      options[0].is_correct = true;
    }

    questions.push({
      tempId: generateTempId(),
      question_text: questionText || '',
      question_type: 'multiple_choice',
      time_limit: 30,
      points: 100,
      image_url: '',
      video_url: '',
      gif_url: '',
      options
    });
  }

  if (questions.length === 0) {
    throw new Error('No valid questions found in CSV file');
  }

  return { title, questions };
}
