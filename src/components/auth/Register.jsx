import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { generateTeacherCode } from "../../utils/teacherCode";

export default function Register({ setView, setAppState, error, setError, success, setSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    studentId: "",
    teacherCode: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Prevent self-registration as superadmin
    if (formData.role === "superadmin") {
      setError("Superadmin accounts must be created by the system administrator.");
      return;
    }

    try {
      // STEP 1: Check if email already exists in users table
      console.log("=== CHECKING IF EMAIL ALREADY EXISTS ===");
      const emailToCheck = formData.email.trim().toLowerCase();
      console.log("Checking email:", emailToCheck);

      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id, email, role, verified")
        .eq("email", emailToCheck)
        .maybeSingle();

      console.log("Existing user check - data:", existingUser);
      console.log("Existing user check - error:", checkError);

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is fine
        console.error("Error checking existing user:", checkError);
        setError("Unable to verify email availability. Please try again.");
        return;
      }

      if (existingUser) {
        console.error("Email already registered:", existingUser);
        setError("This email is already registered. Please login instead or use a different email.");
        return;
      }

      console.log("Email is available for registration");

      let teacherId = null;
      let teacherCodeToSave = null;

      // For students: validate teacher code
      if (formData.role === "student") {
        if (!formData.teacherCode.trim()) {
          setError("Teacher code is required for students.");
          return;
        }

        const cleanCode = formData.teacherCode.replace(/-/g, '').toUpperCase();
        console.log("=== TEACHER CODE VALIDATION ===");
        console.log("Original code entered:", formData.teacherCode);
        console.log("Cleaned code for lookup:", cleanCode);

        // Look up teacher by code
        const { data: teacher, error: teacherError } = await supabase
          .from("users")
          .select("id, name, teacher_code")
          .eq("teacher_code", cleanCode)
          .eq("role", "teacher")
          .maybeSingle();

        console.log("Database query result - teacher:", teacher);
        console.log("Database query result - error:", teacherError);

        if (teacherError) {
          console.error("Teacher lookup error:", teacherError);
          setError(`Database error: ${teacherError.message}`);
          return;
        }

        if (!teacher) {
          console.error("No teacher found with code:", cleanCode);

          // Debug: Let's see what codes exist in the database
          const { data: allTeachers, error: debugError } = await supabase
            .from("users")
            .select("id, name, teacher_code, role")
            .eq("role", "teacher");

          console.log("All teachers in database:", allTeachers);
          console.log("Debug query error:", debugError);

          setError("Invalid teacher code. Please check the code and try again.");
          return;
        }

        console.log("Teacher found! ID:", teacher.id, "Name:", teacher.name);
        teacherId = teacher.id;
      }

      // For teachers: generate unique teacher code
      if (formData.role === "teacher") {
        let codeExists = true;
        while (codeExists) {
          teacherCodeToSave = generateTeacherCode();
          const { data: existing } = await supabase
            .from("users")
            .select("id")
            .eq("teacher_code", teacherCodeToSave)
            .maybeSingle();
          codeExists = !!existing;
        }
      }

      // 1. Create auth user with Supabase Auth
      console.log("=== CREATING AUTH USER ===");
      console.log("Email:", formData.email.trim().toLowerCase());
      console.log("Role:", formData.role);
      console.log("Teacher ID to assign:", teacherId);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role,
          }
        }
      });

      console.log("Auth signup result - data:", authData);
      console.log("Auth signup result - error:", authError);

      if (authError) {
        console.error("Supabase auth error:", authError);

        // Handle specific error cases
        if (authError.message?.includes("already registered") || authError.message?.includes("already exists")) {
          setError("This email is already registered. Please login instead.");
        } else if (authError.message?.includes("Invalid email")) {
          setError("Please enter a valid email address.");
        } else if (authError.message?.includes("Password")) {
          setError("Password must be at least 6 characters long.");
        } else {
          setError(authError.message || "Registration failed. Try again.");
        }
        return;
      }

      if (!authData.user) {
        console.error("No user returned from auth signup");
        setError("Registration failed. Please try again.");
        return;
      }

      console.log("Auth user created successfully! ID:", authData.user.id);

      // Check if this is a new signup or existing user
      const isNewUser = authData.user.identities && authData.user.identities.length > 0;
      console.log("Is new user?", isNewUser);

      // 2. Create profile in users table
      console.log("=== CREATING USER PROFILE ===");
      const profileData = {
        id: authData.user.id, // Use auth user ID
        name: formData.name,
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        student_id: formData.role === "student" ? formData.studentId : null,
        teacher_id: teacherId, // Set teacher_id for students
        teacher_code: teacherCodeToSave, // Set teacher_code for teachers
        verified: false, // Email verification required
        approved: formData.role === "student" ? true : false, // Teachers need approval
      };
      console.log("Profile data to insert:", profileData);

      const { error: profileError } = await supabase.from("users").insert([profileData]);

      console.log("Profile creation result - error:", profileError);

      if (profileError) {
        console.error("Profile creation error:", profileError);

        // Handle specific profile creation errors
        if (profileError.code === '23505' || profileError.message?.includes("duplicate key")) {
          console.error("Duplicate key error - email already exists in users table");
          setError("This email is already registered. Please login instead or contact support if you believe this is an error.");
        } else if (profileError.message?.includes("violates foreign key constraint")) {
          console.error("Foreign key constraint error:", profileError.message);
          setError("Invalid teacher reference. Please try again or contact support.");
        } else {
          setError(`Registration failed: ${profileError.message || "Unknown error occurred"}`);
        }

        // Note: Auth user was created but profile failed. User should contact support or try logging in.
        console.error("⚠️ IMPORTANT: Auth user created but profile failed. User ID:", authData.user.id);
        return;
      }

      console.log("✅ Profile created successfully!");

      // 3. Show success message
      if (formData.role === "student") {
        setSuccess("Registration successful! Please check your email to verify your account.");
      } else {
        setSuccess("Registration successful! A teacher must approve your account before you can login.");
      }

      // Redirect to verify email page
      setTimeout(() => {
        setView("verify");
      }, 2000);

    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Something went wrong. Try again.");
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");

    try {
      // Dynamically use current site URL (works for both localhost and Netlify)
      const redirectUrl = `${window.location.origin}/`;

      console.log('Initiating Google OAuth with redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('OAuth initiation error:', error);
        setError(`Google sign-in failed: ${error.message}`);
      }

      // On success, browser redirects to Google
    } catch (err) {
      console.error('OAuth exception:', err);
      setError("Failed to initiate Google sign-in. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-green-400 to-blue-500">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Register for QuizMaster</h2>
        {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-2 mb-4 rounded">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2 mb-4 border rounded-lg"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 mb-4 border rounded-lg"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 mb-4 border rounded-lg"
            required
          />

          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-4 py-2 mb-4 border rounded-lg"
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>

          {formData.role === "student" && (
            <>
              <input
                type="text"
                name="studentId"
                placeholder="Student ID"
                value={formData.studentId}
                onChange={handleChange}
                className="w-full px-4 py-2 mb-4 border rounded-lg"
                required
              />
              <input
                type="text"
                name="teacherCode"
                placeholder="Teacher Code (e.g., ABCD-1234)"
                value={formData.teacherCode}
                onChange={handleChange}
                className="w-full px-4 py-2 mb-4 border rounded-lg uppercase"
                maxLength="9"
                required
              />
              <p className="text-xs text-gray-600 -mt-3 mb-4 px-2">
                Enter the invitation code provided by your teacher
              </p>
            </>
          )}

          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
          >
            Register
          </button>
        </form>

        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            type="button"
            className="mt-4 w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => setView("login")}
            className="text-green-700 hover:underline"
          >
            Already have an account? Login
          </button>
        </div>
      </div>
    </div>
  );
}
