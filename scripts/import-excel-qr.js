const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = envContent.split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim();
  return acc;
}, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse Excel
const excelPath = 'C:\\Users\\User\\Downloads\\JP QR Points (1).xlsx';
if (!fs.existsSync(excelPath)) {
  console.error('Excel file not found at:', excelPath);
  process.exit(1);
}

const wb = xlsx.readFile(excelPath);
const sheet = wb.Sheets['Sheet1'] || wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

let currentFloor = '';
const qrPoints = [];

for (const row of rows) {
  if (!row || row.length === 0) continue;
  const col0 = row[0] !== undefined && row[0] !== null ? String(row[0]).trim() : '';
  const col1 = row[1] !== undefined && row[1] !== null ? String(row[1]).trim() : '';

  if (col0.toLowerCase() === 'floor' && col1.toLowerCase().includes('location')) {
    continue;
  }

  if (col0) {
    currentFloor = col0;
  }

  if (col1) {
    const formatted = currentFloor ? `${currentFloor} - ${col1}` : col1;
    qrPoints.push({
      floor: currentFloor,
      location: col1,
      formattedName: formatted,
    });
  }
}

console.log(`Found ${qrPoints.length} QR points in Excel:`);
qrPoints.forEach((p, idx) => console.log(`${idx + 1}. ${p.formattedName}`));

async function run() {
  console.log('\n--- Step 1: Deleting existing QR codes from Supabase ---');
  // Fetch existing count
  const { data: existing, error: fetchErr } = await supabase.from('qr_codes').select('id, name');
  if (fetchErr) {
    console.error('Error fetching existing QR codes:', fetchErr);
    process.exit(1);
  }
  console.log(`Currently found ${existing?.length || 0} QR codes in Supabase.`);

  if (existing && existing.length > 0) {
    const ids = existing.map((q) => q.id);
    const { error: deleteErr } = await supabase.from('qr_codes').delete().in('id', ids);
    if (deleteErr) {
      console.error('Error deleting existing QR codes:', deleteErr);
      process.exit(1);
    }
    console.log(`Successfully removed ${ids.length} existing QR codes.`);
  }

  console.log('\n--- Step 2: Preparing and inserting 53 QR points ---');
  const baseTime = Date.now() - qrPoints.length * 1000;
  const adminUuid = '00000000-0000-0000-0000-000000000001';

  const rowsToInsert = qrPoints.map((item, index) => {
    const sanitizeLoc = item.formattedName.replace(/[^a-zA-Z0-9]/g, '');
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const token = `MUVEQR-${sanitizeLoc}-${randomSuffix}`;
    const timestamp = new Date(baseTime + index * 1000).toISOString();

    return {
      id: crypto.randomUUID(),
      name: item.formattedName,
      token: token,
      location_name: item.formattedName,
      description: `${item.floor} - ${item.location}`,
      status: 'active',
      latitude: null,
      longitude: null,
      geofence_radius: null,
      created_by: adminUuid,
      created_at: timestamp,
      updated_at: timestamp,
    };
  });

  const { data: inserted, error: insertErr } = await supabase
    .from('qr_codes')
    .insert(rowsToInsert)
    .select();

  if (insertErr) {
    console.error('Error inserting new QR codes:', insertErr);
    process.exit(1);
  }

  console.log(`Successfully inserted ${inserted.length} new QR codes into Supabase!`);

  // Insert Audit Log
  try {
    await supabase.from('audit_logs').insert({
      admin_id: adminUuid,
      admin_name: 'System Admin',
      action: 'batch_qr_import',
      target_type: 'qr_codes',
      target_name: 'Excel Import',
      details: { count: inserted.length, file: 'JP QR Points (1).xlsx' },
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString(),
    });
    console.log('Audit log created successfully.');
  } catch (auditErr) {
    console.warn('Audit log notice:', auditErr);
  }

  console.log('\n--- Step 3: Verifying final state in database ---');
  const { data: verifyData, error: verifyErr } = await supabase
    .from('qr_codes')
    .select('id, name, location_name, token')
    .order('created_at', { ascending: true });

  if (verifyErr) {
    console.error('Verification error:', verifyErr);
  } else {
    console.log(`Verified ${verifyData.length} QR codes in Supabase database.`);
    console.log('Sample first 5:');
    verifyData.slice(0, 5).forEach((q, i) => console.log(` ${i + 1}: ${q.location_name} (token: ${q.token})`));
    console.log('Sample last 5:');
    verifyData.slice(-5).forEach((q, i) => console.log(` ${verifyData.length - 4 + i}: ${q.location_name} (token: ${q.token})`));
  }
}

run();
