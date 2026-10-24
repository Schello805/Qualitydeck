#!/usr/bin/env python3
import zipfile
import xml.etree.ElementTree as ET
import re
import sqlite3
import json
import uuid
from datetime import datetime

xlsx_path = '/Users/michael/.gemini/antigravity/brain/73137519-c73d-4d06-a540-b0eecca8b514/.user_uploaded/media_1792775218828_e9ceda38.xlsx'

# 19 departments exactly matching the Excel columns (Cols 3 to 21)
DEPARTMENTS_19 = [
    ('Plant Management', 'Geschäftsführung / Werksleitung', 'management', 1),
    ('QM', 'Qualitätsmanagement', 'management', 2),
    ('QS', 'Qualitätssicherung', 'core', 3),
    ('LSS (Lean Management)', 'Lean Six Sigma & KVP', 'support', 4),
    ('IE-PDM', 'Industrial Engineering - Product Data Mgmt', 'core', 5),
    ('IE-NPI/Prod.Mgmt.', 'New Product Introduction / Prod. Mgmt', 'core', 6),
    ('Manufacturing Engineering', 'Fertigungstechnik & Industrial Engineering', 'core', 7),
    ('PM', 'Projekt- & Produktmanagement', 'core', 8),
    ('Planung', 'Produktionsplanung & Steuerung', 'core', 9),
    ('HR', 'Personalabteilung & Human Resources', 'support', 10),
    ('Produktion', 'Fertigung & Montage', 'core', 11),
    ('Wareneingang', 'Wareneingang & Wareneingangsprüfung', 'core', 12),
    ('Versand', 'Logistik & Warenausgang', 'core', 13),
    ('Imp/Exp', 'Zoll, Import & Export', 'support', 14),
    ('Einkauf', 'Strategischer & Operativer Einkauf', 'support', 15),
    ('Kalibrierung', 'Prüfmittelüberwachung & Kalibrierung', 'support', 16),
    ('Instandhaltung', 'Maintenance & Technische Anlagen', 'support', 17),
    ('IT', 'Informationstechnologie & Systeme', 'support', 18),
    ('Facility', 'Facility Management & Gebäude', 'support', 19),
]

NON_PLANT_DEPTS = [d[0] for d in DEPARTMENTS_19 if d[0] != 'Plant Management']

# 1. Parse Excel data
with zipfile.ZipFile(xlsx_path) as z:
    shared_strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        ss_root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        for si in ss_root.findall('s:si', ns):
            texts = [t.text for t in si.findall('.//s:t', ns) if t.text]
            shared_strings.append(''.join(texts))

    def col_to_idx(col_str):
        num = 0
        for c in col_str:
            num = num * 26 + (ord(c.upper()) - ord('A') + 1)
        return num - 1

    sheet_root = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    rows = []
    for row in sheet_root.findall('.//s:row', ns):
        row_num = int(row.attrib.get('r'))
        cells = {}
        for c in row.findall('s:c', ns):
            r_ref = c.attrib.get('r', '')
            match = re.match(r'([A-Z]+)', r_ref)
            if not match: continue
            col_letters = match.group(1)
            col_idx = col_to_idx(col_letters)
            t = c.attrib.get('t', '')
            v = c.find('s:v', ns)
            val = v.text if v is not None else ''
            if t == 's' and val.isdigit(): val = shared_strings[int(val)]
            cells[col_idx] = val
        rows.append((row_num, cells))

# Excel Col Index to Department Name mapping
COL_TO_DEPT = {
    3: 'Plant Management',
    4: 'QM',
    5: 'QS',
    6: 'LSS (Lean Management)',
    7: 'IE-PDM',
    8: 'IE-NPI/Prod.Mgmt.',
    9: 'Manufacturing Engineering',
    10: 'PM',
    11: 'Planung',
    12: 'HR',
    13: 'Produktion',
    14: 'Wareneingang',
    15: 'Versand',
    16: 'Imp/Exp',
    17: 'Einkauf',
    18: 'Kalibrierung',
    19: 'Instandhaltung',
    20: 'IT',
    21: 'Facility'
}

