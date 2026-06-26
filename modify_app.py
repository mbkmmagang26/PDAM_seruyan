import os

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'path="/staff/meter-reading"' in line:
        insert_idx = i - 1
        break

new_lines = lines[:insert_idx] + [
    '          <Route \n',
    '            path="/direktur/*" \n',
    '            element={\n',
    '              <ProtectedRoute allowedRoles={[\'direktur\']}>\n',
    '                <AccountingDashboard />\n',
    '              </ProtectedRoute>\n',
    '            } \n',
    '          />\n',
    '          \n'
] + lines[insert_idx:]

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
