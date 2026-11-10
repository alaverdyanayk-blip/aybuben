import sys,json,math,numpy as np
from collections import defaultdict
from skimage.morphology import skeletonize
from sk import load,raster,S,OY,OX,XH
N8=[(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
def graph(sk):
    P=set(map(tuple,np.argwhere(sk)))
    nb=lambda p:[(p[0]+a,p[1]+b) for a,b in N8 if (p[0]+a,p[1]+b) in P]
    deg={p:len(nb(p)) for p in P}
    special={p for p in P if deg[p]!=2}
    # cluster adjacent junction pixels
    comp={};nodes=[]
    for p in special:
        if p in comp:continue
        st=[p];comp[p]=len(nodes);grp=[p]
        while st:
            q=st.pop()
            for r in nb(q):
                if r in special and r not in comp and deg[r]>2 and deg[q]>2:comp[r]=len(nodes);st.append(r);grp.append(r)
        nodes.append(grp)
    cen=[tuple(np.mean(g,axis=0)) for g in nodes]
    edges=[];seen=set()
    for p in special:
        for q in nb(p):
            if q in special:
                if comp[q]!=comp[p] and (q,p) not in seen:seen.add((p,q));edges.append((comp[p],comp[q],[p,q]))
                continue
            if (p,q) in seen:continue
            path=[p,q];prev=p;cur=q
            while cur not in special:
                nx=[r for r in nb(cur) if r!=prev and r not in path[-3:]]
                # prefer non-special continuing
                if not nx:break
                nxt=sorted(nx,key=lambda r:(r in special and deg[r]>2, abs(r[0]-cur[0])+abs(r[1]-cur[1])))[0]
                # if a special neighbour is 4-adjacent take it
                sp=[r for r in nx if r in special]
                if sp:nxt=sorted(sp,key=lambda r:abs(r[0]-cur[0])+abs(r[1]-cur[1]))[0]
                path.append(nxt);prev,cur=cur,nxt
            if cur in special:
                seen.add((cur,path[-2]));edges.append((comp[p],comp[cur],path))
    # pure loops (no special pixels)
    used=set(q for e in edges for q in e[2])
    rest=P-used-special
    while rest:
        p=min(rest);path=[p];prev=None;cur=p
        while True:
            nx=[r for r in nb(cur) if r!=prev and r in rest and r not in path]
            if not nx:break
            prev,cur=cur,nx[0];path.append(cur)
        rest-=set(path)
        if len(path)>20:
            nodes.append([p]);cen.append(p);edges.append((len(cen)-1,len(cen)-1,path+[p]))
    return cen,edges
def plen(path):return sum(math.hypot(a[0]-b[0],a[1]-b[1]) for a,b in zip(path,path[1:]))
def prune(cen,edges,minlen):
    while True:
        dg=defaultdict(int)
        for a,b,_ in edges:dg[a]+=1;dg[b]+=1
        bad=[e for e in edges if e[0]!=e[1] and plen(e[2])<minlen and ((dg[e[0]]==1 and dg[e[1]]>2) or (dg[e[1]]==1 and dg[e[0]]>2))]
        if not bad:break
        edges.remove(min(bad,key=lambda e:plen(e[2])))
    # contract short junction-junction edges
    while True:
        dg=defaultdict(int)
        for a,b,_ in edges:dg[a]+=1;dg[b]+=1
        sh=[e for e in edges if e[0]!=e[1] and dg[e[0]]>2 and dg[e[1]]>2 and plen(e[2])<20]
        if not sh:break
        e=sh[0];edges.remove(e);a,b=e[0],e[1]
        for i,(x,y,p) in enumerate(edges):edges[i]=(a if x==b else x,a if y==b else y,p)
    return edges
def tang(path,k=14):
    a=np.array(path[0],float);b=np.array(path[min(k,len(path)-1)],float);v=b-a;n=np.linalg.norm(v) or 1;return v/n
def canon(p,pure=False):
    a,b=p[0],p[-1]
    if math.hypot(a[0]-b[0],a[1]-b[1])<6 and len(p)>30:
        q=p
        if pure:
            k=min(range(len(p)),key=lambda i:(p[i][0],p[i][1]));q=p[k:]+p[1:k+1]
        ar=sum(q[i][1]*q[i+1][0]-q[i+1][1]*q[i][0] for i in range(len(q)-1))  # x*y' - x'*y, screen coords
        # screen ccw (top -> left -> bottom -> right) has ar>0 with x=col,y=row
        if ar<0:q=q[::-1]
        return q
    dy=b[0]-a[0];dx=b[1]-a[1]
    if abs(dx)>abs(dy)*1.5:return p if dx>=0 else p[::-1]
    return p if dy>=0 else p[::-1]
def stemrun(st):
    x0=st[0][1];n=0
    for i,q in enumerate(st):
        if abs(q[1]-x0)>14:break
        if i>6 and q[0]>min(r[0] for r in st[:i])+6:break
        n=i
    return n if st[0][0]-st[n][0]>110 else 0
def splitstems(cen,edges):
    dg=defaultdict(int)
    for a,b,_ in edges:dg[a]+=1;dg[b]+=1
    out=[];nolink=set()
    for a,b,p in edges:
        done=False
        if a!=b:
            for (n0,n1,q) in ((a,b,p),(b,a,p[::-1])):
                if dg[n0]==1:
                    n=stemrun(q)
                    if n and len(q)-n>30:
                        cen.append(q[n]);m=len(cen)-1;nolink.add(m)
                        out.append((n0,m,q[:n+1]));out.append((m,n1,q[n:]));done=True;break
        if not done:out.append((a,b,p))
    dg2=defaultdict(int)
    for a,b,_ in out:dg2[a]+=1;dg2[b]+=1
    return [(a,b,canon(p,a==b and dg2[a]==2)) for a,b,p in out],nolink
def fixends(edges):
    # after canon the path may be reversed relative to (a,b): recompute by matching is not needed for loops; store ends by proximity
    return edges
def decompose(cen,edges,nolink):
    he=defaultdict(list)
    for i,(a,b,p) in enumerate(edges):
        he[a].append((i,0,tang(p)));he[b].append((i,1,tang(p[::-1])))
    link={}
    for n,hs0 in he.items():
        if n in nolink:continue
        hs=list(hs0)
        while len(hs)>=2:
            best=None
            for x in range(len(hs)):
                for y in range(x+1,len(hs)):
                    c=float(np.dot(hs[x][2],hs[y][2]))
                    if best is None or c<best[0]:best=(c,x,y)
            c,x,y=best
            if c>(-0.25 if len(hs0)>2 else 2):break
            link[hs[x][:2]]=hs[y][:2];link[hs[y][:2]]=hs[x][:2]
            hs=[h for i,h in enumerate(hs) if i not in(x,y)]
    strokes=[];used=set()
    def walk(i,end):
        seq=[]
        while i not in used:
            used.add(i);seq.append((i,end==1))
            nxt=link.get((i,1-end))
            if not nxt:break
            i,end=nxt
        return seq
    for i in range(len(edges)):
        for end in (0,1):
            if i not in used and (i,end) not in link:strokes.append(walk(i,end))
    for i in range(len(edges)):
        if i not in used:strokes.append(walk(i,0))
    return strokes
def pts(edges,seq):
    out=[]
    for i,r in seq:
        p=edges[i][2];out+= (p[::-1] if r else p)
    return out
def autodir(edges,seq):
    p=pts(edges,seq)
    if canon(p)[:3]!=p[:3] and canon(p)[-1]!=p[-1]:
        return [(i,not r) for i,r in seq[::-1]]
    return seq
def rdp(p,eps):
    if len(p)<3:return p
    if math.hypot(p[0][0]-p[-1][0],p[0][1]-p[-1][1])<3 and len(p)>8:
        j=max(range(len(p)),key=lambda i:math.hypot(p[i][0]-p[0][0],p[i][1]-p[0][1]))
        return rdp(p[:j+1],eps)[:-1]+rdp(p[j:],eps)
    a,b=np.array(p[0],float),np.array(p[-1],float);L=np.linalg.norm(b-a) or 1
    d=[abs((b[0]-a[0])*(a[1]-q[1])-(a[0]-q[0])*(b[1]-a[1]))/L for q in p[1:-1]]
    i=int(np.argmax(d))+1
    if d[i-1]>eps:return rdp(p[:i+1],eps)[:-1]+rdp(p[i:],eps)
    return [p[0],p[-1]]
def vrun(q):
    n=0;W=12
    for i in range(W,len(q)):
        dy=q[i-W][0]-q[i][0];dx=abs(q[i][1]-q[i-W][1])
        if dy<=0 or dx>dy*0.45:break
        n=i
    return max(0,n-3) if n else 0
def spec(edges,st):
    parts=[]
    for t in st.split():
        if t[-1] in 'ab':
            p=edges[int(t[:-1])][2];n1=vrun(p) if p[0][0]>p[-1][0]-40 else 0;n2=vrun(p[::-1])
            q=p if (p[0][0]-p[n1][0])>=(p[-1][0]-p[::-1][n2][0]) else p[::-1];n=vrun(q)
            parts.append((q[:n+1][::-1] if t[-1]=='a' else q[n:],True))
        else:
            r=t.endswith('r');i=int(t.rstrip('r'));p=edges[i][2];closed=edges[i][0]==edges[i][1]
            parts.append((p[::-1] if r else p,closed or len(st.split())==1))
    dist=lambda a,b:math.hypot(a[0]-b[0],a[1]-b[1])
    for i,(p,fixed) in enumerate(parts):
        if fixed:continue
        if i==0:
            nx=parts[1][0];tgt=[nx[0],nx[-1]]
            if min(dist(p[0],t) for t in tgt)<min(dist(p[-1],t) for t in tgt):parts[i]=(p[::-1],True)
        else:
            prev=parts[i-1][0][-1]
            if dist(p[-1],prev)<dist(p[0],prev):parts[i]=(p[::-1],True)
    out=[]
    for p,_ in parts:out+=p
    return out
def build(G,OV):
    out={};dbg={}
    for k,cs in G.items():
        a=raster(cs);sk=skeletonize(a)
        cen,edges=graph(sk);edges=prune(cen,edges,16)
        # node ids must follow path ends: re-derive (a,b) so that a is at path[0]
        edges,nolink=splitstems(cen,edges)
        E2=[]
        for (a_,b_,p) in edges:
            da=math.hypot(cen[a_][0]-p[0][0],cen[a_][1]-p[0][1]);db=math.hypot(cen[b_][0]-p[0][0],cen[b_][1]-p[0][1])
            E2.append((a_,b_,p) if da<=db else (b_,a_,p))
        edges=E2
        if k in OV:
            out[k]=[spec(edges,st) for st in OV[k]];dbg[k]=(edges,[]);continue
        else:
            seqs=[autodir(edges,s) for s in decompose(cen,edges,nolink)]
            seqs=[s for s in seqs if plen(pts(edges,s))>8]
            def key(s):
                p=pts(edges,s);hz=abs(p[-1][1]-p[0][1])>abs(p[-1][0]-p[0][0])*2.5 and (max(q[0] for q in p)-min(q[0] for q in p))<16
                return (hz and plen(p)<140,p[0][1]//24,p[0][0])
            seqs.sort(key=key)
        out[k]=[pts(edges,s) for s in seqs];dbg[k]=(edges,seqs)
    return out,dbg
C=40/XH/S
def tocb(sts):
    xs=[q[1] for s in sts for q in s];x0=min(xs)
    res=[]
    for s in sts:
        p=rdp(s,4.5)
        res.append([((q[1]-x0)*C+5,75-(OY*S-q[0])*C) for q in p])
    w=max(x for s in res for x,y in s)+5
    return res,w
def svg(pts):
    f=lambda v:('%.1f'%v).rstrip('0').rstrip('.')
    d='M%s %s'%(f(pts[0][0]),f(pts[0][1]))
    if len(pts)==2:return d+'L%s %s'%(f(pts[1][0]),f(pts[1][1]))
    for i in range(1,len(pts)-1):
        a,b,c=pts[i-1],pts[i],pts[i+1]
        v1=(b[0]-a[0],b[1]-a[1]);v2=(c[0]-b[0],c[1]-b[1])
        cs=(v1[0]*v2[0]+v1[1]*v2[1])/((math.hypot(*v1)*math.hypot(*v2)) or 1)
        if cs<0.5: d+='L%s %s'%(f(b[0]),f(b[1]))   # sharp corner
        else:
            m=((b[0]+c[0])/2,(b[1]+c[1])/2) if i<len(pts)-2 else c
            d+='Q%s %s %s %s'%(f(b[0]),f(b[1]),f(m[0]),f(m[1]))
            if i==len(pts)-2:return d
    return d+'L%s %s'%(f(pts[-1][0]),f(pts[-1][1]))
if __name__=='__main__':
    from PIL import Image,ImageDraw
    G=load('../font/outlines.txt')
    import os
    OV=json.load(open('ov.json',encoding='utf8')) if os.path.exists('ov.json') else {}
    R,D=build(G,OV);keys=list(R)
    only=sys.argv[1] if len(sys.argv)>1 else None
    data={}
    for k in keys:
        cb,w=tocb(R[k]);data[k]={'w':round(w),'s':[svg(p) for p in cb]}
    json.dump(data,open('strokes.json','w',encoding='utf8'),ensure_ascii=False)
    show=[k for k in keys if (not only or k in only)]
    cols=8;cw,ch=250,290;rows=(len(show)+cols-1)//cols
    sheet=Image.new('RGB',(cols*cw,rows*ch),'white');d=ImageDraw.Draw(sheet)
    COL=[(210,30,30),(30,90,210),(20,150,60),(210,130,0),(150,0,180)]
    for i,k in enumerate(show):
        cb,w=tocb(R[k]);edges,seqs=D[k]
        ox=(i%cols)*cw+30;oy=(i//cols)*ch+40;z=2.1
        xs=[q[1] for s_ in R[k] for q in s_];x0=min(xs)
        T=lambda q:(ox+((q[1]-x0)*C+5)*z,oy+(75-(OY*S-q[0])*C)*z)
        for y in (15,35,75,92):d.line([(ox-25,oy+y*z),(ox+cw-40,oy+y*z)],fill=(215,225,245))
        for j,p in enumerate(cb):
            c=COL[j%5];q=[(ox+x*z,oy+y*z) for x,y in p];d.line(q,fill=c,width=3)
            x,y=q[0];d.ellipse([x-5,y-5,x+5,y+5],fill=c)
            # label offset away from next point
            nx,ny=q[1];L=math.hypot(nx-x,ny-y) or 1;lx=x-(nx-x)/L*13;ly=y-(ny-y)/L*13
            d.text((lx-3,ly-6),str(j+1),fill=c)
        for ei,(a_,b_,p) in enumerate(edges):
            m=T(p[len(p)//2]);d.rectangle([m[0]+3,m[1]-6,m[0]+17,m[1]+6],fill=(255,255,200));d.text((m[0]+5,m[1]-6),str(ei),fill='black')
        d.text((ox-22,oy-36),k+' '+' | '.join(' '.join(str(i_)+('r' if r else '') for i_,r in s_) for s_ in seqs),fill=(90,90,90))
    per=2
    for r in range(0,rows,per):sheet.crop((0,r*ch,cols*cw,min(rows,r+per)*ch)).save('st%d.png'%(r//per))
    print(len(json.dumps(data,ensure_ascii=False)),rows)
