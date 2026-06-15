/**
 * zimbra-mock-server/server.js
 * ─────────────────────────────────────────────────────────────
 * Test server emulating the Zimbra SOAP API for the
 * ZimbraMailNotifier plugin.
 *
 * Uses only native Node.js modules (http, crypto, url).
 * No npm dependencies required.
 *
 * Usage:
 *   node server.js
 *   LOG_LEVEL=verbose node server.js    # detailed payload logs
 *   PORT=8080 node server.js            # custom port
 *
 * Configure the plugin with:
 *   Server URL   : http://localhost:3000
 *   Interface URL: http://localhost:3000/zimbra
 *   Login        : user@test.local  (or see USERS below)
 *   Password     : password         (or see USERS below)
 */

'use strict';

const http = require('http');
const crypto = require('crypto');
const url = require('url');

// ─── Configuration ─────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '3000', 10);
const VERBOSE = (process.env.LOG_LEVEL ?? '') === 'verbose';
const SOAP_PATH = '/service/soap/';

// ─── Test accounts ───────────────────────────────────────────
const USERS = {
    'user@test.local': {
        password: 'password',
        displayName: 'Alice Dupont',
        quotaUsed: 42 * 1024 * 1024, // 42 MB
        quotaLimit: 1024 * 1024 * 1024, // 1 GB
    },
    'admin@test.local': {
        password: 'admin123',
        displayName: 'Bob Martin',
        quotaUsed: 1200 * 1024 * 1024,
        quotaLimit: 2 * 1024 * 1024 * 1024,
    },
    'twofa@test.local': {
        password: 'password',
        displayName: 'Charlie 2FA',
        require2FA: true,
        twoFACode: '123456',
        quotaUsed: 5 * 1024 * 1024,
        quotaLimit: 512 * 1024 * 1024,
    },
};

// ─── In-memory state ───────────────────────────────────────────
const sessions = new Map(); // token → { email, expires, partial2FA }
const waitSets = new Map(); // waitSetId → { email, seq, pendingEvents }
let waitSetCounter = 1;

// ─── Dynamic test data ────────────────────────────────
const testData = {
    messages: [
        {
            id: 'msg-001',
            su: 'Bienvenue sur le serveur de test',
            e: [{t: 'f', a: 'sender@example.com', p: 'Jean Sender'}],
            d: Date.now() - 5 * 60_000,
            fr: 'Ceci est un message de test pour le plugin ZimbraMailNotifier.',
            l: '2',
            cid: 'conv-001',
        },
        {
            id: 'msg-002',
            su: 'Réunion importante demain',
            e: [{t: 'f', a: 'boss@company.com', p: 'Marie Boss'}],
            d: Date.now() - 30 * 60_000,
            fr: "N'oubliez pas la réunion de projet à 10h00 en salle A.",
            l: '2',
            cid: 'conv-002',
        },
        {
            id: 'msg-003',
            su: '[URGENT] Mise à jour requise',
            e: [],
            d: Date.now() - 2 * 3600_000,
            fr: 'Veuillez mettre à jour votre mot de passe avant vendredi.',
            l: '2',
            cid: 'conv-003',
        },
    ],

    appointments: [
        {
            id: 'appt-001',
            name: 'Réunion de projet',
            dur: 3600_000,
            loc: 'Salle de conférence A',
            inst: [{s: Date.now() + 60 * 60_000}], // in 1h
        },
        {
            id: 'appt-002',
            name: "Déjeuner d'équipe",
            dur: 5400_000,
            loc: 'Restaurant Le Bistro',
            inst: [{s: Date.now() + 3 * 3600_000}], // in 3h
        },
        {
            id: 'appt-003',
            name: 'Présentation client',
            dur: 7200_000,
            loc: 'Salle Panorama',
            inst: [{s: Date.now() + 24 * 3600_000}], // tomorrow
        },
        {
            id: 'appt-004',
            name: 'Formation TypeScript',
            dur: 86_400_000,
            loc: 'En ligne',
            allDay: true,
            inst: [{s: Date.now() + 2 * 86_400_000, allDay: true}], // day after tomorrow
        },
    ],

    tasks: [
        {
            id: 'task-001',
            name: 'Réviser le rapport annuel',
            priority: '1',
            percentComplete: 30,
        },
        {
            id: 'task-002',
            name: 'Préparer la présentation Q2',
            priority: '5',
            percentComplete: 75,
        },
        {
            id: 'task-003',
            name: 'Mettre à jour la documentation',
            priority: '9',
            percentComplete: 0,
        },
    ],
    drafts: [
        {
            id: 'draft-001',
            su: 'Proposition de partenariat',
            e: [{t: 't', a: 'partner@company.com', p: 'Sophie Partenaire'}],
            d: Date.now() - 10 * 60_000,
            fr: "Bonjour, suite à notre échange de la semaine dernière, je souhaitais vous proposer...",
            l: '6', // folder 6 = Drafts
            cid: 'conv-draft-001',
        },
        {
            id: 'draft-002',
            su: 'Compte-rendu réunion du 12/06',
            e: [
                {t: 't', a: 'alice@company.com', p: 'Alice Martin'},
                {t: 't', a: 'bob@company.com', p: 'Bob Dupont'},
            ],
            d: Date.now() - 3 * 3600_000,
            fr: "Voici le compte-rendu de notre réunion de mardi dernier...",
            l: '6',
            cid: 'conv-draft-002',
        },
        {
            id: 'draft-003',
            su: '',
            e: [],
            d: Date.now() - 24 * 3600_000,
            fr: "Idée pour le prochain sprint : améliorer la gestion des erreurs réseau...",
            l: '6',
            cid: 'conv-draft-003',
        },
    ],
};

