from pathlib import Path
import re,json,hashlib,subprocess
r=Path(__file__).resolve().parent;b=Path('/home/deploy/foodsave/backend_foodsave/src/main/java/com/foodsave/backend/service'); (r/'sources').mkdir(exist_ok=True)
sha=lambda x:hashlib.sha256(x).hexdigest()
def span(s,name):
 m=re.search(r'\b'+name+r'\s*\([^)]*\)\s*\{',s);assert m
 start=m.end();depth=1;i=start
 while depth:
  depth+=(s[i]=='{')-(s[i]=='}');i+=1
 return start,i-1
sources={}
p=b/'ProductService.java';s=p.read_text();before=sha(p.read_bytes());assert before=='a48450e54876231abab14a7e602c634da67ac708f63e2e9fe3dff73718ea7a7c'
a,z=span(s,'updateProductFromDTO');assert 'dto.getStatus()' in s[a:z]
s=s[:z]+"""    // Explicit staff withdrawal must not be reopened by stock normalization or cancellation.
        if (dto.getStatus() != null && dto.getStatus() != ProductStatus.AVAILABLE) {
            product.setStatus(dto.getStatus());
            product.setActive(false);
        }
    """+s[z:]
a,z=span(s,'updateProductStatus');body=s[a:z];needle='product.setStatus(status);';assert body.count(needle)==1
body=body.replace(needle,needle+'\n        if (status != null) product.setActive(status == ProductStatus.AVAILABLE);')
s=s[:a]+body+s[z:];(r/'sources'/p.name).write_text(s);sources[p.name]={'before':before,'after':sha(s.encode())}
p=b/'ReservationStatusService.java';s=p.read_text();before=sha(p.read_bytes());previous=json.loads(Path('/home/deploy/foodsave-cancel-status-20261110/backend-manifest.json').read_text());assert before==previous['sources'][p.name]['after']
a,z=span(s,'restoreReservedStockIfNeeded');body=s[a:z]
old='&& product.getStatus() == ProductStatus.AVAILABLE) {'
new='&& (product.getStatus() == ProductStatus.AVAILABLE || product.getStatus() == ProductStatus.OUT_OF_STOCK)) {'
assert body.count(old)==1;body=body.replace(old,new)
needle='product.setStockQuantity(available + quantity);';assert body.count(needle)==1;body=body.replace(needle,needle+'\n                product.setStatus(ProductStatus.AVAILABLE);')
body=body.replace('// Booking itself changes quantities, not the explicitly managed product status.','// Manual withdrawal disables the offer; automatic reservation exhaustion keeps it active.')
s=s[:a]+body+s[z:];(r/'sources'/p.name).write_text(s);sources[p.name]={'before':before,'after':sha(s.encode())}
image=subprocess.check_output(['docker','inspect','--format','{{.Image}}','foodsave-backend'],text=True).strip();assert image=='sha256:db8fc32c4be3c9ac6b18cbbb3829768c72238c9b0958186429adaa264adb5c1a'
(r/'backend-manifest.json').write_text(json.dumps({'image':image,'sources':sources},indent=2));print('Prepared two guarded service changes; live sources unchanged')
