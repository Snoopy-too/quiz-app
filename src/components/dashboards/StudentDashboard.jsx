import { useState } from "react";
import { supabase } from "../../supabaseClient";
import VerticalNav from "../layout/VerticalNav";

export default function StudentDashboard({ appState, setAppState, setView, error, setError }) {
  const [joinPin, setJoinPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [teamName, setTeamName] = useState("");

  const joinQuiz = async () => {
    if (!joinPin || joinPin.length !== 6) {
      setError("Please enter a valid 6-digit PIN");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Find session by PIN
      console.log('Looking for quiz with PIN:', joinPin);
      console.log('Current user:', appState.currentUser?.id, appState.currentUser?.email);

      // Use SELECT * to avoid PostgreSQL aggregate function conflict with 'mode' column
      const { data: sessions, error: sessionError } = await supabase
        .from("quiz_sessions")
        .select("*")
        .eq("pin", joinPin);

      console.log('Query result:', { sessions, sessionError });

      if (sessionError) {
        console.error('Session query error details:', {
          message: sessionError.message,
          code: sessionError.code,
          details: sessionError.details,
          hint: sessionError.hint
        });

        // Check if it's an RLS policy error
        if (sessionError.code === '42501' || sessionError.message?.includes('policy')) {
          setError("Permission denied. Please ensure you're logged in and approved by your teacher.");
          setLoading(false);
          return;
        }

        throw sessionError;
      }

      if (!sessions || sessions.length === 0) {
        console.warn('No quiz session found with PIN:', joinPin);
        setError("Invalid PIN - Quiz not found. Please check the PIN and try again.");
        setLoading(false);
        return;
      }

      // Take the first session if multiple exist (shouldn't happen, but handle it)
      const session = sessions[0];
      console.log('Found session:', session);

      if (session.status === "completed") {
        setError("This quiz has already ended");
        setLoading(false);
        return;
      }

      // If team mode, show team form
      if (session.mode === "team") {
        setSessionData(session);
        setShowTeamForm(true);
        setLoading(false);
      } else {
        // Classic mode - create participant record and join directly
        console.log('Creating participant record for user:', appState.currentUser?.id);

        const { data: participant, error: participantError } = await supabase
          .from("session_participants")
          .insert({
            session_id: session.id,
            user_id: appState.currentUser.id,
            score: 0
          })
          .select()
          .single();

        if (participantError) {
          // Check if error is due to duplicate entry (already joined)
          if (participantError.code === '23505') {
            console.log('Student already joined this session, proceeding...');
          } else {
            console.error('Failed to create participant:', participantError);
            throw new Error(`Failed to join quiz: ${participantError.message}`);
          }
        } else {
          console.log('Participant created successfully:', participant);
        }

        // Navigate to quiz
        setView("student-quiz", session.id);
      }
    } catch (err) {
      setError("Error joining quiz: " + err.message);
      setLoading(false);
    }
  };

  const joinAsTeam = async () => {
    if (!playerName.trim()) {
      setError("Please enter your name");
      return;
    }

    if (!teamName.trim()) {
      setError("Please enter a team name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create participant with team info
      const { data: participant, error: participantError } = await supabase
        .from("session_participants")
        .insert({
          session_id: sessionData.id,
          user_id: appState.user.id,
          player_name: playerName,
          team_name: teamName,
          score: 0
        })
        .select()
        .single();

      if (participantError) throw participantError;

      // Navigate to student quiz with session ID and participant ID
      setView("student-quiz", sessionData.id, participant.id);
    } catch (err) {
      setError("Error joining team: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Vertical Navigation */}
      <VerticalNav currentView="student-dashboard" setView={setView} appState={appState} />

      {/* Main Content */}
      <div className="flex-1 ml-64 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        {!showTeamForm ? (
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <h1 className="text-3xl font-bold text-center mb-6">Join Quiz</h1>
            <p className="text-center text-gray-600 mb-6">Enter the PIN from your teacher</p>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            <input
              type="text"
              placeholder="Enter PIN"
              value={joinPin}
              onChange={(e) => setJoinPin(e.target.value)}
              className="w-full p-4 border-2 rounded-lg text-center text-2xl mb-4"
              maxLength="6"
            />
            <button
              onClick={joinQuiz}
              disabled={loading}
              className="w-full bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 text-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Joining..." : "Join Quiz"}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">👥</div>
              <h1 className="text-3xl font-bold mb-2">Team Mode</h1>
              <p className="text-gray-600">Enter your details to join a team</p>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full p-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  placeholder="Enter team name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full p-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Join an existing team or create a new one
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={joinAsTeam}
                disabled={loading}
                className="w-full bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 text-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Joining..." : "Join Team"}
              </button>

              <button
                onClick={() => {
                  setShowTeamForm(false);
                  setPlayerName("");
                  setTeamName("");
                  setError(null);
                }}
                className="w-full bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
