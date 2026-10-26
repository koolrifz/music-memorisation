"""
Build Tango the puppet's layers (art/tango-puppet/) from Rob's Gemini frames.

Rob, 2026-10-26. Every frame is an edit of one clean base picture, so the kit
sits in the same place in all of them; each part that changed (an arm, the
hi-hat foot, the face) is cut out by difference against the base and saved on
its own, with its place on an 800 x 665 stage.

Run from a folder holding the frames as Rob's Drive has them:
    base/clean-1136.jpg      the clean base (no arms), on green
    closed/<pose>-<n>.png    each frame, already keyed (transparent)
    python3 /path/to/tools/build-tango-puppet.py
It writes layers/*.webp and layers/layers.json; copy the .webp files to
art/tango-puppet/ and the places into content/art.js ('tango.puppet').
FACES and LIMBS below are the versions chosen: the others redrew her face, a
cymbal or the vest, or put an arm in front of a drum.
"""
import numpy as np, sys, json, os
from PIL import Image
from scipy import ndimage as nd
_base=np.asarray(Image.open('base/clean-1136.jpg').convert('RGB')).astype(int)
bgreen=(_base[...,1]>150)&(_base[...,0]<120)&(_base[...,2]<120)
def cut(path, minarea=1500):
    a=np.asarray(Image.open(path).convert('RGBA')).astype(int)
    al=a[...,3]>128
    d=np.abs(a[...,:3]-_base).sum(2)
    m=al&((d>110)|bgreen)
    m=nd.binary_opening(m,iterations=2)
    lab,n=nd.label(m)
    sizes=nd.sum(m,lab,range(1,n+1))
    keep=np.isin(lab,[i+1 for i,s in enumerate(sizes) if s>=minarea])
    keep=nd.binary_closing(keep,iterations=3)
    keep=nd.binary_dilation(keep,iterations=3)&al
    out=a.copy(); out[...,3]=np.where(keep,a[...,3],0)
    return out.astype(np.uint8), keep

S=800/1136.
OUT='layers'; os.makedirs(OUT,exist_ok=True)
# key the clean base
b=np.asarray(Image.open('base/clean-1136.jpg').convert('RGB')).astype(float)
dom=b[...,1]-np.maximum(b[...,0],b[...,2])
alpha=np.clip(1-(dom-35)/70,0,1)
b[...,1]=np.minimum(b[...,1],np.maximum(b[...,0],b[...,2]))
base=np.dstack([b,alpha*255]).astype(np.uint8)
HB=(440,20,830,350)
FEATHER=34  # head box (x0,y0,x1,y1)
def save(arr,name,box=None):
    im=Image.fromarray(arr)
    if box is None:
        bb=im.getbbox(); box=bb
    im=im.crop(box)
    x0,y0=box[0],box[1]
    w,h=im.size
    im=im.resize((max(1,round(w*S)),max(1,round(h*S))),Image.LANCZOS)
    im.save(f'{OUT}/{name}.webp',quality=88)
    return dict(x=round(x0*S,1),y=round(y0*S,1),w=im.size[0],h=im.size[1])
meta={'w':800,'h':round(944*S)}
body=base.copy(); body[HB[1]:HB[3]-FEATHER,HB[0]:HB[2],3]=0
meta['body']=save(body,'body',(0,0,1136,944))
def head(arr,name):
    m=np.zeros(arr.shape[:2],bool); m[HB[1]:HB[3],HB[0]:HB[2]]=True
    a=arr.copy(); a[~m,3]=0
    r=np.linspace(1,0,FEATHER)[:,None]
    a[HB[3]-FEATHER:HB[3],HB[0]:HB[2],3]=(a[HB[3]-FEATHER:HB[3],HB[0]:HB[2],3]*r).astype(np.uint8)
    return save(a,name,HB)
meta['head']={'neutral':head(base,'head-neutral')}
FACES={'blink':'H1-3','ah':'H2-2','oo':'H3-3','tilt':'H4-1','laugh':'H6-1','oops':'H7-2','wink':'H8-1','focus':'H9-1','listen':'H10-1'}
for k,f in FACES.items():
    a=np.asarray(Image.open(f'closed/{f}.png').convert('RGBA'))
    meta['head'][k]=head(a,'head-'+k)
# limbs: (name, frame, side)  side L=picture-left, R=picture-right, None=all
LIMBS=[('L-up','A1-2','L'),('L-mid','A2-3','L'),('L-crash','A3-2','L'),('L-tom','A4-1','L'),
       ('R-up','A5-1','R'),('R-mid','A6-3','R'),('R-snare','A7-3','R'),('R-hat','A8-1','R'),
       ('cheer','A9-2',None),('point','A10-1',None),('foot-up','F1-1',None),('foot-down','F2-3',None)]
meta['limb']={}
for name,f,side in LIMBS:
    o,k=cut('closed/'+f+'.png')
    if side=='L': o[:,600:,3]=0
    if side=='R': o[:,:600,3]=0
    meta['limb'][name]=save(o,'limb-'+name)
json.dump(meta,open(f'{OUT}/layers.json','w'),indent=1)
print(json.dumps(meta)[:300]); 