excel_chapters = {}
for r_num, cells in rows[1:]:
    ch_raw = cells.get(1, '').strip()
    if not ch_raw: continue
    ch = re.sub(r'[^0-9.]', '', ch_raw)
    
    depts = set()
    # Check Col 2: Alle Bereiche (außer Plant Management)
    is_all_non_plant = cells.get(2, '').strip().lower() == 'x'
    if is_all_non_plant:
        for d in NON_PLANT_DEPTS:
            depts.add(d)
        depts.add('Alle Bereiche')
    
    # Check individual department columns
    for col_idx, dept_name in COL_TO_DEPT.items():
        if cells.get(col_idx, '').strip().lower() == 'x':
            depts.add(dept_name)
    
    excel_chapters[ch] = sorted(list(depts))

# Connect to database
conn = sqlite3.connect('prisma/dev.db')
c = conn.cursor()

# 2. Synchronize Department Table
c.execute('SELECT id, name FROM Department')
existing_depts = {row[1]: row[0] for row in c.fetchall()}

# Handle renames for existing audit integrity
RENAME_MAP = {
    'Lean Management': 'LSS (Lean Management)',
    'Personalabteilung': 'HR',
    'Qualitätsmanagement': 'QM',
    'Qualitätssicherung': 'QS',
    'Geschäftsführung': 'Plant Management',
    'Maintenance / Instandhaltung': 'Instandhaltung'
}

for old_name, new_name in RENAME_MAP.items():
    if old_name in existing_depts and new_name not in existing_depts:
        c.execute('UPDATE Department SET name = ? WHERE id = ?', (new_name, existing_depts[old_name]))
        print(f"  • Renamed '{old_name}' -> '{new_name}'")
        existing_depts[new_name] = existing_depts.pop(old_name)

# Insert missing 19 departments
for name, manager, proc_type, order in DEPARTMENTS_19:
    if name not in existing_depts:
        new_id = str(uuid.uuid4())
        now = int(datetime.utcnow().timestamp() * 1000)
        c.execute('''
            INSERT INTO Department (id, name, manager, processType, "order", createdAt)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (new_id, name, manager, proc_type, order, now))
        existing_depts[name] = new_id
        print(f"  + Added Department: {name}")
    else:
        c.execute('''
            UPDATE Department SET processType = ?, "order" = ? WHERE id = ?
        ''', (proc_type, order, existing_depts[name]))

# 3. Synchronize Requirement.departments
c.execute('SELECT id, chapter, title, roles FROM Requirement')
requirements = c.fetchall()

updated_req_count = 0
for req_id, chapter, title, cur_roles in requirements:
    match_depts = None
    if chapter in excel_chapters and excel_chapters[chapter]:
        match_depts = excel_chapters[chapter]
    else:
        # Fallback to parent chapter (e.g. 5.1.1 -> 5.1 -> 5)
        parts = chapter.split('.')
        parent = '.'.join(parts[:-1]) if len(parts) > 1 else None
        if parent and parent in excel_chapters and excel_chapters[parent]:
            match_depts = excel_chapters[parent]
    
    if not match_depts:
        match_depts = ['Alle Bereiche'] + NON_PLANT_DEPTS

    # Add legacy names as aliases so existing audits still filter correctly
    depts_with_aliases = list(match_depts)
    if 'HR' in match_depts and 'Personalabteilung' not in depts_with_aliases:
        depts_with_aliases.append('Personalabteilung')
    if 'LSS (Lean Management)' in match_depts and 'Lean Management' not in depts_with_aliases:
        depts_with_aliases.append('Lean Management')
    if any(eng in match_depts for eng in ['IE-PDM', 'IE-NPI/Prod.Mgmt.', 'Manufacturing Engineering', 'PM']):
        if 'Entwicklung' not in depts_with_aliases:
            depts_with_aliases.append('Entwicklung')

    depts_json = json.dumps(depts_with_aliases, ensure_ascii=False)
    roles = 'leadership' if match_depts == ['Plant Management'] else cur_roles

    c.execute('UPDATE Requirement SET departments = ?, roles = ? WHERE id = ?', (depts_json, roles, req_id))
    updated_req_count += 1

conn.commit()

# Print summary
c.execute('SELECT count(*) FROM Department')
dept_count = c.fetchone()[0]
print(f"\n✅ Total Departments in Database: {dept_count}")
print(f"✅ Updated {updated_req_count} requirements with exact Excel department mappings.")

c.execute('SELECT name, "order", processType FROM Department ORDER BY "order" ASC, name ASC')
print("\nAll Available Departments in App:")
for row in c.fetchall():
    print(f"  {row[1]:2}: {row[0]:30} ({row[2]})")

conn.close()
