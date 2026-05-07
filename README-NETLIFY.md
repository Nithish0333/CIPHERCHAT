# CipherChat - Netlify Deployment Guide

## Portfolio Demo Information

This is a portfolio demonstration version of CipherChat, a secure real-time messaging application built with React and Supabase.

### Demo Credentials
- **Username:** `Testuser1`
- **Password:** `Testuser1`

### Features Demonstrated
- Username-based authentication
- Real-time messaging
- End-to-end encryption simulation
- Modern UI with Bootstrap 5
- Responsive design
- Toast notifications
- User profiles and avatars

### Technology Stack
- **Frontend:** React 18, React Router, Bootstrap 5
- **Backend:** Supabase (Authentication & Database)
- **Real-time:** Socket.io
- **Build Tool:** Create React App
- **Deployment:** Netlify

### Environment Variables
The following environment variables are required for deployment:
```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Deployment Instructions

1. **Connect Repository to Netlify**
   - Push your code to GitHub/GitLab/Bitbucket
   - Connect the repository to Netlify

2. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `build`
   - Node version: 18

3. **Set Environment Variables**
   - Go to Site settings > Environment variables
   - Add the Supabase URL and Anon Key

4. **Deploy**
   - Netlify will automatically deploy on push
   - Or trigger manual deployment

### Database Setup
The demo user is created through the Supabase dashboard or using the provided script:
```bash
cd scripts
node create-demo-user.js
```

### Notes
- This is a demo version for portfolio purposes
- Some features may be limited in the demo environment
- The application demonstrates modern web development practices
- All sensitive data is properly secured with environment variables

### Contact
For portfolio inquiries or questions about this project, please refer to the contact information in the main portfolio.
