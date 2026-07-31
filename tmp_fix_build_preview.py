from pathlib import Path

p = Path('apps/web/src/lib/build-preview.ts')
lines = p.read_text(encoding='utf-8').splitlines()
print('LINE 56 BEFORE:', repr(lines[55]))
print('LINE 71 BEFORE:', repr(lines[70]))
lines[55] = '    "      .replace(/\\/g, '/')"'
lines[70] = '    "    return href.trim().replace(/\\/g, \'/\').replace(/^\\s+|\\s+$/g, \'\');"'
p.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print('patched')
