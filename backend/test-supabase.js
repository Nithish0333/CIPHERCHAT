const supabase = require('./config/supabase');

async function testSupabase() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
    } else {
      console.log('✅ Supabase connection successful!');
      console.log('📊 Sample data:', data);
    }
    
    // Test auth configuration
    console.log('🔑 Supabase URL:', process.env.SUPABASE_URL);
    console.log('🔑 Anon Key configured:', process.env.SUPABASE_ANON_KEY ? 'Yes' : 'No');
    
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}

testSupabase();
