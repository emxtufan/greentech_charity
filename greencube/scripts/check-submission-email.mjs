import assert from 'node:assert/strict';

import {createSubmissionMessage} from '../api/_mailer.js';

const application = {
  type: 'contact',
  sourcePage: 'https://greentechcharity.ro/proiecte/',
  data: {
    name: 'Familia Exemplu',
    email: 'familie@example.ro',
    phone: '+40 700 000 000',
    subject: 'proiecte',
    message: 'Dorim sa aflam care sunt urmatorii pasi pentru evaluarea unei solicitari.',
    consent: true,
    consent_at: '2026-09-04T10:30:00.000Z',
    consent_version: '2026-08-27'
  }
};

const saved = {
  id: 'example-id',
  reference: 'GT-260904-EXAMPLE',
  created_at: '2026-09-04T10:30:00.000Z'
};

const config = {
  fromName: 'GREENTECH Charity',
  fromEmail: 'aigreentech1@gmail.com',
  recipients: ['aigreentech1@gmail.com']
};

const message = createSubmissionMessage(application, saved, config);

assert.match(message.subject, /Contact/);
assert.match(message.subject, /GT-260904-EXAMPLE/);
assert.equal(message.replyTo, 'familie@example.ro');
assert.deepEqual(message.to, ['aigreentech1@gmail.com']);
assert.match(message.html, /GREENTECH CHARITY/);
assert.match(message.html, /Raspunde solicitantului/);
assert.match(message.html, /Familia Exemplu/);
assert.match(message.text, /Directia solicitarii: Sprijin pentru o familie/);
assert.doesNotMatch(message.html, /undefined|null/);

const unsafeApplication = {
  ...application,
  data: {...application.data, name: '<img src=x onerror=alert(1)>'}
};
const escapedMessage = createSubmissionMessage(unsafeApplication, saved, config);
assert.doesNotMatch(escapedMessage.html, /<img src=x/);
assert.match(escapedMessage.html, /&lt;img src=x onerror=alert\(1\)&gt;/);

console.log('[email-template] Template HTML si text validate.');
