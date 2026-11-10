import sys,json,numpy as np
from PIL import Image,ImageDraw,ImageFont
from skimage.morphology import skeletonize
A='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
ix={c:i for i,c in enumerate(A)}
def load(p):
    G={}
    for line in open(p,encoding='utf8').read().split('\n'):
        if not line:continue
        k=line[0];cs=[]
        for c in line[1:].split('.'):
            pts=[]
            for i in range(0,len(c),3):
                w=ix[c[i]]*4096+ix[c[i+1]]*64+ix[c[i+2]]
                pts.append((w//512-20,(w%512)-100))
            cs.append(pts)
        G[k]=cs
    return G
S=2;XH=958/5;OY=320;OX=20  # raster: y px = (OY - Y)*S
def raster(cs):
    im=Image.new('L',(380*S,460*S),0)
    # even-odd via XOR of contours
    acc=np.zeros((460*S,380*S),bool)
    for c in cs:
        t=Image.new('L',im.size,0);ImageDraw.Draw(t).polygon([((x+OX)*S,(OY-y)*S) for x,y in c],fill=255)
        acc^=np.array(t)>0
    return acc
if __name__=='__main__':
    G=load(sys.argv[1]);keys=list(G)
    cols=13;rows=(len(keys)+cols-1)//cols;cw,ch=190,230
    sheet=Image.new('RGB',(cols*cw,rows*ch),'white');d=ImageDraw.Draw(sheet)
    for i,k in enumerate(keys):
        a=raster(G[k]);sk=skeletonize(a)
        rgb=np.full(a.shape+(3,),255,np.uint8);rgb[a]=(200,200,200);rgb[sk]=(200,0,0)
        t=Image.fromarray(rgb).resize((cw,ch))
        sheet.paste(t,((i%cols)*cw,(i//cols)*ch))
        yb=(i//cols)*ch+int(OY*S*ch/(460*S));yx=(i//cols)*ch+int((OY-XH)*S*ch/(460*S))
        d.line([((i%cols)*cw,yb),((i%cols)*cw+cw,yb)],fill=(120,160,255));d.line([((i%cols)*cw,yx),((i%cols)*cw+cw,yx)],fill=(180,210,255))
    sheet.save('sheet.png');print(sheet.size)
