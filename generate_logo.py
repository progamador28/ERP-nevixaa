import base64
import shutil

src_img = r'c:\Users\Sr Monteiro\.gemini\antigravity\brain\f79f63aa-1534-4283-a470-39b435639a00\media__1783559516285.png'
dst_img = r'c:\Users\Sr Monteiro\Desktop\nevixa\logo.png'

shutil.copy2(src_img, dst_img)

with open(dst_img, 'rb') as f:
    encoded = base64.b64encode(f.read()).decode('utf-8')

with open(r'c:\Users\Sr Monteiro\Desktop\nevixa\logo_b64.js', 'w') as f:
    f.write('const LOGO_BASE64 = "data:image/png;base64,' + encoded + '";\n')
