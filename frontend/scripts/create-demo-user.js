const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createDemoUser() {
  try {
    console.log('Creating demo user...');
    
    // Create the demo user
    const { data, error } = await supabase.auth.signUp({
      email: 'testuser1@cipherchat.demo',
      password: 'Testuser1',
      options: {
        data: {
          username: 'Testuser1',
          avatar: 'https://ui-avatars.com/api/?name=Testuser1&background=28a745&color=fff&size=80'
        }
      }
    });

    if (error) {
      console.error('Error creating demo user:', error.message);
      return;
    }

    if (data.user) {
      console.log('Demo user created successfully!');
      console.log('Username: Testuser1');
      console.log('Password: Testuser1');
      console.log('Email: testuser1@cipherchat.demo');
      
      // If the user was created but needs email verification, we'll manually verify it
      if (!data.session) {
        console.log('User created but requires email verification. Manual verification may be needed.');
      }
    } else {
      console.log('Demo user may already exist or there was an issue.');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createDemoUser();
