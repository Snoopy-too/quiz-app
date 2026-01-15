// Supabase Edge Function: send-assignment-notification
// Sends email notifications to students when they are assigned a quiz

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const APP_URL = Deno.env.get("APP_URL") || "http://localhost:5173";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "QuizMaster <noreply@yourdomain.com>";

interface AssignmentNotificationPayload {
  assignment_id: string;
  student_email: string;
  student_name: string;
  quiz_title: string;
  teacher_name: string;
  deadline: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: AssignmentNotificationPayload = await req.json();
    const { assignment_id, student_email, student_name, quiz_title, teacher_name, deadline } = payload;

    // Validate required fields
    if (!assignment_id || !student_email || !quiz_title || !deadline) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format deadline for display
    const deadlineDate = new Date(deadline);
    const formattedDeadline = deadlineDate.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

    // Calculate time remaining
    const now = new Date();
    const timeRemaining = deadlineDate.getTime() - now.getTime();
    const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    let timeRemainingText = "";
    if (daysRemaining > 0) {
      timeRemainingText = `${daysRemaining} day${daysRemaining > 1 ? "s" : ""} and ${hoursRemaining} hour${hoursRemaining !== 1 ? "s" : ""}`;
    } else if (hoursRemaining > 0) {
      timeRemainingText = `${hoursRemaining} hour${hoursRemaining !== 1 ? "s" : ""}`;
    } else {
      timeRemainingText = "Less than 1 hour";
    }

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #ea580c, #f97316); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Quiz Assignment</h1>
    </div>

    <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
        Hello <strong>${student_name || "Student"}</strong>,
      </p>

      <p style="font-size: 16px; color: #374151; margin-bottom: 24px;">
        Your teacher <strong>${teacher_name || "your teacher"}</strong> has assigned you a quiz to complete.
      </p>

      <div style="background: #fff7ed; border: 2px solid #fed7aa; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
        <h2 style="color: #c2410c; margin: 0 0 12px 0; font-size: 22px;">${quiz_title}</h2>
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="color: #9a3412; font-weight: 600;">Deadline:</span>
          <span style="color: #c2410c; margin-left: 8px;">${formattedDeadline}</span>
        </div>
        <div style="background: #ea580c; color: white; display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 14px; font-weight: 600;">
          ${timeRemainingText} remaining
        </div>
      </div>

      <p style="font-size: 16px; color: #374151; margin-bottom: 24px;">
        Please log in to your student dashboard and complete this quiz before the deadline.
        Quizzes cannot be submitted after the deadline has passed.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}" style="display: inline-block; background: #ea580c; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Go to Dashboard
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

      <p style="font-size: 14px; color: #6b7280; text-align: center;">
        This is an automated message from QuizMaster. Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email using Resend
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: "Email service not configured", success: false }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: student_email,
        subject: `Quiz Assignment: ${quiz_title}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update assignment record to mark email as sent
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      await supabase
        .from("quiz_assignments")
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString()
        })
        .eq("id", assignment_id);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully", data: emailResult }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
