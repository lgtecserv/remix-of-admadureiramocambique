import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ckxdrraveesybpqmoqae.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNreGRycmF2ZWVzeWJwcW1vcWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQzMzU4NSwiZXhwIjoyMDk3MDA5NTg1fQ.R6QoMX1taxtk4gK1UL8V3X_r5eRJwiBzVDppqgz3Sqo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const updates = [
    // Move colliding members to temp numbers first to avoid unique constraint violations
    { id: '147c991b-8f77-4fd4-821b-760f13db702a', registration_number: 'TEMP1' }, // Inacio
    { id: '21380055-87b8-4b4f-ac86-fb25fb0081ac', registration_number: 'TEMP3' }, // Claudia
    { id: '8893001f-3c56-44cb-b19e-e3dd1c0c7397', registration_number: 'TEMP5' }, // Gonçalves
    { id: 'c1622c94-065f-489d-9a61-e1d19463db36', registration_number: 'TEMP6' }, // Noémia
  ];

  console.log("Moving colliding members to temporary numbers...");
  for (const update of updates) {
    const { error } = await supabase.from('members').update({ registration_number: update.registration_number }).eq('id', update.id);
    if (error) console.error("Error updating", update, error);
  }

  const targetUpdates = [
    { id: '9e42f332-1b32-4b5e-8a87-c0a9c7ba5a50', registration_number: '0001' }, // Jose
    { id: '46a7d35d-1a7f-4ef8-9cb8-6027ab85976e', registration_number: '0002' }, // Sueli
    { id: '0dc41585-92c4-4ca8-8104-405ab217400f', registration_number: '0003' }, // Roberto
    { id: '794a1ecf-d78b-41fe-ad3a-e6dc377e0ec8', registration_number: '0004' }, // Adriana
    { id: 'c072edc5-57d2-4195-a93e-d7ecd27c57e9', registration_number: '0005' }, // Inácio Timane
    { id: 'e8f1e441-08a0-456a-8def-6ebdbe9a36d3', registration_number: '0006' }, // Carla
  ];

  console.log("Setting target members to new numbers...");
  for (const update of targetUpdates) {
    const { error } = await supabase.from('members').update({ registration_number: update.registration_number }).eq('id', update.id);
    if (error) console.error("Error updating", update, error);
  }

  const finalUpdates = [
    { id: '147c991b-8f77-4fd4-821b-760f13db702a', registration_number: '0405' }, // Inacio
    { id: '21380055-87b8-4b4f-ac86-fb25fb0081ac', registration_number: '0409' }, // Claudia
    { id: '8893001f-3c56-44cb-b19e-e3dd1c0c7397', registration_number: '0407' }, // Gonçalves
    { id: 'c1622c94-065f-489d-9a61-e1d19463db36', registration_number: '0408' }, // Noémia
  ];

  console.log("Assigning old target numbers to displaced members...");
  for (const update of finalUpdates) {
    const { error } = await supabase.from('members').update({ registration_number: update.registration_number }).eq('id', update.id);
    if (error) console.error("Error updating", update, error);
  }

  console.log("Update completed.");
}

run();
