# Supabase Setup Guide for CipherChat

## 🚀 Quick Setup Steps

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with GitHub, Google, or email
4. Verify your email address

### 2. Create New Project
1. Click **"New Project"** in your dashboard
2. Enter project name: `cipherchat`
3. Choose a strong database password
4. Select a region closest to your users
5. Click **"Create new project"**
6. Wait for project to be created (2-3 minutes)

### 3. Get Project Credentials
Once project is ready:
1. Go to **Project Settings** (gear icon)
2. Click **"API"** in the sidebar
3. Copy these values:
   - **Project URL** (looks like `https://xxx.supabase.co`)
   - **anon public** key
   - **service_role** key (keep secret!)

### 4. Set Up Database Tables

#### Method 1: SQL Editor (Recommended)
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and paste the contents of `database/supabase-setup.sql`
3. Click **"Run"** to execute all SQL scripts
4. Wait for tables to be created

#### Method 2: Table Builder
1. Go to **Table Editor** in your dashboard
2. Create these tables manually:
   - `users` (extends auth.users)
   - `friends`
   - `friend_requests`
   - `chats`
   - `messages`
   - `status_updates`

### 5. Configure Environment Variables

#### Backend (.env)
```env
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:3000
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

#### Frontend (.env)
```env
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 6. Update Package Dependencies

#### Backend
```bash
npm install @supabase/supabase-js
```

#### Frontend
```bash
npm install @supabase/supabase-js
```

### 7. Start Your Application

#### Backend
```bash
cd backend
npm start
```

#### Frontend
```bash
cd frontend
npm start
```

## 📋 Database Schema

### Users Table
- `id` - UUID (Primary Key, references auth.users)
- `username` - Text (Unique)
- `email` - Text (Unique)
- `avatar` - Text (Default avatar URL)
- `online_status` - Text ('online', 'away', 'offline')
- `last_seen` - Timestamp
- `contacts` - JSONB (Contact list)
- `settings` - JSONB (User preferences)
- `encryption_key` - Text (For end-to-end encryption)

### Friends Table
- `id` - UUID (Primary Key)
- `user_id` - UUID (Foreign key to users)
- `friend_id` - UUID (Foreign key to users)
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Friend Requests Table
- `id` - UUID (Primary Key)
- `sender_id` - UUID (Foreign key to users)
- `receiver_id` - UUID (Foreign key to users)
- `status` - Text ('pending', 'accepted', 'rejected')
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Chats Table
- `id` - UUID (Primary Key)
- `name` - Text (Chat name/group name)
- `type` - Text ('private', 'group')
- `participants` - JSONB (Array of user IDs)
- `created_by` - UUID (Foreign key to users)
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Messages Table
- `id` - UUID (Primary Key)
- `chat_id` - UUID (Foreign key to chats)
- `sender_id` - UUID (Foreign key to users)
- `content` - Text (Message content)
- `type` - Text ('text', 'image', 'file', 'voice', 'video')
- `reply_to` - UUID (Foreign key to messages)
- `reactions` - JSONB (Array of reactions)
- `edited_at` - Timestamp
- `deleted_at` - Timestamp
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Status Updates Table
- `id` - UUID (Primary Key)
- `user_id` - UUID (Foreign key to users)
- `text` - Text (Status message)
- `image_url` - Text (Status image URL)
- `expires_at` - Timestamp (When status expires)
- `is_active` - Boolean (Status visibility)
- `views` - JSONB (Array of viewer IDs)
- `created_at` - Timestamp
- `updated_at` - Timestamp

## 🔧 Configuration Files

### Backend Config (config/supabase.js)
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = supabase;
```

### Frontend Config (src/config/supabase.js)
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export default supabase;
```

## 🚀 Testing Your Setup

### 1. Test Authentication
- Register a new user
- Login with existing user
- Check user profile updates
- Test logout functionality

### 2. Test Database Operations
- Send friend requests
- Accept/reject requests
- Create chats
- Send messages

### 3. Test Real-time Features
- Open two browser windows
- Send messages between them
- Check for real-time updates

## 🛠️ Troubleshooting

### Common Issues

#### 1. Connection Errors
- Check SUPABASE_URL and SUPABASE_ANON_KEY in .env files
- Verify project is active in Supabase dashboard
- Check network connectivity

#### 2. Authentication Errors
- Ensure Row Level Security policies are applied
- Check user metadata is properly set
- Verify JWT secret is configured

#### 3. Database Errors
- Run SQL setup script completely
- Check table names match exactly
- Verify foreign key relationships

#### 4. CORS Issues
- Ensure CLIENT_URL is set correctly
- Check CORS settings in Supabase dashboard
- Verify frontend URL matches

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Supabase Database Guide](https://supabase.com/docs/guides/database)
- [Row Level Security](https://supabase.com/docs/guides/auth#row-level-security)

## 🎯 Next Steps

1. **Test all features** with the new Supabase setup
2. **Migrate existing data** if coming from MongoDB
3. **Set up real-time subscriptions** for live updates
4. **Configure file storage** for media uploads
5. **Deploy to production** when ready

## 📞 Support

If you encounter issues:
1. Check Supabase dashboard logs
2. Verify environment variables
3. Test with the SQL scripts provided
4. Ensure all dependencies are installed

---

**Your CipherChat application is now ready to use Supabase as the backend database!** 🎉