// ─── Logger ────────────────────────────────────────────────────
const log = {
    info: (...a) => console.log(`\x1b[36m[INFO]\x1b[0m`, ...a),
    ok: (...a) => console.log(`\x1b[32m[OK]\x1b[0m  `, ...a),
    warn: (...a) => console.log(`\x1b[33m[WARN]\x1b[0m`, ...a),
    error: (...a) => console.log(`\x1b[31m[ERR]\x1b[0m `, ...a),
    debug: (...a) => VERBOSE && console.log(`\x1b[90m[DBG]\x1b[0m `, ...a),
};

// ─── Helpers ───────────────────────────────────────────────────
function genToken() {
    return crypto.randomBytes(24).toString('hex');
}

function genWaitSetId() {
    return `ws-${waitSetCounter++}`;
}

function getSession(token) {
    if (!token) return null;
    const s = sessions.get(token);
    if (!s) return null;
    if (s.expires < Date.now()) {
        sessions.delete(token);
        return null;
    }
    return s;
}

function soapFault(code, reason) {
    return {
        Header: {},
        Body: {
            Fault: {
                Code: {Value: 'soap:Sender'},
                Reason: {Text: reason},
                Detail: {Error: {Code: code, Trace: 'zimbra-mock'}},
            },
        },
    };
}

function soapOk(responseKey, data) {
    return {
        Header: {context: {}},
        Body: {[responseKey]: {_jsns: 'urn:zimbraAccount', ...data}},
    };
}

// ─── Handlers SOAP ─────────────────────────────────────────────

function handleAuth(body) {
    const req = body.Body?.AuthRequest ?? body.Body?.['ns1:AuthRequest'];
    if (!req) return [400, soapFault('service.INVALID_REQUEST', 'Missing AuthRequest')];

    const email = req.account?._content ?? req.account;
    const password = req.password?._content ?? req.password;
    const tfaCode = req.twoFactorCode?._content;

    const user = USERS[email];
    if (!user) {
        log.warn(`Auth failed — unknown user: ${email}`);
        return [200, soapFault('account.NO_SUCH_ACCOUNT', `No such account: ${email}`)];
    }

    // 2FA case — phase 2
    if (tfaCode) {
        // Find a partial session for this email
        let partial = null;
        for (const [tok, sess] of sessions) {
            if (sess.email === email && sess.partial2FA) {
                partial = tok;
                break;
            }
        }
        if (!partial) return [200, soapFault('account.AUTH_FAILED', '2FA session expired')];
        if (tfaCode !== user.twoFACode) {
            log.warn(`2FA failed for ${email}: code=${tfaCode}`);
            return [200, soapFault('account.TWO_FACTOR_AUTH_FAILED', 'Invalid 2FA code')];
        }
        // Validate the partial session
        const sess = sessions.get(partial);
        sess.partial2FA = false;
        log.ok(`2FA validated for ${email}`);
        return [
            200,
            soapOk('AuthResponse', {
                authToken: [{_content: partial}],
                lifetime: 3_600_000,
                trustedToken: genToken(),
                deviceId: crypto.randomBytes(8).toString('hex'),
            }),
        ];
    }

    // Normal case
    if (user.password !== password) {
        log.warn(`Auth failed — wrong password for: ${email}`);
        return [200, soapFault('account.AUTH_FAILED', 'Invalid credentials')];
    }

    const token = genToken();
    sessions.set(token, {
        email,
        expires: Date.now() + 3_600_000,
        partial2FA: false,
    });
    log.ok(`Authenticated: ${email} → token ${token.substring(0, 8)}…`);

    // Trigger 2FA if required
    if (user.require2FA) {
        sessions.get(token).partial2FA = true;
        log.info(`2FA required for ${email} (code: ${user.twoFACode})`);
        return [
            200,
            soapOk('AuthResponse', {
                authToken: [{_content: token}],
                lifetime: 3_600_000,
                twoFactorAuthRequired: {_content: 'true'},
                deviceId: crypto.randomBytes(8).toString('hex'),
            }),
        ];
    }

    return [
        200,
        soapOk('AuthResponse', {
            authToken: [{_content: token}],
            lifetime: 3_600_000,
            trustedToken: genToken(),
            deviceId: crypto.randomBytes(8).toString('hex'),
        }),
    ];
}

