import zipfile
import xml.etree.ElementTree as ET
import re
import sqlite3
import json

xlsx_path = '/Users/michael/.gemini/antigravity/brain/73137519-c73d-4d06-a540-b0eecca8b514/.user_uploaded/media_1792775218828_e9ceda38.xlsx'

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
    rows_data = []
    for row in sheet_root.findall('.//s:row', ns):
        row_num = int(row.attrib.get('r', 0))
        cells = {}
        for c in row.findall('s:c', ns):
            r_ref = c.attrib.get('r', '')
            match = re.match(r'([A-Z]+)([0-9]+)', r_ref)
            if not match: continue
            col_letters, _ = match.groups()
            col_idx = col_to_idx(col_letters)
            cell_type = c.attrib.get('t', '')
            val_elem = c.find('s:v', ns)
            val = val_elem.text if val_elem is not None else ''
            if cell_type == 's' and val.isdigit(): val = shared_strings[int(val)]
            elif cell_type == 'inlineStr':
                t_elem = c.find('.//s:t', ns)
                val = t_elem.text if t_elem is not None else ''
            cells[col_idx] = val
        rows_data.append((row_num, cells))

r1 = [c for r, c in rows_data if r == 1][0]
excel_cols = {i: r1[i].strip() for i in range(2, 22) if i in r1 and r1[i].strip()}

EXCEL_TO_APP = {
    'Alle Bereiche (außer Plant Management)': ['Alle Bereiche'],
    'Plant Management': ['Geschäftsführung'],
    'QM': ['Qualitätsmanagement'],
    'QS': ['Qualitätssicherung'],
    'LSS (Lean Management)': ['Lean Management'],
    'IE-PDM': ['Entwicklung'],
    'IE-NPI/Prod.Mgmt.': ['Entwicklung'],
    'Manufacturing Engingeering': ['Entwicklung', 'Produktion'],
    'PM': ['Entwicklung'],
    'Planung': ['Produktion'],
    'HR': ['Personalabteilung'],
    'Produktion': ['Produktion'],
    'Wareneingang': ['Wareneingang'],
    'Versand': ['Versand'],
    'Imp/Exp': ['Versand'],
    'Einkauf': ['Einkauf'],
    'Kalibrierung': ['Qualitätssicherung', 'Maintenance / Instandhaltung'],
    'Instandhaltung': ['Maintenance / Instandhaltung'],
    'IT': ['IT'],
    'Facility': ['Maintenance / Instandhaltung']
}

excel_chapters = {}
for r_num, cells in rows_data[1:]:
    ch = cells.get(1, '').strip()
    if not ch: continue
    ch_clean = re.sub(r'[^0-9.]', '', ch)
    app_depts = set()
    is_all = False
    for col_idx, col_name in excel_cols.items():
        if cells.get(col_idx, '').strip().lower() == 'x':
            if 'Alle Bereiche' in col_name:
                is_all = True
            for mapped in EXCEL_TO_APP.get(col_name, []):
                app_depts.add(mapped)
    
    excel_chapters[ch_clean] = {
        'is_all': is_all,
        'app_depts': sorted(list(app_depts))
    }

conn = sqlite3.connect('prisma/dev.db')
c = conn.cursor()
c.execute('SELECT id, chapter, title, departments, roles FROM Requirement')
requirements = c.fetchall()

updated_count = 0
for req_id, chapter, title, cur_depts, cur_roles in requirements:
    match = None
    if chapter in excel_chapters and excel_chapters[chapter]['app_depts']:
        match = excel_chapters[chapter]
    else:
        parts = chapter.split('.')
        parent = '.'.join(parts[:-1]) if len(parts) > 2 else None
        if parent and parent in excel_chapters and excel_chapters[parent]['app_depts']:
            match = excel_chapters[parent]

    if match:
        depts_to_store = json.dumps(match['app_depts'], ensure_ascii=False)
        roles = cur_roles
        # If Plant Management is exclusively assigned, role is leadership
        if match['app_depts'] == ['Geschäftsführung']:
            roles = 'leadership'
        
        c.execute('UPDATE Requirement SET departments = ?, roles = ? WHERE id = ?', (depts_to_store, roles, req_id))
        updated_count += 1
    else:
        # Default all
        c.execute('UPDATE Requirement SET departments = ? WHERE id = ?', (json.dumps(['Alle Bereiche'], ensure_ascii=False), req_id))
        updated_count += 1

conn.commit()
print(f"Successfully updated {updated_count} requirements with exact department assignments from Excel!")

# Verify results
c.execute('SELECT chapter, title, departments, roles FROM Requirement ORDER BY chapter LIMIT 15')
for r in c.fetchall():
    print(f"Kap. {r[0]:8} | {r[1][:30]:30} | {r[2]} | {r[3]}")
conn.close()
