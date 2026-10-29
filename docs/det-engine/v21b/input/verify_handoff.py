#!/usr/bin/env python3
"""Offline read-only verification of TFCLab V21B research handoff."""
import json,csv,hashlib,pathlib,sys
D=pathlib.Path(__file__).resolve().parent
manifest=json.loads((D/'manifest_sha256.json').read_text())['sha256']
assert set(manifest)=={p.name for p in D.iterdir() if p.is_file() and p.name!='manifest_sha256.json'},'unlisted file in packet'
for name,digest in manifest.items():
 actual=hashlib.sha256((D/name).read_bytes()).hexdigest()
 assert actual==digest,(name,'checksum mismatch')
refs=json.loads((D/'references_verifiees.json').read_text())
ids={r['reference_id'] for r in refs}
assert len(refs)==len(ids) and len(refs)>=40
assert all(r['pmid'].isdigit() and r['url'].endswith(r['pmid']+'/') for r in refs)
assert not any(r['verification_status']=='full_text_reviewed' for r in refs)
families=json.loads((D/'mecanismes_15_familles.json').read_text())['families']
assert len(families)==15 and len({f['familyId'] for f in families})==15
assert all(set(f['referenceIds'])<=ids for f in families)
claims=[json.loads(s) for s in (D/'assertions_familiales_non_liees.jsonl').read_text().splitlines() if s.strip()]
assert all(c['bindingToWorkout'] is None and c['automaticPromotion'] is False and c['individualAthleteApproved'] is False for c in claims)
assert all(set(c['candidateReferenceIds'])<=ids for c in claims)
pol=json.loads((D/'garde_fous_integration.json').read_text())
assert pol['immutableFlags']['automaticPromotion'] is False
assert pol['immutableFlags']['individualAthleteApproved'] is False
assert 'no_matching_source_effective_hash' in pol['globalBlockingRules']
questions=json.loads((D/'REPONSES_62_QUESTIONS_V21A.json').read_text())['items']
assert len(questions)==62 and len({q['questionId'] for q in questions})==62
assert len(list(csv.DictReader((D/'REPONSES_62_QUESTIONS_V21A.csv').open(encoding='utf-8'))))==62
assert len(list(csv.DictReader((D/'protocoles_et_doses_etudies.csv').open(encoding='utf-8'))))==13
assert all(q['workoutDoseValidated'] is False for q in questions)
assert all(set(q['primaryReferenceIds'])<=ids for q in questions)
print('PASS: checksums, 15 families,',len(refs),'sources,',len(claims),'unbound claims, zero auto promotion')
