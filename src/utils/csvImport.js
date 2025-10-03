/**
 * Parse CSV file to quiz questions
 * Expected CSV format:
 * question_text,question_type,option1,option2,option3,option4,correct_answer,time_limit,points
 */
export const parseCSVToQuestions = (csvText) => {
  const lines = csvText.split('\n').filter(line => line.trim());
  const questions = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (doesn't handle quotes with commas inside)
    const cols = line.split(',').map(col => col.trim());

    if (cols.length < 3) continue;

    const questionType = cols[1]?.toLowerCase() || 'multiple_choice';
    let options = [];

    if (questionType === 'true_false') {
      options = [
        { text: 'True', is_correct: cols[2]?.toLowerCase() === 'true' },
        { text: 'False', is_correct: cols[2]?.toLowerCase() === 'false' }
      ];
    } else {
      // Multiple choice
      const correctAnswer = parseInt(cols[6]) || 1;
      options = [
        { text: cols[2] || '', is_correct: correctAnswer === 1 },
        { text: cols[3] || '', is_correct: correctAnswer === 2 },
        { text: cols[4] || '', is_correct: correctAnswer === 3 },
        { text: cols[5] || '', is_correct: correctAnswer === 4 }
      ].filter(opt => opt.text); // Remove empty options
    }

    questions.push({
      question_text: cols[0] || '',
      question_type: questionType,
      options,
      time_limit: parseInt(cols[7]) || 30,
      points: parseInt(cols[8]) || 100,
      order_index: i - 1
    });
  }

  return questions;
};

/**
 * Generate CSV template
 */
export const generateCSVTemplate = () => {
  const template = `question_text,question_type,option1,option2,option3,option4,correct_answer,time_limit,points
What is 2+2?,multiple_choice,3,4,5,6,2,30,100
Is the sky blue?,true_false,true,,,,,20,50
Capital of France?,multiple_choice,London,Paris,Berlin,Madrid,2,25,100`;

  const blob = new Blob([template], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'quiz_template.csv';
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Parse users CSV for bulk import
 * Expected format: name,email,role,student_id
 */
export const parseUsersCSV = (csvText) => {
  const lines = csvText.split('\n').filter(line => line.trim());
  const users = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(',').map(col => col.trim());

    if (cols.length < 2) continue;

    users.push({
      name: cols[0] || '',
      email: cols[1] || '',
      role: cols[2]?.toLowerCase() || 'student',
      student_id: cols[3] || null
    });
  }

  return users;
};
