export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          xp_reward: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          xp_reward?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      assignment_answers: {
        Row: {
          answered_at: string | null
          assignment_id: string
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string
          selected_option_index: number | null
          time_taken: number | null
        }
        Insert: {
          answered_at?: string | null
          assignment_id: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id: string
          selected_option_index?: number | null
          time_taken?: number | null
        }
        Update: {
          answered_at?: string | null
          assignment_id?: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string
          selected_option_index?: number | null
          time_taken?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_answers_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "quiz_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          attempt_number: number | null
          completed_at: string | null
          created_at: string | null
          id: string
          score: number | null
          student_id: string
        }
        Insert: {
          assignment_id: string
          attempt_number?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          score?: number | null
          student_id: string
        }
        Update: {
          assignment_id?: string
          attempt_number?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          score?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          allow_multiple_attempts: boolean | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_published: boolean | null
          quiz_id: string
          show_correct_answers: boolean | null
          teacher_id: string
          title: string
        }
        Insert: {
          allow_multiple_attempts?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_published?: boolean | null
          quiz_id: string
          show_correct_answers?: boolean | null
          teacher_id: string
          title: string
        }
        Update: {
          allow_multiple_attempts?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_published?: boolean | null
          quiz_id?: string
          show_correct_answers?: boolean | null
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      folder_items: {
        Row: {
          created_at: string | null
          folder_id: string
          id: string
          quiz_id: string
        }
        Insert: {
          created_at?: string | null
          folder_id: string
          id?: string
          quiz_id: string
        }
        Update: {
          created_at?: string | null
          folder_id?: string
          id?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folder_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folder_items_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          parent_folder_id: string | null
          teacher_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          parent_folder_id?: string | null
          teacher_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          parent_folder_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      funny_nicknames: {
        Row: {
          adjective: string
          id: number
          noun: string
        }
        Insert: {
          adjective: string
          id?: number
          noun: string
        }
        Update: {
          adjective?: string
          id?: number
          noun?: string
        }
        Relationships: []
      }
      participants: {
        Row: {
          created_at: string | null
          id: string
          score: number | null
          session_id: string | null
          team: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          score?: number | null
          session_id?: string | null
          team?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          score?: number | null
          session_id?: string | null
          team?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string | null
          gif_url: string | null
          id: string
          image_url: string | null
          options: Json | null
          order_index: number | null
          points: number | null
          question_text: string
          question_type: string | null
          quiz_id: string
          time_limit: number | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          gif_url?: string | null
          id?: string
          image_url?: string | null
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question_text: string
          question_type?: string | null
          quiz_id: string
          time_limit?: number | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          gif_url?: string | null
          id?: string
          image_url?: string | null
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question_text?: string
          question_type?: string | null
          quiz_id?: string
          time_limit?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          answered_at: string | null
          id: string
          is_correct: boolean | null
          participant_id: string
          points_earned: number | null
          question_id: string
          selected_option_index: number | null
          session_id: string
          time_taken: number | null
        }
        Insert: {
          answered_at?: string | null
          id?: string
          is_correct?: boolean | null
          participant_id: string
          points_earned?: number | null
          question_id: string
          selected_option_index?: number | null
          session_id: string
          time_taken?: number | null
        }
        Update: {
          answered_at?: string | null
          id?: string
          is_correct?: boolean | null
          participant_id?: string
          points_earned?: number | null
          question_id?: string
          selected_option_index?: number | null
          session_id?: string
          time_taken?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "session_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_assignments: {
        Row: {
          assigned_at: string | null
          completed_at: string | null
          correct_answers: number | null
          current_question_index: number | null
          deadline: string
          email_sent: boolean | null
          email_sent_at: string | null
          id: string
          question_order: string[] | null
          quiz_id: string
          score: number | null
          started_at: string | null
          status: string | null
          student_id: string
          teacher_id: string
          time_taken: number | null
          total_questions: number | null
        }
        Insert: {
          assigned_at?: string | null
          completed_at?: string | null
          correct_answers?: number | null
          current_question_index?: number | null
          deadline: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          question_order?: string[] | null
          quiz_id: string
          score?: number | null
          started_at?: string | null
          status?: string | null
          student_id: string
          teacher_id: string
          time_taken?: number | null
          total_questions?: number | null
        }
        Update: {
          assigned_at?: string | null
          completed_at?: string | null
          correct_answers?: number | null
          current_question_index?: number | null
          deadline?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          question_order?: string[] | null
          quiz_id?: string
          score?: number | null
          started_at?: string | null
          status?: string | null
          student_id?: string
          teacher_id?: string
          time_taken?: number | null
          total_questions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_assignments_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_folders: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string
          icon: string | null
          id: string
          name: string
          order_index: number | null
          parent_folder_id: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by: string
          icon?: string | null
          id?: string
          name: string
          order_index?: number | null
          parent_folder_id?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string
          icon?: string | null
          id?: string
          name?: string
          order_index?: number | null
          parent_folder_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "folder_tree_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "quiz_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_results: {
        Row: {
          answers: Json | null
          completed: boolean | null
          created_at: string | null
          id: string
          quiz_id: string | null
          score: number | null
          total_questions: number | null
          user_id: string | null
        }
        Insert: {
          answers?: Json | null
          completed?: boolean | null
          created_at?: string | null
          id?: string
          quiz_id?: string | null
          score?: number | null
          total_questions?: number | null
          user_id?: string | null
        }
        Update: {
          answers?: Json | null
          completed?: boolean | null
          created_at?: string | null
          id?: string
          quiz_id?: string | null
          score?: number | null
          total_questions?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          allow_shared_device: boolean | null
          bomb_exploded: boolean | null
          bomb_penalty_info: Json | null
          bomb_time_remaining: number | null
          bomb_total_time: number | null
          created_at: string | null
          current_question_index: number | null
          game_mode: string | null
          host_id: string
          id: string
          mode: string | null
          pin: string
          question_configurations: Json | null
          question_order: string[] | null
          quiz_id: string
          randomize_answers: boolean | null
          status: string
          team_scoring_mode: string | null
          team_size: number | null
          updated_at: string | null
        }
        Insert: {
          allow_shared_device?: boolean | null
          bomb_exploded?: boolean | null
          bomb_penalty_info?: Json | null
          bomb_time_remaining?: number | null
          bomb_total_time?: number | null
          created_at?: string | null
          current_question_index?: number | null
          game_mode?: string | null
          host_id: string
          id?: string
          mode?: string | null
          pin: string
          question_configurations?: Json | null
          question_order?: string[] | null
          quiz_id: string
          randomize_answers?: boolean | null
          status?: string
          team_scoring_mode?: string | null
          team_size?: number | null
          updated_at?: string | null
        }
        Update: {
          allow_shared_device?: boolean | null
          bomb_exploded?: boolean | null
          bomb_penalty_info?: Json | null
          bomb_time_remaining?: number | null
          bomb_total_time?: number | null
          created_at?: string | null
          current_question_index?: number | null
          game_mode?: string | null
          host_id?: string
          id?: string
          mode?: string | null
          pin?: string
          question_configurations?: Json | null
          question_order?: string[] | null
          quiz_id?: string
          randomize_answers?: boolean | null
          status?: string
          team_scoring_mode?: string | null
          team_size?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_shares: {
        Row: {
          can_edit: boolean | null
          created_at: string | null
          id: string
          quiz_id: string
          shared_by: string
          shared_with: string
        }
        Insert: {
          can_edit?: boolean | null
          created_at?: string | null
          id?: string
          quiz_id: string
          shared_by: string
          shared_with: string
        }
        Update: {
          can_edit?: boolean | null
          created_at?: string | null
          id?: string
          quiz_id?: string
          shared_by?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_shares_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_shares_shared_with_fkey"
            columns: ["shared_with"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          background_image_url: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          folder_id: string | null
          id: string
          imported_at: string | null
          is_course_material: boolean | null
          is_global: boolean | null
          is_public: boolean | null
          is_survey: boolean | null
          is_template: boolean | null
          randomize_answers: boolean | null
          randomize_questions: boolean | null
          source_quiz_id: string | null
          theme: string | null
          theme_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          background_image_url?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          folder_id?: string | null
          id?: string
          imported_at?: string | null
          is_course_material?: boolean | null
          is_global?: boolean | null
          is_public?: boolean | null
          is_survey?: boolean | null
          is_template?: boolean | null
          randomize_answers?: boolean | null
          randomize_questions?: boolean | null
          source_quiz_id?: string | null
          theme?: string | null
          theme_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          background_image_url?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          folder_id?: string | null
          id?: string
          imported_at?: string | null
          is_course_material?: boolean | null
          is_global?: boolean | null
          is_public?: boolean | null
          is_survey?: boolean | null
          is_template?: boolean | null
          randomize_answers?: boolean | null
          randomize_questions?: boolean | null
          source_quiz_id?: string | null
          theme?: string | null
          theme_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folder_tree_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "quiz_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_source_quiz_id_fkey"
            columns: ["source_quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      session_participants: {
        Row: {
          current_streak: number | null
          id: string
          is_team_entry: boolean | null
          joined_at: string | null
          max_streak: number | null
          player_name: string | null
          score: number | null
          session_id: string
          streak_bonus_points: number | null
          team_id: string | null
          team_name: string | null
          user_id: string
        }
        Insert: {
          current_streak?: number | null
          id?: string
          is_team_entry?: boolean | null
          joined_at?: string | null
          max_streak?: number | null
          player_name?: string | null
          score?: number | null
          session_id: string
          streak_bonus_points?: number | null
          team_id?: string | null
          team_name?: string | null
          user_id: string
        }
        Update: {
          current_streak?: number | null
          id?: string
          is_team_entry?: boolean | null
          joined_at?: string | null
          max_streak?: number | null
          player_name?: string | null
          score?: number | null
          session_id?: string
          streak_bonus_points?: number | null
          team_id?: string | null
          team_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          current_question: number | null
          id: string
          is_team_mode: boolean | null
          pin: string
          quiz_id: string | null
          started: boolean | null
          teacher_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_question?: number | null
          id?: string
          is_team_mode?: boolean | null
          pin: string
          quiz_id?: string | null
          started?: boolean | null
          teacher_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_question?: number | null
          id?: string
          is_team_mode?: boolean | null
          pin?: string
          quiz_id?: string | null
          started?: boolean | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          joined_at: string | null
          participant_id: string | null
          student_id: string | null
          team_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          participant_id?: string | null
          student_id?: string | null
          team_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          participant_id?: string | null
          student_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "session_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          color: string | null
          created_at: string | null
          creator_id: string | null
          id: string
          is_shared_device: boolean | null
          name: string
          score: number | null
          session_id: string | null
          teacher_id: string | null
          team_code: string | null
          team_name: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          creator_id?: string | null
          id?: string
          is_shared_device?: boolean | null
          name: string
          score?: number | null
          session_id?: string | null
          teacher_id?: string | null
          team_code?: string | null
          team_name?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          creator_id?: string | null
          id?: string
          is_shared_device?: boolean | null
          name?: string
          score?: number | null
          session_id?: string | null
          teacher_id?: string | null
          team_code?: string | null
          team_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      themes: {
        Row: {
          background_image_url: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_default: boolean | null
          name: string
          primary_color: string
          secondary_color: string
          text_color: string | null
        }
        Insert: {
          background_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          primary_color: string
          secondary_color: string
          text_color?: string | null
        }
        Update: {
          background_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          primary_color?: string
          secondary_color?: string
          text_color?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          approved: boolean | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          id: string
          level: number | null
          name: string | null
          nickname: string | null
          password: string | null
          role: string | null
          school_id: string | null
          student_id: string | null
          teacher_code: string | null
          teacher_id: string | null
          teacher_invite_code: string | null
          total_xp: number | null
          verified: boolean | null
        }
        Insert: {
          approved?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          level?: number | null
          name?: string | null
          nickname?: string | null
          password?: string | null
          role?: string | null
          school_id?: string | null
          student_id?: string | null
          teacher_code?: string | null
          teacher_id?: string | null
          teacher_invite_code?: string | null
          total_xp?: number | null
          verified?: boolean | null
        }
        Update: {
          approved?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          level?: number | null
          name?: string | null
          nickname?: string | null
          password?: string | null
          role?: string | null
          school_id?: string | null
          student_id?: string | null
          teacher_code?: string | null
          teacher_id?: string | null
          teacher_invite_code?: string | null
          total_xp?: number | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "users_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      folder_tree_with_counts: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          icon: string | null
          id: string | null
          name: string | null
          order_index: number | null
          parent_folder_id: string | null
          quiz_count: number | null
          subfolder_count: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "folder_tree_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "quiz_folders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_streak_bonus: { Args: { streak: number }; Returns: number }
      check_expired_assignments: { Args: never; Returns: undefined }
      delete_student_account: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      generate_teacher_code: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_pending_assignment_count: {
        Args: { p_student_id: string }
        Returns: number
      }
      increment_participant_score: {
        Args: { p_delta: number; p_participant_id: string }
        Returns: number
      }
      is_superadmin: { Args: never; Returns: boolean }
      update_student_account: {
        Args: {
          new_name: string
          new_password?: string
          new_student_id: string
          target_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
