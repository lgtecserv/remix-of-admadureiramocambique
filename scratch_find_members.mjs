import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ckxdrraveesybpqmoqae.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNreGRycmF2ZWVzeWJwcW1vcWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQzMzU4NSwiZXhwIjoyMDk3MDA5NTg1fQ.R6QoMX1taxtk4gK1UL8V3X_r5eRJwiBzVDppqgz3Sqo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const targetNames = [
    'Jose Carlos Botaro',
    'Sueli de Araujo Lima Botaro',
    'Roberto Bueno',
    'Adriana Roberta Rocha Bueno',
    'Inácio Estêvão Timane',
    'Carla Marisa Martins Macatamela Timane'
  ];

  const { data: targetMembers, error: err1 } = await supabase
    .from('members')
    .select('id, full_name, registration_number')
    .in('full_name', targetNames);

  console.log("=== Target Members (to be updated) ===");
  console.log(targetMembers);

  const { data: collidingMembers, error: err2 } = await supabase
    .from('members')
    .select('id, full_name, registration_number')
    .in('registration_number', ['0001', '0002', '0003', '0004', '0005', '0006', '00006']);

  console.log("\n=== Colliding Members (currently holding the target numbers) ===");
  console.log(collidingMembers);
}

run();
