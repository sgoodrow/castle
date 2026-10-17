import sys, re, json
sql, table, out = sys.argv[1], sys.argv[2], sys.argv[3]
cols=[]; rows=[]; state=0
def parse_values(s):
    i=0;n=len(s);res=[]
    while i<n:
        if s[i]!='(':
            i+=1;continue
        i+=1;row=[];cur=None
        while True:
            c=s[i]
            if c=="'":
                i+=1;buf=[]
                while True:
                    c=s[i]
                    if c=='\\': buf.append({'n':'\n','r':'\r','t':'\t','0':'\0'}.get(s[i+1],s[i+1]));i+=2;continue
                    if c=="'":
                        if s[i+1:i+2]=="'": buf.append("'");i+=2;continue
                        i+=1;break
                    buf.append(c);i+=1
                cur=''.join(buf)
            elif c in ',)':
                row.append(cur);cur=None;i+=1
                if c==')': break
            else:
                j=i
                while s[j] not in ',)': j+=1
                tok=s[i:j].strip();i=j
                if tok=='NULL': cur=None
                else:
                    try: cur=int(tok)
                    except ValueError:
                        try: cur=float(tok)
                        except ValueError: cur=tok
        res.append(row)
    return res
with open(sql,encoding='utf-8',errors='replace') as f:
    for line in f:
        if state==0 and line.startswith('CREATE TABLE `%s`'%table): state=1;continue
        if state==1:
            m=re.match(r'\s+`(\w+)`',line)
            if m: cols.append(m.group(1))
            elif line.startswith(')'): state=2
            continue
        if state==2:
            if line.startswith('INSERT INTO `%s`'%table): state=3;continue
            if line.startswith('CREATE TABLE'): break
        if state==3:
            rows+=parse_values(line)
            if line.rstrip().endswith(';'): state=2
json.dump({'cols':cols,'rows':rows},open(out,'w'))
print(len(cols),len(rows))
