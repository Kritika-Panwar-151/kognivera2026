import os
import json
import sqlite3
import urllib.request
import urllib.error

# 1. Read .env file manually
env_path = os.path.join(os.path.dirname(__file__), '../.env')
if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                parts = line.split('=', 1)
                if len(parts) == 2:
                    k, v = parts[0].strip(), parts[1].strip().strip("\"'")
                    os.environ[k] = v

supabase_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')

if not supabase_url or not supabase_key or 'placeholder' in supabase_url:
    print("❌ Error: Valid VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY) must be set in .env")
    exit(1)

db_path = os.path.join(os.path.dirname(__file__), '../data-model/seed/PS-08.db')
if not os.path.exists(db_path):
    print(f"❌ Error: Database file not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

tables = [
    'categories', 'currencies', 'fx_rates', 'languages', 'receipts',
    'countries', 'cities', 'users', 'trips', 'budgets',
    'expenses', 'itineraries', 'itinerary_items', 'trip_members', 'expense_splits'
]

def to_int_bool(val):
    if val is None:
        return 0
    return 1 if val in (1, '1', 'true', 'TRUE', True) else 0

def transform_row(table_name, row_dict):
    d = dict(row_dict)
    
    # Process booleans and JSONs according to database schema
    if table_name == 'languages':
        d['rtl'] = to_int_bool(d.get('rtl'))
        d['tts_supported'] = to_int_bool(d.get('tts_supported'))
    elif table_name == 'receipts':
        if isinstance(d.get('line_items_truth'), str):
            try:
                d['line_items_truth'] = json.loads(d['line_items_truth'])
            except:
                d['line_items_truth'] = []
    elif table_name == 'trips':
        d['is_group_trip'] = to_int_bool(d.get('is_group_trip'))
    elif table_name == 'expenses':
        d['is_settled'] = to_int_bool(d.get('is_settled'))
    elif table_name == 'itineraries':
        d['is_active'] = to_int_bool(d.get('is_active'))
        if isinstance(d.get('optimizer_weights'), str) and d['optimizer_weights']:
            try:
                d['optimizer_weights'] = json.loads(d['optimizer_weights'])
            except:
                d['optimizer_weights'] = None
    elif table_name == 'itinerary_items':
        d['locked'] = to_int_bool(d.get('locked'))
        
    return d

def batch_upsert(table_name, rows):
    url = f"{supabase_url.rstrip('/')}/rest/v1/{table_name}"
    headers = {
        'apikey': supabase_key,
        'Authorization': f"Bearer {supabase_key}",
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    }
    
    data_bytes = json.dumps(rows).encode('utf-8')
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method='POST')
    
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status in (200, 201, 204)
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        print(f"❌ HTTP Error for table '{table_name}': {e.code} {e.reason} - {err_msg}")
        return False
    except Exception as e:
        print(f"❌ Request Error for table '{table_name}': {e}")
        return False

print("🚀 Starting Supabase Database Seeding from PS-08.db...\n")

total_imported = 0
summary = []

for table in tables:
    cur.execute(f"SELECT * FROM {table}")
    rows = [transform_row(table, row) for row in cur.fetchall()]
    
    print(f"📦 Upserting {len(rows)} rows into table '{table}'...")
    
    batch_size = 500
    success_count = 0
    for i in range(0, len(rows), batch_size):
        chunk = rows[i:i + batch_size]
        if batch_upsert(table, chunk):
            success_count += len(chunk)
        else:
            print(f"Failed to upsert batch for table {table}")
            exit(1)
            
    print(f"✅ Successfully imported {success_count} rows into '{table}'.\n")
    summary.append((table, success_count))
    total_imported += success_count

print("----------------------------------------------------")
print("🎉 MIGRATION COMPLETE! SUMMARY:")
for t, c in summary:
    print(f"  • {t}: {c} rows")
print(f"\nTotal Rows Imported into Supabase: {total_imported}")
