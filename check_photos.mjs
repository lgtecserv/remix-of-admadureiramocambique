import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import sizeOf from 'image-size';
import https from 'https';
import http from 'http';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPhoto(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        try {
          const dimensions = sizeOf(buffer);
          resolve(dimensions);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', (err) => {
      resolve(null);
    });
  });
}

async function main() {
  console.log("Fetching members with photos...");
  const { data: members, error } = await supabase
    .from('members')
    .select('id, full_name, photo_url')
    .not('photo_url', 'is', null);

  if (error) {
    console.error("Error fetching members:", error);
    return;
  }

  console.log(`Found ${members.length} members with photos. Checking proportions...`);
  console.log("Ideal proportion is 0.75 (Width/Height for 3:4 box)");

  let badPhotosCount = 0;

  for (const member of members) {
    if (!member.photo_url) continue;
    const dimensions = await checkPhoto(member.photo_url);
    if (dimensions) {
      const ratio = dimensions.width / dimensions.height;
      // 3:4 is 0.75. If it's wider than 0.85 or taller than 0.65, it's significantly off
      if (ratio > 0.85 || ratio < 0.65) {
        console.log(`[DEFEITO?] ${member.full_name} - Ratio: ${ratio.toFixed(2)} (${dimensions.width}x${dimensions.height})`);
        badPhotosCount++;
      }
    }
  }

  console.log(`\nFinished checking. Found ${badPhotosCount} photos that might need adjustment (aspect ratio off 3:4).`);
}

main();
