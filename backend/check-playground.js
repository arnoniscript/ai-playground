const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPlayground() {
  const { data, error } = await supabase
    .from('playgrounds')
    .select('id, name, is_active')
    .eq('id', '9bfe73a5-9c8b-4334-8353-2959697c75ab')
    .single();
  
  console.log('Playground data:', data);
  console.log('Error:', error);
}

checkPlayground();
