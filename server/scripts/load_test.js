const http = require('http');

const url = 'http://localhost:3000/'; // Check rate limit on home

let success = 0;
let rateLimited = 0;
let errors = 0;

console.log('Starting stress test: 200 requests in 2 seconds...');

for (let i = 0; i < 200; i++) {
    http.get(url, (res) => {
        if (res.statusCode === 200) {
            success++;
        } else if (res.statusCode === 429) {
            rateLimited++;
        } else {
            errors++;
        }
    }).on('error', (e) => {
        errors++;
    });
}

setTimeout(() => {
    console.log(`Results:`);
    console.log(`- Success (200): ${success}`);
    console.log(`- Rate Limited (429): ${rateLimited}`);
    console.log(`- Errors: ${errors}`);
    
    if (rateLimited > 0 && success <= 150) {
        console.log('✅ Audit Load Test SUCCESS: Rate Limiting is perfectly working!');
    } else {
        console.log('❌ Audit Load Test FAILED: Rate Limiting did not block excess traffic.');
    }
}, 2000);
