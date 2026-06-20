#!/usr/bin/env python3
"""Import PA NBI 2022 bridge data into Supabase."""
import csv
import json
import http.client
import sys

SUPABASE_HOST = 'ykpugijojikyioogugsr.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrcHVnaWpvamlreWlvb2d1Z3NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NDIyMTQsImV4cCI6MjA5NzUxODIxNH0.XM_a6lNrPds4rZEZhQRRKUrasbOFP6JEY8K4T_ulzG8'
INPUT_FILE = '/tmp/PA22.txt'
BATCH_SIZE = 500


def dms_to_decimal(dms_str, is_lng=False):
    s = dms_str.strip()
    if not s or s == '0':
        return None
    target_len = 9 if is_lng else 8
    s = s.zfill(target_len)
    if int(s) == 0:
        return None
    deg_end = 3 if is_lng else 2
    deg = int(s[0:deg_end])
    mm = int(s[deg_end:deg_end+2])
    ss = int(s[deg_end+2:deg_end+4])
    hh = int(s[deg_end+4:deg_end+6]) if len(s) >= deg_end+6 else 0
    result = deg + mm / 60 + (ss + hh / 100) / 3600
    return -result if is_lng else result


def to_int(val):
    if not val:
        return None
    v = val.strip()
    if not v or not v.lstrip('-').isdigit():
        return None
    n = int(v)
    return n if n != 0 else None


def to_pos_int(val):
    n = to_int(val)
    return n if n and n > 0 else None


def to_float(val):
    if not val:
        return None
    try:
        return float(val.strip()) or None
    except (ValueError, AttributeError):
        return None


def insert_batch(records, retries=4):
    data = json.dumps(records).encode('utf-8')
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        # upsert: skip already-inserted rows so re-runs are safe
        'Prefer': 'return=minimal,resolution=merge-duplicates',
    }
    for attempt in range(retries):
        try:
            conn = http.client.HTTPSConnection(SUPABASE_HOST, timeout=60)
            conn.request('POST', '/rest/v1/bridges', data, headers)
            resp = conn.getresponse()
            body = resp.read()
            conn.close()
            if resp.status not in (200, 201):
                print(f'  ERROR {resp.status}: {body[:300]}', file=sys.stderr)
                return False
            return True
        except Exception as e:
            print(f'  Retry {attempt+1}/{retries} after error: {e}', file=sys.stderr)
            import time; time.sleep(2 ** attempt)
    return False


def main():
    records = []
    total = 0
    skipped = 0

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, quotechar="'")
        for row in reader:
            lat = dms_to_decimal(row.get('LAT_016', ''))
            lng = dms_to_decimal(row.get('LONG_017', ''), is_lng=True)

            if not lat or not lng:
                skipped += 1
                continue

            structure_number = row.get('STRUCTURE_NUMBER_008', '').strip()
            if not structure_number:
                skipped += 1
                continue

            # Condition ratings: N = not applicable → None
            def cond(key):
                v = row.get(key, '').strip()
                if not v or v == 'N' or not v.isdigit():
                    return None
                return int(v)

            record = {
                'structure_number': structure_number,
                'state_code': row.get('STATE_CODE_001', '').strip() or None,
                'county_code': row.get('COUNTY_CODE_003', '').strip() or None,
                'place_code': row.get('PLACE_CODE_004', '').strip() or None,
                'features_desc': row.get('FEATURES_DESC_006A', '').strip() or None,
                'facility_carried': row.get('FACILITY_CARRIED_007', '').strip() or None,
                'location': row.get('LOCATION_009', '').strip() or None,
                'lat': lat,
                'lng': lng,
                'year_built': to_pos_int(row.get('YEAR_BUILT_027')),
                'year_reconstructed': to_pos_int(row.get('YEAR_RECONSTRUCTED_106')),
                'adt': to_pos_int(row.get('ADT_029')),
                'deck_cond': cond('DECK_COND_058'),
                'superstructure_cond': cond('SUPERSTRUCTURE_COND_059'),
                'substructure_cond': cond('SUBSTRUCTURE_COND_060'),
                'channel_cond': cond('CHANNEL_COND_061'),
                'culvert_cond': cond('CULVERT_COND_062'),
                'overall_cond': to_int(row.get('LOWEST_RATING')),
                'sufficiency_rating': to_float(row.get('STRUCTURAL_EVAL_067')),
                'structural_deficiency': row.get('BRIDGE_CONDITION', '').strip() == 'P',
                'bridge_posting': row.get('POSTING_EVAL_070', '').strip() or None,
                'structure_length': to_float(row.get('STRUCTURE_LEN_MT_049')),
                'num_spans': to_pos_int(row.get('MAIN_UNIT_SPANS_045')),
                'num_lanes': to_pos_int(row.get('TRAFFIC_LANES_ON_028A')),
                'material_type': to_int(row.get('STRUCTURE_KIND_043A')),
                'design_type': to_int(row.get('STRUCTURE_TYPE_043B')),
            }

            records.append(record)

            if len(records) >= BATCH_SIZE:
                ok = insert_batch(records)
                total += len(records)
                print(f'  Inserted {total} / ~23202  (skipped {skipped})', flush=True)
                records = []

    if records:
        insert_batch(records)
        total += len(records)

    print(f'\nDone. Inserted {total}, skipped {skipped}.')


if __name__ == '__main__':
    main()
