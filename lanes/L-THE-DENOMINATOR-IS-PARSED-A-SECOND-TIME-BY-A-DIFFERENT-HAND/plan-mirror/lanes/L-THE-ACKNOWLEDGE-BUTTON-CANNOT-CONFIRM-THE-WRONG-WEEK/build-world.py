#!/usr/bin/env python3
"""Build the two-publication world: the manager publishes TWO weeks that both roster the SAME worker.

No credential is written to stdout or to any artifact. Tokens are read from files the caller made.
"""
import json, os, sys, uuid, urllib.request, urllib.error

API = 'http://localhost:5971'
SCR = os.path.dirname(os.path.abspath(__file__))
STORE = 1
ASTRID = '3b14f26c-3a7f-4530-a1e1-e127ac6a9583'


def token(name):
    return open(os.path.join(SCR, name + '.token')).read().strip()


def call(method, path, tok, body=None, headers=None):
    url = API + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Authorization', 'Bearer ' + tok)
    if data is not None:
        req.add_header('Content-Type', 'application/json')
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw else None), dict(r.headers)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        return e.code, raw, dict(e.headers)


def publish_week(mt, start, end, note):
    key = str(uuid.uuid4())
    st, draft, hdrs = call('POST', '/workforce/stores/%d/schedules/drafts' % STORE, mt,
                           {'rangeStartUtc': start + 'T00:00:00Z', 'rangeEndUtc': end + 'T00:00:00Z'},
                           {'Idempotency-Key': key})
    print('draft', st, draft if st != 200 else draft['scheduleRevisionId'])
    if st != 200:
        return None
    rev = draft['scheduleRevisionId']
    etag = draft['eTag'] if 'eTag' in draft else draft.get('etag') or draft.get('ETag')

    st, batch, _ = call('PUT', '/workforce/stores/%d/schedules/%s/assignments:batch' % (STORE, rev), mt,
                        {'assignments': [{
                            'staffMemberId': ASTRID,
                            'localStart': start + 'T09:00:00',
                            'localEnd': start + 'T15:00:00',
                            'paidBreakMinutes': 0,
                            'unpaidBreakMinutes': 0,
                            'note': note}]},
                        {'Idempotency-Key': str(uuid.uuid4()), 'If-Match': etag})
    print('batch', st, batch if st != 200 else len(batch.get('assignments') or []))
    if st != 200:
        return None

    st, val, _ = call('POST', '/workforce/stores/%d/schedules/%s/validate' % (STORE, rev), mt, {},
                      {'Idempotency-Key': str(uuid.uuid4())})
    print('validate', st, val if st != 200 else val.get('outcome', val))
    if st != 200:
        return None

    st, pub, _ = call('POST', '/workforce/stores/%d/schedules/%s/publish' % (STORE, rev), mt, {},
                      {'Idempotency-Key': str(uuid.uuid4())})
    print('publish', st, pub if st != 200 else pub['schedulePublicationId'])
    if st != 200:
        return None
    return pub['schedulePublicationId']


if __name__ == '__main__':
    mt = token('mgr')
    weeks = [('2026-08-24', '2026-08-31', 'week A'), ('2026-08-31', '2026-09-07', 'week B')]
    out = []
    for s, e, n in weeks:
        print('--- publishing', s, '->', e)
        pid = publish_week(mt, s, e, n)
        out.append({'rangeStart': s, 'rangeEnd': e, 'publicationId': pid})
    print(json.dumps(out, indent=2))
