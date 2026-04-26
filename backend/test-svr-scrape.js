const https = require('https');
const fs = require('fs');

https.get('https://tn.svr.com/products.json?limit=250', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log(`Found ${json.products.length} products on tn.svr.com.`);
            const sample = json.products[0];
            console.log('Sample Name:', sample.title);
            console.log('Sample Type:', sample.product_type);
            console.log('Sample Price:', sample.variants[0].price);
            console.log('Sample Image:', sample.images[0]?.src);
        } catch (e) {
            console.error('Error parsing JSON', e);
        }
    });
}).on('error', err => console.error(err));
