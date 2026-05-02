const http = require('http');

const options = {
  hostname: 'localhost',
  port: 9000,
  path: '/api/issues/search?componentKeys=deepskyn-backend&types=VULNERABILITY,BUG',
  headers: {
    'Authorization': 'Basic ' + Buffer.from('admin:admin').toString('base64')
  }
};

http.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(data);
      console.log(JSON.stringify(parsedData.issues.map(i => ({
        message: i.message,
        component: i.component,
        line: i.line,
        type: i.type,
        rule: i.rule
      })), null, 2));
    } catch (e) {
      console.error('Error parsing JSON:', e.message);
      console.log('Raw data:', data);
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
