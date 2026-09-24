import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '../frontend/node_modules/@supabase/supabase-js/dist/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env file manually
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...vals] = trimmed.split('=');
      if (key && vals.length > 0) {
        const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
        process.env[key.trim()] = val;
      }
    }
  });
}

// Read Environment Variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
  console.error('❌ Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY) must be properly set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Robust CSV Parser handling quoted fields and line breaks
function parseCSV(content) {
  const lines = [];
  let currentField = '';
  let inQuotes = false;
  let currentLine = [];

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentLine.push(currentField);
      if (currentLine.some(f => f.length > 0)) {
        lines.push(currentLine);
      }
      currentLine = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentLine.length > 0) {
    currentLine.push(currentField);
    lines.push(currentLine);
  }

  if (lines.length === 0) return [];
  const headers = lines[0].map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const obj = {};
    headers.forEach((h, idx) => {
      let val = line[idx] !== undefined ? line[idx].trim() : null;
      if (val === '' || val === 'NULL' || val === 'null') {
        val = null;
      }
      obj[h] = val;
    });
    return obj;
  });
}

// Transform row values according to table type rules
function transformRow(tableName, row) {
  const transformed = { ...row };

  // Helper for booleans
  const toBool = (val) => {
    if (val === null || val === undefined) return false;
    return val === '1' || val === 'true' || val === 'TRUE' || val === true;
  };

  // Helper for numbers
  const toNum = (val) => (val !== null && val !== undefined && val !== '') ? Number(val) : null;

  switch (tableName) {
    case 'languages':
      transformed.rtl = toBool(row.rtl);
      transformed.tts_supported = toBool(row.tts_supported);
      break;
    case 'currencies':
      transformed.minor_unit_exponent = toNum(row.minor_unit_exponent);
      break;
    case 'fx_rates':
      transformed.rate = toNum(row.rate);
      break;
    case 'receipts':
      transformed.total_amount_truth = toNum(row.total_amount_truth);
      if (typeof row.line_items_truth === 'string') {
        try {
          transformed.line_items_truth = JSON.parse(row.line_items_truth);
        } catch (e) {
          transformed.line_items_truth = [];
        }
      }
      break;
    case 'cities':
      transformed.lat = toNum(row.lat);
      transformed.lng = toNum(row.lng);
      transformed.population = toNum(row.population);
      break;
    case 'trips':
      transformed.party_size = toNum(row.party_size);
      transformed.adults = toNum(row.adults);
      transformed.children = toNum(row.children);
      transformed.is_group_trip = toBool(row.is_group_trip);
      break;
    case 'budgets':
      transformed.total_amount = toNum(row.total_amount);
      transformed.accommodation_cap = toNum(row.accommodation_cap);
      transformed.transport_cap = toNum(row.transport_cap);
      transformed.food_cap = toNum(row.food_cap);
      transformed.activities_cap = toNum(row.activities_cap);
      transformed.misc_cap = toNum(row.misc_cap);
      transformed.alert_threshold_pct = toNum(row.alert_threshold_pct);
      break;
    case 'expenses':
      transformed.amount = toNum(row.amount);
      transformed.home_amount = toNum(row.home_amount);
      transformed.is_settled = toBool(row.is_settled);
      break;
    case 'itineraries':
      transformed.version = toNum(row.version);
      transformed.is_active = toBool(row.is_active);
      transformed.total_cost = toNum(row.total_cost);
      transformed.total_duration_minutes = toNum(row.total_duration_minutes);
      transformed.total_carbon_kg = toNum(row.total_carbon_kg);
      if (typeof row.optimizer_weights === 'string' && row.optimizer_weights) {
        try {
          transformed.optimizer_weights = JSON.parse(row.optimizer_weights);
        } catch (e) {
          transformed.optimizer_weights = null;
        }
      }
      break;
    case 'itinerary_items':
      transformed.day_index = toNum(row.day_index);
      transformed.sort_order = toNum(row.sort_order);
      transformed.cost = toNum(row.cost);
      transformed.carbon_kg = toNum(row.carbon_kg);
      transformed.duration_minutes = toNum(row.duration_minutes);
      transformed.locked = toBool(row.locked);
      break;
    case 'trip_members':
      transformed.share_weight = toNum(row.share_weight);
      break;
    case 'expense_splits':
      transformed.share_value = toNum(row.share_value);
      transformed.amount = toNum(row.amount);
      break;
  }

  return transformed;
}

// 15 Canonical Tables in strict dependency order
const tables = [
  { file: '01_categories.csv', table: 'categories' },
  { file: '02_currencies.csv', table: 'currencies' },
  { file: '03_fx_rates.csv', table: 'fx_rates' },
  { file: '04_languages.csv', table: 'languages' },
  { file: '05_receipts.csv', table: 'receipts' },
  { file: '06_countries.csv', table: 'countries' },
  { file: '07_cities.csv', table: 'cities' },
  { file: '08_users.csv', table: 'users' },
  { file: '09_trips.csv', table: 'trips' },
  { file: '10_budgets.csv', table: 'budgets' },
  { file: '11_expenses.csv', table: 'expenses' },
  { file: '12_itineraries.csv', table: 'itineraries' },
  { file: '13_itinerary_items.csv', table: 'itinerary_items' },
  { file: '14_trip_members.csv', table: 'trip_members' },
  { file: '15_expense_splits.csv', table: 'expense_splits' }
];

async function runMigration() {
  console.log('🚀 Starting Supabase Migration for 15 Canonical PS-08 Tables...\n');
  const csvDir = path.join(__dirname, '../data-model/seed/csv');

  const summary = [];

  for (const { file, table } of tables) {
    const filePath = path.join(csvDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Warning: CSV file not found: ${file}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const rawRows = parseCSV(content);
    const transformedRows = rawRows.map(row => transformRow(table, row));

    console.log(`📦 Upserting ${transformedRows.length} rows into table '${table}'...`);

    const BATCH_SIZE = 500;
    let insertedCount = 0;

    for (let i = 0; i < transformedRows.length; i += BATCH_SIZE) {
      const chunk = transformedRows.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase.from(table).upsert(chunk, { ignoreDuplicates: false });

      if (error) {
        console.error(`❌ Error upserting into '${table}' (batch ${i}):`, error.message);
        throw error;
      }
      insertedCount += chunk.length;
    }

    console.log(`✅ Successfully imported ${insertedCount} rows into '${table}'.\n`);
    summary.push({ table, count: insertedCount });
  }

  console.log('----------------------------------------------------');
  console.log('🎉 MIGRATION COMPLETE! SUMMARY:');
  console.table(summary);
  const totalRows = summary.reduce((acc, curr) => acc + curr.count, 0);
  console.log(`Total Rows Imported: ${totalRows}`);
}

runMigration().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
