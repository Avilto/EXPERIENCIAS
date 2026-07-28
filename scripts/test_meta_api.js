const https = require('https');

const token = 'EAAMSsARWyVcBSKNQ0WdN6HR64t9XTMTQtiNBLwesxZCIP1ZAHMa5MDM3x1eYkHUs7fTIwaQLgsMUKb4n0r1te2yOp6jhucKe4cIjXg3SET7bMYibtZBLiUMcFnWJoWTULm4Vg2qIuOB205K1iyNvIYhseNrGnpuIRPIb7QqLvCAVuuZCpbAHiSOLUkRM6UWugHjgZA8HnrBsystv33FAUeXet5LeRRjzMZCYnXOQZDZD';
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
