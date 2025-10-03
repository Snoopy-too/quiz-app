# Quiz App - New Features Implementation Guide

## Overview
This guide covers the implementation of 20+ new features to match Kahoot functionality.

## Prerequisites

### 1. Run Database Schema
```sql
-- Run new-features-schema.sql in Supabase SQL Editor
```

### 2. Set Up Supabase Storage Buckets

Create these buckets in Supabase Dashboard > Storage:
- `quiz-images` - For question images
- `quiz-videos` - For question videos
- `quiz-gifs` - For GIFs
- `quiz-backgrounds` - For quiz background images
- `user-avatars` - For student/teacher avatars

**Storage Policies (for each bucket):**
```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bucket-name');

-- Allow public to read
CREATE POLICY "Public can view files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'bucket-name');
```

### 3. Install Required NPM Packages
```bash
npm install papaparse  # For CSV parsing
npm install @google-cloud/storage  # For Google Sheets integration (optional)
```

## Feature Implementation Status

### ✅ Completed Utility Files
1. **mediaUpload.js** - Image/video/GIF/avatar upload functions
2. **nicknameGenerator.js** - Funny nickname generator
3. **csvImport.js** - CSV parsing for questions and users

### 🔧 Features Requiring Component Updates

#### 1. True/False Question Type
**Files to Update:**
- `src/components/quizzes/EditQuiz.jsx` - Add T/F option selector
- `src/components/quizzes/TeacherControl.jsx` - Display T/F questions
- `src/components/students/StudentQuiz.jsx` - Show T/F answers

**Implementation:**
```jsx
// In EditQuiz.jsx - Question Type Selector
<select value={questionForm.question_type} onChange={(e) => {
  const type = e.target.value;
  setQuestionForm({
    ...questionForm,
    question_type: type,
    options: type === 'true_false'
      ? [{ text: 'True', is_correct: false }, { text: 'False', is_correct: false }]
      : questionForm.options
  });
}}>
  <option value="multiple_choice">Multiple Choice</option>
  <option value="true_false">True/False</option>
</select>
```

#### 2. Media Support (Images/Videos/GIFs)
**Files to Update:**
- `src/components/quizzes/EditQuiz.jsx` - Add file upload inputs
- `src/components/quizzes/TeacherControl.jsx` - Display media
- `src/components/students/StudentQuiz.jsx` - Show media in questions

**Implementation:**
```jsx
// In EditQuiz.jsx
import { uploadImage, uploadVideo, uploadGIF } from '../../utils/mediaUpload';

const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const url = await uploadImage(file);
    setQuestionForm({ ...questionForm, image_url: url });
  } catch (error) {
    alert('Error uploading image: ' + error.message);
  }
};

// Add to form
<div>
  <label>Question Image (optional)</label>
  <input type="file" accept="image/*" onChange={handleImageUpload} />
  {questionForm.image_url && (
    <img src={questionForm.image_url} alt="Preview" className="w-32 h-32 object-cover" />
  )}
</div>
```

#### 3. Background Images for Quizzes
**Files to Update:**
- `src/components/quizzes/CreateQuiz.jsx` - Add background upload
- `src/components/quizzes/EditQuiz.jsx` - Edit background
- `src/components/quizzes/TeacherControl.jsx` - Apply background

#### 4. Team Mode
**New Components Needed:**
- `src/components/quizzes/TeamMode.jsx`
- `src/components/quizzes/TeamSetup.jsx`

**Implementation Steps:**
1. Create team setup before quiz starts
2. Allow students to join teams
3. Track team scores instead of individual
4. Display team leaderboard

#### 5. Homework/Assignment Mode
**New Components Needed:**
- `src/components/assignments/CreateAssignment.jsx`
- `src/components/assignments/AssignmentList.jsx`
- `src/components/assignments/TakeAssignment.jsx`
- `src/components/assignments/AssignmentResults.jsx`

#### 6. Streak Bonuses
**Files to Update:**
- `src/components/students/StudentQuiz.jsx` - Track streaks
- Update score calculation to include streak bonus

