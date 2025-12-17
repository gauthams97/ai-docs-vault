# User Authentication Setup Guide

This guide explains how to set up user authentication and multi-user support in Supabase.

## Prerequisites

- Supabase project with Authentication enabled
- Access to Supabase SQL Editor
- Existing database schema

## Step 1: Run the Migration

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Run the user authentication migration SQL in the SQL Editor
4. Click **Run** (or press Cmd/Ctrl + Enter)
5. Wait for "Success" message

## Step 2: Verify RLS is Enabled

1. Go to **Authentication** → **Policies** in Supabase Dashboard
2. Verify that RLS is enabled on:
   - `documents` table
   - `groups` table
   - `document_groups` table

## Step 3: Configure Authentication Providers

In Supabase Dashboard → **Authentication** → **Providers**:

### Email/Password (Recommended)
1. Enable **Email** provider
2. Configure email templates (optional)
3. Set password requirements (optional)

### Other Providers (Optional)
- **Google OAuth**: Enable if you want Google sign-in
- **GitHub OAuth**: Enable if you want GitHub sign-in
- **Magic Link**: Enable for passwordless authentication

## Step 4: Update Environment Variables

### Backend (`apps/api/.env.local`)
No changes needed - backend uses service role key which bypasses RLS.

### Frontend (`apps/web/.env.local`)
Add Supabase anon key:
```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Where to find these:**
- Go to Supabase Dashboard → **Settings** → **API**
- Copy **Project URL** → `VITE_SUPABASE_URL`
- Copy **anon/public** key → `VITE_SUPABASE_ANON_KEY`

## Step 5: Migrate Existing Data (If Applicable)

If you have existing documents/groups without `user_id`:

1. Create a user account in Supabase Dashboard → **Authentication** → **Users**
2. Copy the user's UUID
3. Run this SQL in SQL Editor:

```sql
-- Replace 'your-user-id-here' with the actual user UUID
UPDATE documents 
SET user_id = 'your-user-id-here' 
WHERE user_id IS NULL;

UPDATE groups 
SET user_id = 'your-user-id-here' 
WHERE user_id IS NULL;
```

4. After migration, add NOT NULL constraints:

```sql
ALTER TABLE documents ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE groups ALTER COLUMN user_id SET NOT NULL;
```

## Step 6: Storage Bucket Policies (Optional but Recommended)

For user-specific file storage, update storage policies:

1. Go to **Storage** → **Policies** → `documents` bucket
2. Add policies:

```sql
-- Users can upload files to their own folder
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own files
CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Note**: This requires updating storage paths to include user ID (e.g., `{user_id}/{filename}`).

## Verification

After setup, verify:

1. ✅ RLS policies are active (check Authentication → Policies)
2. ✅ Indexes are created (check Database → Indexes)
3. ✅ `user_id` columns exist (check Database → Tables)
4. ✅ Can create test user (Authentication → Users → Add user)

## Security Notes

- **RLS is critical**: Without RLS, users can access each other's data
- **Service role key**: Only use in backend, never expose to frontend
- **Anon key**: Safe to expose in frontend, but RLS must be enabled
- **Storage policies**: Important for file-level security

## Troubleshooting

**Error: "relation auth.users does not exist"**
- Ensure Authentication is enabled in Supabase
- Check that you're using the correct Supabase project

**Error: "permission denied for table documents"**
- Verify RLS policies are created correctly
- Check that user is authenticated (auth.uid() is not null)

**Users can see each other's data**
- Verify RLS is enabled: `ALTER TABLE documents ENABLE ROW LEVEL SECURITY;`
- Check policies are using `auth.uid() = user_id`
- Ensure frontend is using anon key (not service role key)

## Next Steps

After running the migration:
1. Frontend will need Supabase Auth client setup
2. Add login/signup UI components
3. Update API routes to accept user context
4. Update storage paths to include user ID (optional)

See implementation guide for frontend/backend changes.

