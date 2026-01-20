-- Emergency Cleanup: Delete the specific orphaned user from auth.users
-- This user was deleted from public.users but remains in auth.users
DELETE FROM auth.users WHERE email = 'toratotra0917@gmail.com';

-- Optional: Verify the function is installed properly
-- If you haven't run the previous script (add-delete-student-rpc.sql), please run it now.