**Implementation:**
```jsx
// In StudentQuiz.jsx - submitAnswer function
const submitAnswer = async (optionIndex) => {
  const isCorrect = currentQuestion.options[optionIndex].is_correct;

  // Update streak
  const newStreak = isCorrect ? (currentStreak + 1) : 0;
  const streakBonus = calculateStreakBonus(newStreak);

  // Calculate points with streak bonus
  const basePoints = isCorrect ? currentQuestion.points : 0;
  const totalPoints = basePoints + streakBonus;

  // Update participant with streak
  await supabase
    .from('session_participants')
    .update({
      current_streak: newStreak,
      max_streak: Math.max(newStreak, maxStreak),
      streak_bonus_points: streakBonus,
      score: participant.score + totalPoints
    })
    .eq('id', participant.id);
};

function calculateStreakBonus(streak) {
  if (streak >= 5) return 100;
  if (streak >= 3) return 50;
  if (streak >= 2) return 25;
  return 0;
}
```

#### 7. Podium Animation
**New Component:**
- `src/components/animations/PodiumAnimation.jsx`

**Implementation:**
```jsx
// PodiumAnimation.jsx
export default function PodiumAnimation({ winners }) {
  return (
    <div className="flex items-end justify-center gap-8 h-96">
      {/* 2nd Place */}
      <div className="text-center animate-bounce-in" style={{animationDelay: '0.2s'}}>
        <div className="text-6xl mb-4">🥈</div>
        <div className="bg-gray-300 rounded-t-lg p-8" style={{height: '200px'}}>
          <p className="text-2xl font-bold">{winners[1]?.name}</p>
          <p className="text-xl text-gray-600">{winners[1]?.score} pts</p>
        </div>
      </div>

      {/* 1st Place */}
      <div className="text-center animate-bounce-in" style={{animationDelay: '0s'}}>
        <div className="text-8xl mb-4">🥇</div>
        <div className="bg-yellow-400 rounded-t-lg p-8" style={{height: '250px'}}>
          <p className="text-3xl font-bold">{winners[0]?.name}</p>
          <p className="text-2xl text-gray-700">{winners[0]?.score} pts</p>
        </div>
      </div>

      {/* 3rd Place */}
      <div className="text-center animate-bounce-in" style={{animationDelay: '0.4s'}}>
        <div className="text-6xl mb-4">🥉</div>
        <div className="bg-orange-300 rounded-t-lg p-8" style={{height: '150px'}}>
          <p className="text-2xl font-bold">{winners[2]?.name}</p>
          <p className="text-xl text-gray-600">{winners[2]?.score} pts</p>
        </div>
      </div>
    </div>
  );
}
```

#### 8. Funny Nicknames for Students
**Files to Update:**
- `src/components/dashboards/StudentDashboard.jsx` - Generate nickname on join
- `src/components/quizzes/TeacherControl.jsx` - Display nicknames

**Implementation:**
```jsx
// In StudentDashboard.jsx
import { generateNickname } from '../../utils/nicknameGenerator';

const joinQuiz = async () => {
  // ... existing code ...

  const nickname = generateNickname();

  const { data: newParticipant } = await supabase
    .from('session_participants')
    .insert([{
      session_id: sessionId,
      user_id: appState.currentUser.id,
      score: 0
    }])
    .select()
    .single();

  // Update user with nickname
  await supabase
    .from('users')
    .update({ nickname })
    .eq('id', appState.currentUser.id);
};
```

#### 9. Quiz Sharing
**New Components:**
- `src/components/quizzes/ShareQuiz.jsx`

**Implementation:**
```jsx
// ShareQuiz.jsx - Modal to share quiz
const shareQuiz = async (quizId, teacherEmail, canEdit) => {
  // Find teacher by email
  const { data: teacher } = await supabase
    .from('users')
    .select('id')
    .eq('email', teacherEmail)
    .eq('role', 'teacher')
    .single();

  if (!teacher) {
    alert('Teacher not found');
    return;
  }

  // Create share
  await supabase
    .from('quiz_shares')
    .insert([{
      quiz_id: quizId,
      shared_by: currentUser.id,
      shared_with: teacher.id,
      can_edit: canEdit
    }]);
};
```

#### 10. Duplicate/Clone Quiz
**Files to Update:**
- `src/components/teachers/ManageQuizzes.jsx` - Add duplicate button

