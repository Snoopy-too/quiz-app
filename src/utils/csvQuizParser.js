/**
 * Parses a Kahoot-format CSV file into quiz data
 *
 * Expected CSV format:
 * Row 1: Quiz Title
 * Row 2: (empty)
 * Row 3: Header - Question Number,Question,Option 1,Option 2,Option 3,Option 4,Correct Answer(s)
 * Row 4+: Multiple Choice - 1,"Question text","Opt1","Opt2","Opt3","Opt4","2"
 *         True/False     - 1,"Question text","True","False","1"
 */

/**
 * Derive a quiz title from a file name
 * e.g. "quiz_sample.csv" → "Quiz Sample"
 * @param {string} fileName
 * @returns {string}
 */
function titleFromFileName(fileName) {
  return fileName
    .replace(/\.csv$/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

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
 * Split raw CSV text into logical records while preserving newlines inside quoted fields.
 * @param {string} csvContent
 * @returns {string[]}
 */
function splitCSVRecords(csvContent) {
  const text = csvContent.replace(/^\uFEFF/, '');
  const records = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += char;
      }
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') {
        i++;
      }
      if (current.trim() !== '') {
        records.push(current);
      }
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim() !== '') {
    records.push(current);
  }

  return records;
}

/**
 * Parse CSV content into quiz data
 * @param {string} csvContent - Raw CSV file content
 * @param {string} [fileName] - Original file name (used for title when CSV has no title row)
 * @returns {{ title: string, questions: Array }} Parsed quiz data
 */
export function parseKahootCSV(csvContent, fileName) {
  const lines = splitCSVRecords(csvContent);

  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header and one question');
  }

  // Check if line 0 is a header row (no separate title row)
  const firstLineLower = lines[0].toLowerCase();
  const firstLineIsHeader = firstLineLower.includes('question number') ||
    (firstLineLower.includes('question') && firstLineLower.includes('answer'));

  let title = '';
  let headerIndex = 0;

  if (firstLineIsHeader) {
    // No title row — header is line 0, derive title from filename
    headerIndex = 0;
    title = fileName ? titleFromFileName(fileName) : '';
  } else {
    // First line is the title
    title = lines[0].replace(/^["']|["']$/g, '').trim();
    // Find the header row starting from line 1
    headerIndex = 1;
    for (let i = 1; i < Math.min(lines.length, 100); i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('question number') ||
        (line.includes('question') && line.includes('answer'))) {
        headerIndex = i;
        break;
      }
    }
  }

  const headerFields = parseCSVLine(lines[headerIndex]).map(h => h.toLowerCase());
  const headerHasTimeCol = headerFields.some(h => h.includes('time'));

  const questions = [];

  // Parse question rows (everything after header)
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const fields = parseCSVLine(line);
    if (fields.every(f => !f)) continue;

    // Expect at least: Question Number, Question, 2 Options, Correct Answer
    if (fields.length < 5) {
      console.warn(`Skipping row ${i + 1}: insufficient fields`);
      continue;
    }

    const qText = fields[1] || '';
    const opt1 = fields[2] || '';
    const opt2 = fields[3] || '';
    let opt3 = '';
    let opt4 = '';
    let rawCorrect = '';
    let timeLimit = 30;
    let isTrueFalse = false;

    if (fields.length >= 8 || (headerHasTimeCol && fields.length >= 7)) {
      opt3 = fields[4] || '';
      opt4 = fields[5] || '';
      const parsedTime = parseInt(fields[6], 10);
      if (!isNaN(parsedTime) && parsedTime >= 5 && parsedTime <= 300) {
        timeLimit = parsedTime;
      }
      rawCorrect = fields[7] || '';
      isTrueFalse = !opt3.trim() && !opt4.trim();
    } else if (fields.length === 7) {
      opt3 = fields[4] || '';
      opt4 = fields[5] || '';
      rawCorrect = fields[6] || '';
      isTrueFalse = !opt3.trim() && !opt4.trim();
    } else if (fields.length === 6) {
      isTrueFalse = true;
      const fourthVal = (fields[4] || '').trim();
      const parsedTime = parseInt(fourthVal, 10);
      if (headerHasTimeCol || (fields[5] && /^\d+$/.test(fourthVal) && parsedTime >= 5)) {
        if (!isNaN(parsedTime) && parsedTime >= 5 && parsedTime <= 300) {
          timeLimit = parsedTime;
        }
        rawCorrect = fields[5] || '';
      } else {
        rawCorrect = fields[4] || '';
      }
    } else {
      isTrueFalse = true;
      rawCorrect = fields[4] || '';
    }

    const optionTexts = isTrueFalse ? [opt1, opt2] : [opt1, opt2, opt3, opt4];
    const numOptions = optionTexts.length;
    const correctIndices = rawCorrect
      .split(/[,;]/)
      .map(s => parseInt(s.trim(), 10) - 1)
      .filter(n => !isNaN(n) && n >= 0 && n < numOptions);

    const options = optionTexts.map((text, index) => ({
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
      question_text: qText,
      question_type: isTrueFalse ? 'true_false' : 'multiple_choice',
      time_limit: timeLimit,
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
