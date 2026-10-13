import sqlite3, json, sys, re
db, out, old = sys.argv[1:4]
c = sqlite3.connect(db)
info = dict(c.execute('select name,value from info'))
books = list(c.execute('select book_number,long_name from books order by book_number'))
assert len(books) == 66
def title(n):
    m = re.match(r'^(\d)\s+(.*?)\((.)\)$', n)
    pre = ''
    if m: pre = m.group(3) + ' '; n = m.group(2)
    n = re.sub(r'\(.*?\)', '', n).strip()
    return pre + ' '.join(w[:1].upper() + w[1:].lower() for w in n.split())
names = [title(n) for _, n in books]
data = []
for bn, _ in books:
    chs = {}
    for ch, v, t in c.execute('select chapter,verse,text from verses where book_number=? order by chapter,verse', (bn,)):
        chs.setdefault(int(ch), {})[int(v)] = t.strip()
    n = max(chs)
    assert sorted(chs) == list(range(1, n + 1)), bn
    data.append([[chs[k].get(i, '') for i in range(1, max(chs[k]) + 1)] for k in range(1, n + 1)])
json.dump({'title': info['description'], 'names': names, 'books': data}, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
oldn = json.load(open(old, encoding='utf-8'))['names']
print(sum(len(x) for b in data for x in b), 'verse slots')
for i, (a, b) in enumerate(zip(oldn, names)):
    if a != b: print(i, a, '->', b)