**Implementation:**
```jsx
const duplicateQuiz = async (quizId) => {
  try {
    // Get original quiz
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    // Get questions
    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId);

    // Create new quiz
    const { data: newQuiz } = await supabase
      .from('quizzes')
      .insert([{
        ...quiz,
        id: undefined,
        title: `${quiz.title} (Copy)`,
        created_at: undefined
      }])
      .select()
      .single();

    // Copy questions
    const newQuestions = questions.map(q => ({
      ...q,
      id: undefined,
      quiz_id: newQuiz.id,
      created_at: undefined
    }));

    await supabase
      .from('questions')
      .insert(newQuestions);

    alert('Quiz duplicated successfully!');
    fetchQuizzes();
  } catch (error) {
    alert('Error duplicating quiz: ' + error.message);
  }
};
```

#### 11. Quiz Templates
**Files to Update:**
- `src/components/quizzes/CreateQuiz.jsx` - Add "Save as Template" checkbox
- Create `src/components/quizzes/TemplateLibrary.jsx`

#### 12. Randomize Questions/Answers
**Implementation in TeacherControl.jsx:**
```jsx
// Before showing questions, check randomization settings
const showQuestion = async (questionIndex) => {
  let questionsToShow = [...questions];

  // Randomize question order if enabled
  if (quiz.randomize_questions && !questionsShuffled) {
    questionsToShow = shuffleArray(questionsToShow);
    setQuestionsShuffled(true);
  }

  let question = questionsToShow[questionIndex];

  // Randomize answer order if enabled
  if (quiz.randomize_answers) {
    const shuffledOptions = shuffleArray([...question.options]);
    question = { ...question, options: shuffledOptions };
  }

  setCurrentQuestion(question);
};

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
```

#### 13. CSV Import
**Files to Update:**
- `src/components/quizzes/ImportQuestions.jsx` - New component

**Implementation:**
```jsx
import { parseCSVToQuestions } from '../../utils/csvImport';

const ImportQuestions = ({ quizId, onImport }) => {
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvText = event.target.result;
        const questions = parseCSVToQuestions(csvText);

        // Insert questions
        const { error } = await supabase
          .from('questions')
          .insert(questions.map(q => ({ ...q, quiz_id: quizId })));

        if (error) throw error;

        alert(`${questions.length} questions imported!`);
        onImport();
      } catch (error) {
        alert('Error importing: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
      <button onClick={() => generateCSVTemplate()}>
        Download Template
      </button>
    </div>
  );
};
```

#### 14. Folders/Workspaces
**New Components:**
- `src/components/folders/FolderList.jsx`
- `src/components/folders/CreateFolder.jsx`

#### 15. Student Avatars
**Files to Update:**
- `src/components/dashboards/StudentDashboard.jsx` - Avatar upload
- `src/components/teachers/ManageStudents.jsx` - Display avatars

#### 16. Bulk User Management
**Files to Update:**
- `src/components/teachers/ManageStudents.jsx` - Add bulk import

## CSS Animations

Add to your global CSS file:

```css
@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: translateY(100px);
  }
  50% {
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-bounce-in {
  animation: bounce-in 0.6s ease-out forwards;
}

@keyframes streak-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

.streak-animation {
  animation: streak-pulse 0.5s ease-in-out;
}
```

## Testing Checklist

- [ ] True/False questions work correctly
- [ ] Images upload and display in questions
- [ ] Videos play in questions
- [ ] GIFs animate in questions
- [ ] Background images show in quizzes
- [ ] Team mode creates and tracks teams
- [ ] Homework assignments can be created
- [ ] Students can complete homework
- [ ] Streak bonuses calculate correctly
- [ ] Podium shows for top 3
- [ ] Nicknames generate on quiz join
- [ ] Quizzes can be shared
- [ ] Duplicate quiz creates copy
- [ ] Templates can be saved
- [ ] Questions randomize when enabled
- [ ] CSV import works
- [ ] Folders organize quizzes
- [ ] Avatars upload and display
- [ ] Bulk user import works

## Next Steps

1. Run the database schema
2. Create storage buckets
3. Update components one by one
4. Test each feature thoroughly
5. Deploy to production

For any issues, check browser console and Supabase logs.
