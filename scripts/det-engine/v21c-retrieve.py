"""Finite free documentary requests; HTTP success is not proof of full-text access."""
import concurrent.futures,datetime,gzip,importlib.util,json,pathlib,sys,urllib.parse,urllib.request
S=importlib.util.spec_from_file_location('session',pathlib.Path(__file__).with_name('v21c-session.py'));session=importlib.util.module_from_spec(S);S.loader.exec_module(session)
def fetch(item,out):
    session.guard();key,url=item['key'],item['url'];r={**item,'attemptedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'paidApi':False}
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'TFCLab-offline-documentary-audit/21C','Accept':'application/xml,application/json,text/html;q=0.8,*/*;q=0.5'})
        with urllib.request.urlopen(req,timeout=25)as response:
            raw=response.read(4000001);assert len(raw)<=4000000;r.update(httpStatus=response.status,contentType=response.headers.get('Content-Type'),resolvedUrl=response.url)
        (out/(key+'.response.gz')).write_bytes(gzip.compress(raw,mtime=0));r.update(responseSha256=session.sha(raw),bytes=len(raw),artifact=str(out/(key+'.response.gz')),retrievedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),status='response_retrieved_access_type_not_yet_assessed')
    except Exception as e:r.update(status='not_retrieved',error=str(e),responseSha256=None)
    return r
def main():
    session.guard();plan=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2]);assert not out.exists()and out.resolve().is_relative_to((session.ROOT/'evidence').resolve());out.mkdir()
    items=session.load(plan);assert len(items)<=12 and len({i['key']for i in items})==len(items)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3)as pool:result=list(pool.map(lambda item:fetch(item,out),items))
    session.save(out/'access.json',result);print(json.dumps([{k:r.get(k)for k in ['key','status','httpStatus','bytes','error']}for r in result]))
if __name__=='__main__':main()
