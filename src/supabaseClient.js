import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://esmkltjylinzamjaoulf.supabase.co"; 
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbWtsdGp5bGluemFtamFvdWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMTMzOTAsImV4cCI6MjA3NDc4OTM5MH0.ao7bW1UDfKZed29oD1nuGKcZm30-NF8cP81-kt6xw0E";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
