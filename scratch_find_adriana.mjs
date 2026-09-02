import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ckxdrraveesybpqmoqae.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNreGRycmF2ZWVzeWJwcW1vcWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQzMzU4NSwiZXhwIjoyMDk3MDA5NTg1fQ.R6QoMX1taxtk4gK1UL8V3X_r5eRJwiBzVDppqgz3Sqo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('members')
    .select('id, full_name, registration_number')
    .ilike('full_name', '%Adriana%');

  console.log("=== Found Adrianas ===");
  console.log(data);
}

run();
