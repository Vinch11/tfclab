"""One free Europe PMC retrieval, at most two attempts, with actual response bytes."""
import datetime,gzip,importlib.util,json,pathlib,urllib.parse,urllib.request
S=importlib.util.spec_from_file_location('session',pathlib.Path(__file__).with_name('v21b-session.py'));session=importlib.util.module_from_spec(S);S.loader.exec_module(session)
def retrieve():
    session.guard();r=session.ROOT;out=r/'evidence/public-source-retrieval';assert not out.exists();out.mkdir()
    refs=session.load(r/'input/references_verifiees.json');ids=[x['pmid']for x in refs]
    query='SRC:MED AND ('+' OR '.join('EXT_ID:'+id for id in ids)+')'
    url='https://www.ebi.ac.uk/europepmc/webservices/rest/search?'+urllib.parse.urlencode({'query':query,'format':'json','resultType':'core','pageSize':100})
    attempts=[]
    for i in range(2):
        session.guard()
        try:
            request=urllib.request.Request(url,headers={'User-Agent':'TFCLab-experimental-documentary-audit/21B','Accept':'application/json'})
            with urllib.request.urlopen(request,timeout=30)as response:
                raw=response.read(4000001);assert len(raw)<=4000000;status=response.status;ctype=response.headers.get('Content-Type')
            parsed=json.loads(raw);assert isinstance(parsed.get('resultList',{}).get('result'),list)
            (out/'response.json.gz').write_bytes(gzip.compress(raw,mtime=0))
            session.save(out/'provenance.json',{'retrievalUrl':url,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'httpStatus':status,'contentType':ctype,'responseSha256':session.sha(raw),'responseBytes':len(raw),
              'rawResponsePreservedGzip':True,'freePublicEndpoint':True,'paidApi':False,'attempts':attempts,
              'scope':'PubMed metadata and public abstracts via Europe PMC, no full text retrieved','requestedPmids':ids,'returned':len(parsed['resultList']['result'])})
            print(json.dumps({'returned':len(parsed['resultList']['result']),'bytes':len(raw),'responseSha256':session.sha(raw)}));return
        except Exception as e:
            attempts.append({'attempt':i+1,'error':str(e),'at':datetime.datetime.now(datetime.timezone.utc).isoformat()})
    session.save(out/'failure.json',{'attempts':attempts,'sourceVerified':False});raise RuntimeError('FREE_RETRIEVAL_UNAVAILABLE_NO_FAKE_HASH')
if __name__=='__main__':retrieve()