function handleGetInfo(authToken) {
    const sess = getSession(authToken);
    if (!sess) return [200, soapFault('service.AUTH_REQUIRED', 'Auth required')];

    const user = USERS[sess.email];
    log.info(`GetInfo for ${sess.email}`);
    return [
        200,
        soapOk('GetInfoResponse', {
            id: crypto.randomBytes(8).toString('hex'),
            name: sess.email,
            displayName: user.displayName,
            used: user.quotaUsed,
            limit: user.quotaLimit,
        }),
    ];
}

function handleSearch(authToken, req) {
    const sess = getSession(authToken);
    if (!sess) return [200, soapFault('service.AUTH_REQUIRED', 'Auth required')];

    const types = req.types ?? '';
    const limit = parseInt(req.limit ?? '10', 10);
    const sortBy = req.sortBy ?? '';
    log.info(`Search for ${sess.email} — types="${types}" sortBy="${sortBy}" limit=${limit}`);

    if (types === 'message') {
        const query = (req.query ?? '').trim().toLowerCase();
        if (query.includes('in:drafts')) {
            log.info(`  → returning drafts`);
            return [
                200,
                soapOk('SearchResponse', {
                    _jsns: 'urn:zimbraMail',
                    m: testData.drafts.slice(0, limit),
                }),
            ];
        }
        // default: unread messages (in:inbox is:unread)
        log.info(`  → returning unread messages`);
        return [
            200,
            soapOk('SearchResponse', {
                _jsns: 'urn:zimbraMail',
                m: testData.messages.slice(0, limit),
            }),
        ];
    }

    if (types === 'appointment') {
        const start = parseInt(req.calExpandInstStart ?? '0', 10);
        const end = parseInt(req.calExpandInstEnd ?? '0', 10);
        const appts = testData.appointments
            .filter((a) => {
                const s = a.inst[0]?.s ?? 0;
                return s >= start && s <= end;
            })
            .slice(0, limit);
        return [
            200,
            soapOk('SearchResponse', {
                _jsns: 'urn:zimbraMail',
                appt: appts,
            }),
        ];
    }

    if (types === 'task') {
        return [
            200,
            soapOk('SearchResponse', {
                _jsns: 'urn:zimbraMail',
                task: testData.tasks.slice(0, limit),
            }),
        ];
    }

    return [200, soapOk('SearchResponse', {_jsns: 'urn:zimbraMail'})];
}

function handleCreateWaitSet(authToken, req) {
    const sess = getSession(authToken);
    if (!sess) return [200, soapFault('service.AUTH_REQUIRED', 'Auth required')];

    const wsId = genWaitSetId();
    waitSets.set(wsId, {email: sess.email, seq: 0, pendingEvents: []});
    log.info(`WaitSet created: ${wsId} for ${sess.email}`);

    return [
        200,
        soapOk('CreateWaitSetResponse', {
            _jsns: 'urn:zimbraMail',
            waitSet: wsId,
            seq: 0,
        }),
    ];
}

function handleWaitSet(authToken, req) {
    const sess = getSession(authToken);
    if (!sess) return [500, soapFault('service.AUTH_REQUIRED', 'Auth required')];

    const wsId = req.waitSet;
    const block = req.block === '1';

    if (!waitSets.has(wsId)) {
        log.warn(`WaitSet not found: ${wsId}`);
        return [500, soapFault('mail.NO_SUCH_WAITSET', `No such waitset: ${wsId}`)];
    }

    const ws = waitSets.get(wsId);
    ws.seq += 1;

    // Simulate an event after a few seconds when block=true
    // Non-block mode: respond immediately without an event
    if (!block) {
        log.debug(`WaitSet ${wsId} — no-block, seq=${ws.seq}`);
        return [
            200,
            soapOk('WaitSetResponse', {
                _jsns: 'urn:zimbraMail',
                waitSet: wsId,
                seq: ws.seq,
            }),
        ];
    }

    // Block mode: simulate a 5s wait then return a random event
    log.info(`WaitSet ${wsId} — blocking (will resolve in 20s)`);
    return new Promise((resolve) => {
        setTimeout(() => {
            const hasEvent = Math.random() > 0.4; // 60% chance of an event
            ws.seq += 1;
            if (hasEvent) {
                log.info(`WaitSet ${wsId} — new event (seq=${ws.seq})`);
                resolve([
                    200,
                    soapOk('WaitSetResponse', {
                        _jsns: 'urn:zimbraMail',
                        waitSet: wsId,
                        seq: ws.seq,
                        a: [{id: crypto.randomBytes(4).toString('hex'), type: 'f'}],
                    }),
                ]);
            } else {
                log.debug(`WaitSet ${wsId} — no event (seq=${ws.seq})`);
                resolve([
                    200,
                    soapOk('WaitSetResponse', {
                        _jsns: 'urn:zimbraMail',
                        waitSet: wsId,
                        seq: ws.seq,
                    }),
                ]);
            }
        }, 20000);
    });
}

