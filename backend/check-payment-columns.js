// Quick script to check if payment columns exist
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumns() {
  console.log('Checking payment columns in playgrounds table...\n');
  
  const { data, error } = await supabase
    .from('playgrounds')
    .select('id, name, is_paid, payment_type, payment_value, max_time_per_task, tasks_for_goal')
    .limit(1);
  
  if (error) {
    console.error('❌ Error:', error.message);
    console.log('\n⚠️  Payment columns may not exist yet.');
    console.log('Run: npm run migrate');
    return;
  }
  
  console.log('✅ Payment columns exist!');
  console.log('Sample data:', data);
  
  // Check if qa_earnings table exists
  const { data: earnings, error: earningsError } = await supabase
    .from('qa_earnings')
    .select('id')
    .limit(1);
  
  if (earningsError) {
    console.error('\n❌ qa_earnings table error:', earningsError.message);
  } else {
    console.log('\n✅ qa_earnings table exists!');
  }
}

checkColumns();
