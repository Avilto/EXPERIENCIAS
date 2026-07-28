const https = require('https');

const token = 'EAAMSsARWyVcBSDQOGvnZBfryWhOesY6FZAZA5XMtccj5swGlJfawVo4HEKdOlklrxC1ZAzJzyWhkW53vkDWFx6c7jo9sy9ZAnsX3XIJFghw9iM8bH3Qv10Fd8j4uT7G8sZAk9CgzgcdymxVsBaM2PBOXQXtFyfRQy2BUFJeQZAlyQdn8mEWgVaoF7KB3ozp9N6VCAaJ0xAxN7aZBvZC2vmgObsGZCV2ZCxl8W3ZCyZBBtG25HiGLK9sScNwHaW8yaJW6KpjP1ZBihsSrQlgAuEnNzE1nleehx0';
const phone = '51968027195';
const phoneNumberId = '1258054830720471';

const data = JSON.stringify({
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to: phone,
  type: 'template',
  template: {
    name: 'hello_world',
    language: { code: 'en_US' }
  }
});

const options = {
  hostname: 'graph.facebook.com',
  path: `/v25.0/${phoneNumberId}/messages`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('STATUS CODE:', res.statusCode);
    console.log('RESPONSE BODY:', body);
  });
});

req.on('error', error => {
  console.error('ERROR:', error);
});

req.write(data);
req.end();