// ─── Dispatcher SOAP ───────────────────────────────────────────
async function dispatchSoap(rawBody, authToken) {
    let body;
    try {
        body = JSON.parse(rawBody);
    } catch (e) {
        return [400, soapFault('service.INVALID_REQUEST', 'Invalid JSON payload')];
    }

    log.debug('SOAP body:', JSON.stringify(body).substring(0, 200));

    const soapBody = body.Body ?? {};

    if (soapBody.AuthRequest) return handleAuth(body);
    if (soapBody.GetInfoRequest) return handleGetInfo(authToken);
    if (soapBody.SearchRequest) return handleSearch(authToken, soapBody.SearchRequest);
    if (soapBody.CreateWaitSetRequest)
        return handleCreateWaitSet(authToken, soapBody.CreateWaitSetRequest);
    if (soapBody.WaitSetRequest) return handleWaitSet(authToken, soapBody.WaitSetRequest);

    log.warn('Unknown SOAP action:', Object.keys(soapBody).join(', '));
    return [400, soapFault('service.UNKNOWN_DOCUMENT', 'Unknown request type')];
}

// ─── HTTP server ──────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    // CORS — accept all origins (Chrome extensions)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url ?? '/');
    const pathname = parsedUrl.pathname ?? '/';

    // ── Dashboard home page ─────────────────────────────────
    if (req.method === 'GET' && (pathname === '/' || pathname === '/zimbra')) {
        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
        res.end(dashboardHtml());
        return;
    }

    // ── Control API (add/remove test data) ───
    if (pathname.startsWith('/api/')) {
        await handleAdminApi(req, res, pathname);
        return;
    }

    // ── Endpoint SOAP ────────────────────────────────────────────
    if (pathname.startsWith(SOAP_PATH)) {
        if (req.method !== 'POST') {
            res.writeHead(405);
            res.end('Method Not Allowed');
            return;
        }

        let body = '';
        req.on('data', (chunk) => {
            body += chunk;
        });
        req.on('end', async () => {
            const authHeader = req.headers['authorization'] ?? '';
            let authToken =
                req.headers['x-zimbra-auth-token'] ??
                (body.includes('"authToken"') ? extractToken(body) : null);

            console.error(authToken);
            authToken = (authToken && authToken._content) || authToken || '';
            log.info(`${req.method} ${pathname} — token: ${authToken.substring(0, 8) ?? 'none'}…`);
            log.debug('Request body:', body.substring(0, 300));

            try {
                const result = await dispatchSoap(body, authToken);
                const [status, responseBody] = result;
                const json = JSON.stringify(responseBody);
                res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'});
                res.end(json);
                log.debug('Response:', json.substring(0, 200));
            } catch (err) {
                log.error('Handler error:', err);
                res.writeHead(500);
                res.end(JSON.stringify(soapFault('service.FAILURE', String(err))));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

// Extract token from JSON body (fallback)
function extractToken(body) {
    try {
        const parsed = JSON.parse(body);
        return parsed?.Header?.context?.authToken ?? null;
    } catch {
        return null;
    }
}

// ─── Admin API (test data control) ──────────────────
async function handleAdminApi(req, res, pathname) {
    res.setHeader('Content-Type', 'application/json');

    // GET /api/status — server state
    if (req.method === 'GET' && pathname === '/api/status') {
        res.writeHead(200);
        res.end(
            JSON.stringify(
                {
                    status: 'running',
                    sessions: sessions.size,
                    waitSets: waitSets.size,
                    users: Object.keys(USERS),
                    messages: testData.messages.length,
                    appointments: testData.appointments.length,
                    tasks: testData.tasks.length,
                },
                null,
                2,
            ),
        );
        return;
    }

    // POST /api/messages — add an unread message
    if (req.method === 'POST' && pathname === '/api/messages') {
        const body = await readBody(req);
        try {
            const msg = JSON.parse(body);
            const newMsg = {
                id: `msg-${Date.now()}`,
                su: msg.subject ?? 'Nouveau message de test',
                e: [{t: 'f', a: msg.from ?? 'test@example.com', p: msg.fromName ?? 'Test User'}],
                d: Date.now(),
                fr: msg.abstract ?? 'Contenu du message de test.',
                l: '2',
                cid: `conv-${Date.now()}`,
            };
            testData.messages.unshift(newMsg);
            // Notify active WaitSets
            for (const ws of waitSets.values()) ws.pendingEvents.push({type: 'message'});
            log.ok(`Added message: "${newMsg.su}"`);
            res.writeHead(201);
            res.end(JSON.stringify({success: true, id: newMsg.id}));
        } catch (e) {
            res.writeHead(400);
            res.end(JSON.stringify({error: String(e)}));
        }
        return;
    }

    // DELETE /api/messages — clear messages
    if (req.method === 'DELETE' && pathname === '/api/messages') {
        testData.messages = [];
        log.ok('Messages cleared');
        res.writeHead(200);
        res.end(JSON.stringify({success: true}));
        return;
    }

    // POST /api/appointments — add an appointment
    if (req.method === 'POST' && pathname === '/api/appointments') {
        const body = await readBody(req);
        try {
            const appt = JSON.parse(body);
            const start =
                appt.startOffset != null
                    ? Date.now() + appt.startOffset * 60_000
                    : Date.now() + 30 * 60_000;
            const newAppt = {
                id: `appt-${Date.now()}`,
                name: appt.name ?? 'Nouveau rendez-vous',
                dur: (appt.durationMin ?? 60) * 60_000,
                loc: appt.location ?? '',
                inst: [{s: start}],
            };
            testData.appointments.push(newAppt);
            log.ok(`Added appointment: "${newAppt.name}" in ${appt.startOffset ?? 30}min`);
            res.writeHead(201);
            res.end(JSON.stringify({success: true, id: newAppt.id}));
        } catch (e) {
            res.writeHead(400);
            res.end(JSON.stringify({error: String(e)}));
        }
        return;
    }

    // DELETE /api/appointments — clear appointments
    if (req.method === 'DELETE' && pathname === '/api/appointments') {
        testData.appointments = [];
        log.ok('Appointments cleared');
        res.writeHead(200);
        res.end(JSON.stringify({success: true}));
        return;
    }

    // POST /api/tasks — add a task
    if (req.method === 'POST' && pathname === '/api/tasks') {
        const body = await readBody(req);
        try {
            const task = JSON.parse(body);
            const newTask = {
                id: `task-${Date.now()}`,
                name: task.name ?? 'Nouvelle tâche',
                priority: String(task.priority ?? '5'),
                percentComplete: task.percentComplete ?? 0,
            };
            testData.tasks.push(newTask);
            log.ok(`Added task: "${newTask.name}"`);
            res.writeHead(201);
            res.end(JSON.stringify({success: true, id: newTask.id}));
        } catch (e) {
            res.writeHead(400);
            res.end(JSON.stringify({error: String(e)}));
        }
        return;
    }

    // DELETE /api/tasks — clear tasks
    if (req.method === 'DELETE' && pathname === '/api/tasks') {
        testData.tasks = [];
        log.ok('Tasks cleared');
        res.writeHead(200);
        res.end(JSON.stringify({success: true}));
        return;
    }

    // POST /api/drafts — add an draft message
    if (req.method === 'POST' && pathname === '/api/drafts') {
        const body = await readBody(req);
        try {
            const msg = JSON.parse(body);
            const newDraftMsg = {
                id: `draft-${Date.now()}`,
                su: msg.subject ?? '',
                e: [{ t: 't', a: msg.to ?? '', p: msg.toName ?? '' }],
                d: Date.now(),
                fr: msg.abstract ?? '',
                l: '6',
                cid: `conv-${Date.now()}`,
            };
            testData.drafts.unshift(newDraftMsg);
            // Notify active WaitSets
            for (const ws of waitSets.values()) ws.pendingEvents.push({ type: 'drafts' });
            log.ok(`Added draft: "${newDraftMsg.su}"`);
            res.writeHead(201);
            res.end(JSON.stringify({ success: true, id: newDraftMsg.id }));
        } catch (e) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: String(e) }));
        }
        return;
    }

    // DELETE /api/drafts — clear messages
    if (req.method === 'DELETE' && pathname === '/api/drafts') {
        testData.drafts = [];
        log.ok('Drafts cleared');
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // POST /api/reset — reset data to defaults
    if (req.method === 'POST' && pathname === '/api/reset') {
        resetData();
        res.writeHead(200);
        res.end(JSON.stringify({success: true, message: 'Data reset to defaults'}));
        return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({error: 'Unknown API endpoint'}));
}

function readBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', (c) => {
            body += c;
        });
        req.on('end', () => resolve(body));
    });
}

