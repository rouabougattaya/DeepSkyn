const http = require('http');

const data = JSON.stringify({
  email: 'ahlmbenmansour@gmail.com',
  password: 'rouaaarrrrrrrrrrrrrrrr'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => {
    const json = JSON.parse(body);
    console.log('Login Response:', json);
    if (json.accessToken) {
      const updateData = JSON.stringify({ forceRegenerate: true });
      const updateReq = http.request({
        hostname: 'localhost',
        port: 3001,
        path: '/api/routine/update',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': updateData.length,
          'Authorization': `Bearer ${json.accessToken}`
        }
      }, updateRes => {
        let uBody = '';
        updateRes.on('data', d => { uBody += d; });
        updateRes.on('end', () => {
          console.log('Update Routine Response:', uBody);
        });
      });
      updateReq.write(updateData);
      updateReq.end();
    }
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