// ─── Data reset ────────────────────────────────────────
function resetData() {
    testData.messages = [];
    testData.appointments = [];
    testData.tasks = [];
    testData.drafts = [];
    sessions.clear();
    waitSets.clear();
    log.ok('Data reset');
}

// ─── Dashboard HTML ────────────────────────────────────────────
function dashboardHtml() {
    const now = new Date().toLocaleString('fr-FR');
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Zimbra Mock Server</title>
  <style>
    :root {
      --bg: #0f1117; --surface: #1a1d27; --surface2: #22263a;
      --border: #2e3348; --text: #e2e4f0; --muted: #7c8099;
      --primary: #4f7ef8; --green: #34d399; --yellow: #fbbf24;
      --red: #f87171; --purple: #a78bfa; --radius: 10px;
      --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--font); background: var(--bg); color: var(--text);
           min-height: 100vh; padding: 24px; font-size: 14px; }
    h1   { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    h2   { font-size: 14px; font-weight: 700; letter-spacing: .06em;
           text-transform: uppercase; color: var(--muted); margin-bottom: 12px; }
    .subtitle { color: var(--muted); font-size: 13px; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 16px; margin-bottom: 24px; }
    .card { background: var(--surface); border: 1px solid var(--border);
            border-radius: var(--radius); padding: 18px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 20px;
             font-size: 11px; font-weight: 700; }
    .badge-green  { background: rgba(52,211,153,.15); color: var(--green); }
    .badge-yellow { background: rgba(251,191,36,.15);  color: var(--yellow); }
    .badge-red    { background: rgba(248,113,113,.15); color: var(--red); }
    .user-row { display: flex; align-items: center; justify-content: space-between;
                padding: 8px 10px; border-radius: 6px; margin-bottom: 6px;
                background: var(--surface2); }
    .user-email { font-weight: 600; font-size: 13px; }
    .user-pass  { font-family: monospace; font-size: 12px; color: var(--muted); }
    .endpoint { font-family: monospace; font-size: 13px; padding: 10px 12px;
                background: var(--surface2); border-radius: 6px;
                color: var(--primary); word-break: break-all; }
    .copy-btn { padding: 4px 10px; border-radius: 6px; border: none;
                background: var(--primary); color: #fff; font-size: 11px;
                font-weight: 700; cursor: pointer; margin-left: 8px; }
    .copy-btn:hover { filter: brightness(1.1); }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .btn { padding: 8px 14px; border-radius: 8px; border: none; cursor: pointer;
           font-size: 12.5px; font-weight: 600; transition: filter .15s; }
    .btn:hover { filter: brightness(1.1); }
    .btn-blue   { background: var(--primary); color: #fff; }
    .btn-green  { background: var(--green);   color: #0d1117; }
    .btn-red    { background: var(--red);     color: #0d1117; }
    .btn-yellow { background: var(--yellow);  color: #0d1117; }
    .status-bar { display: flex; gap: 16px; padding: 12px 16px;
                  background: var(--surface); border: 1px solid var(--border);
                  border-radius: var(--radius); margin-bottom: 20px; flex-wrap: wrap; }
    .stat { display: flex; flex-direction: column; gap: 2px; }
    .stat-val { font-size: 22px; font-weight: 800; color: var(--primary); }
    .stat-lbl { font-size: 11px; color: var(--muted); text-transform: uppercase;
                letter-spacing: .06em; }
    #log { font-family: monospace; font-size: 12px; background: #0a0c13;
           border: 1px solid var(--border); border-radius: var(--radius);
           padding: 12px; height: 160px; overflow-y: auto; color: #9fa8c0; }
    #log .ok    { color: var(--green); }
    #log .warn  { color: var(--yellow); }
    #log .error { color: var(--red); }
    input[type="text"], input[type="number"] {
      padding: 7px 10px; border: 1px solid var(--border); border-radius: 6px;
      background: var(--surface2); color: var(--text); font-size: 13px;
      width: 100%; margin-top: 4px; margin-bottom: 8px; outline: none;
    }
    input:focus { border-color: var(--primary); }
    label { font-size: 12px; color: var(--muted); display: block; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    footer { margin-top: 32px; text-align: center; color: var(--muted); font-size: 12px; }
  </style>
</head>
<body>
  <h1>🔧 Zimbra Mock Server</h1>
  <p class="subtitle">Serveur de test pour le plugin ZimbraMailNotifier — démarré le ${now}</p>

  <div class="status-bar" id="status-bar">
    <div class="stat"><div class="stat-val" id="stat-sessions">-</div><div class="stat-lbl">Sessions</div></div>
    <div class="stat"><div class="stat-val" id="stat-messages">-</div><div class="stat-lbl">Messages</div></div>
    <div class="stat"><div class="stat-val" id="stat-appts">-</div><div class="stat-lbl">Rendez-vous</div></div>
    <div class="stat"><div class="stat-val" id="stat-tasks">-</div><div class="stat-lbl">Tâches</div></div>
    <div class="stat"><div class="stat-val" id="stat-drafts">-</div><div class="stat-lbl">Brouillons</div></div>
    <div class="stat"><div class="stat-val" id="stat-waitsets">-</div><div class="stat-lbl">WaitSets</div></div>
  </div>

  <div class="grid">

    <!-- Plugin connection -->
    <div class="card">
      <h2>Configuration du plugin</h2>
      <label>URL Serveur Zimbra</label>
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px">
        <div class="endpoint" id="server-url">http://localhost:${PORT}</div>
        <button class="copy-btn" onclick="copy('http://localhost:${PORT}')">Copier</button>
      </div>
      <label>URL Interface Web</label>
      <div style="display:flex; align-items:center; gap:8px">
        <div class="endpoint">http://localhost:${PORT}/zimbra</div>
        <button class="copy-btn" onclick="copy('http://localhost:${PORT}/zimbra')">Copier</button>
      </div>
    </div>

    <!-- Test accounts -->
    <div class="card">
      <h2>Comptes de test</h2>
      <div class="user-row">
        <div><div class="user-email">user@test.local</div><div class="user-pass">password</div></div>
        <span class="badge badge-green">Normal</span>
      </div>
      <div class="user-row">
        <div><div class="user-email">admin@test.local</div><div class="user-pass">admin123</div></div>
        <span class="badge badge-yellow">Normal</span>
      </div>
      <div class="user-row">
        <div><div class="user-email">twofa@test.local</div><div class="user-pass">password</div></div>
        <span class="badge badge-red">2FA: 123456</span>
      </div>
    </div>

    <!-- Add a message -->
    <div class="card">
      <h2>Ajouter un message non lu</h2>
      <label>Sujet</label>
      <input type="text" id="msg-subject" value="Nouveau message de test" />
      <label>Expéditeur (email)</label>
      <input type="text" id="msg-from" value="test@example.com" />
      <label>Nom expéditeur</label>
      <input type="text" id="msg-name" value="Test Sender" />
      <label>Extrait</label>
      <input type="text" id="msg-abstract" value="Contenu du message de test." />
      <div class="actions">
        <button class="btn btn-green" onclick="addMessage()">+ Ajouter</button>
        <button class="btn btn-red" onclick="clearMessages()">🗑 Vider</button>
      </div>
    </div>

    <!-- Add an appointment -->
    <div class="card">
      <h2>Ajouter un rendez-vous</h2>
      <label>Titre</label>
      <input type="text" id="appt-name" value="Réunion de test" />
      <div class="form-row">
        <div>
          <label>Dans X minutes</label>
          <input type="number" id="appt-start" value="30" min="1" />
        </div>
        <div>
          <label>Durée (minutes)</label>
          <input type="number" id="appt-dur" value="60" min="5" />
        </div>
      </div>
      <label>Lieu</label>
      <input type="text" id="appt-loc" value="Salle de test" />
      <div class="actions">
        <button class="btn btn-green" onclick="addAppointment()">+ Ajouter</button>
        <button class="btn btn-red" onclick="clearAppointments()">🗑 Vider</button>
      </div>
    </div>

    <!-- Add a task -->
    <div class="card">
      <h2>Ajouter une tâche</h2>
      <label>Nom</label>
      <input type="text" id="task-name" value="Tâche de test" />
      <div class="form-row">
        <div>
          <label>Priorité (1=haute, 5=norm, 9=basse)</label>
          <input type="number" id="task-priority" value="5" min="1" max="9" />
        </div>
        <div>
          <label>Progression (%)</label>
          <input type="number" id="task-pct" value="0" min="0" max="100" />
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-green" onclick="addTask()">+ Ajouter</button>
        <button class="btn btn-red" onclick="clearTasks()">🗑 Vider</button>
      </div>
    </div>

    <!-- Add a draft -->
     <div class="card">
      <h2>Ajouter un brouillon</h2>
      <label>Sujet</label>
      <input type="text" id="draft-subject" value="Nouveau message de test" />
      <label>Destinataire (email)</label>
      <input type="text" id="draft-to" value="test@example.com" />
      <label>Nom destinataire</label>
      <input type="text" id="draft-name" value="Test Receiver" />
      <label>Extrait</label>
      <input type="text" id="draft-abstract" value="Contenu du message de test." />
      <div class="actions">
        <button class="btn btn-green" onclick="addDraft()">+ Ajouter</button>
        <button class="btn btn-red" onclick="clearDrafts()">🗑 Vider</button>
      </div>
    </div>

    <!-- Global actions -->
    <div class="card">
      <h2>Actions globales</h2>
      <div class="actions" style="margin-bottom:16px">
        <button class="btn btn-red" onclick="resetData()">🔄 Reset données</button>
        <button class="btn btn-blue" onclick="refreshStatus()">↻ Rafraîchir</button>
      </div>
      <h2>Log en direct</h2>
      <div id="log"><span class="ok">Serveur démarré sur http://localhost:${PORT}</span></div>
    </div>

  </div>

  <footer>Zimbra Mock Server — pour tests uniquement — ZimbraMailNotifier</footer>

<script>
  const BASE = 'http://localhost:${PORT}';

  async function api(method, path, body) {
    const r = await fetch(BASE + path, {
      method, headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return r.json();
  }

  async function refreshStatus() {
    const s = await api('GET', '/api/status');
    document.getElementById('stat-sessions').textContent = s.sessions;
    document.getElementById('stat-messages').textContent = s.messages;
    document.getElementById('stat-appts').textContent    = s.appointments;
    document.getElementById('stat-tasks').textContent    = s.tasks;
    document.getElementById('stat-waitsets').textContent = s.waitSets;
  }

  function logLine(msg, cls) {
    const el = document.getElementById('log');
    const line = document.createElement('div');
    line.className = cls ?? '';
    line.textContent = new Date().toLocaleTimeString('fr') + ' — ' + msg;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }

  async function addMessage() {
    const r = await api('POST', '/api/messages', {
      subject:  document.getElementById('msg-subject').value,
      from:     document.getElementById('msg-from').value,
      fromName: document.getElementById('msg-name').value,
      abstract: document.getElementById('msg-abstract').value,
    });
    logLine(r.success ? 'Message ajouté: ' + document.getElementById('msg-subject').value : 'Erreur', r.success ? 'ok' : 'error');
    refreshStatus();
  }

  async function clearMessages() {
    await api('DELETE', '/api/messages');
    logLine('Messages vidés', 'warn');
    refreshStatus();
  }

  async function addAppointment() {
    const r = await api('POST', '/api/appointments', {
      name:        document.getElementById('appt-name').value,
      startOffset: parseInt(document.getElementById('appt-start').value),
      durationMin: parseInt(document.getElementById('appt-dur').value),
      location:    document.getElementById('appt-loc').value,
    });
    logLine(r.success ? 'RDV ajouté: ' + document.getElementById('appt-name').value : 'Erreur', r.success ? 'ok' : 'error');
    refreshStatus();
  }

  async function clearAppointments() {
    await api('DELETE', '/api/appointments');
    logLine('Evenements vidés', 'warn');
    refreshStatus();
  }

  async function addTask() {
    const r = await api('POST', '/api/tasks', {
      name:            document.getElementById('task-name').value,
      priority:        parseInt(document.getElementById('task-priority').value),
      percentComplete: parseInt(document.getElementById('task-pct').value),
    });
    logLine(r.success ? 'Tâche ajoutée: ' + document.getElementById('task-name').value : 'Erreur', r.success ? 'ok' : 'error');
    refreshStatus();
  }

  async function clearTasks() {
    await api('DELETE', '/api/tasks');
    logLine('Tâches vidés', 'warn');
    refreshStatus();
  }

    async function addDraft() {
    const r = await api('POST', '/api/drafts', {
      subject:  document.getElementById('draft-subject').value,
      to:     document.getElementById('draft-to').value,
      toName: document.getElementById('draft-name').value,
      abstract: document.getElementById('draft-abstract').value,
    });
    logLine(r.success ? 'Brouillon ajouté: ' + document.getElementById('draft-subject').value : 'Erreur', r.success ? 'ok' : 'error');
    refreshStatus();
  }

  async function clearDrafts() {
    await api('DELETE', '/api/drafts');
    logLine('Brouillons vidés', 'warn');
    refreshStatus();
  }

  async function resetData() {
    await api('POST', '/api/reset');
    logLine('Données réinitialisées', 'warn');
    refreshStatus();
  }

  function copy(text) {
    navigator.clipboard.writeText(text).then(() => logLine('Copié: ' + text, 'ok'));
  }

  // Auto-refresh every 5s
  refreshStatus();
  setInterval(refreshStatus, 5000);
</script>
</body>
</html>`;
}

// ─── Startup ─────────────────────────────────────────────────
server.listen(PORT, () => {
    log.ok(`Zimbra Mock Server démarré sur http://localhost:${PORT}`);
    log.info(`Dashboard  → http://localhost:${PORT}/`);
    log.info(`SOAP API   → http://localhost:${PORT}${SOAP_PATH}`);
    log.info('');
    log.info('Comptes de test :');
    Object.entries(USERS).forEach(([email, u]) => {
        const flag = u.require2FA ? ` [2FA: ${u.twoFACode}]` : '';
        log.info(`  ${email} / ${u.password}${flag}`);
    });
    log.info('');
    log.info("Variables d'environnement :");
    log.info('  PORT=3000          Changer le port');
    log.info('  LOG_LEVEL=verbose  Afficher les payloads complets');
});

server.on('error', (err) => {
    log.error('Server error:', err.message);
    if (err.code === 'EADDRINUSE') {
        log.error(`Port ${PORT} déjà utilisé — essayez PORT=3001 node server.js`);
    }
    process.exit(1);
});
