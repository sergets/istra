module.exports = (login, passwd) => new Promise((resolve, reject) => {
	const req = require('https').request('https://passport.yandex.ru/passport?mode=auth', { method: 'POST' }, res => {
		console.log('requesting...');

		if (res.statusCode !== 302) {
			console.log('rejecting');
			reject({ message: res.statusCode + ' != 302' });
		}
	    var sessionIdCookie = res.headers['set-cookie'].find(s => s.startsWith('Session_id='));
	    if (sessionIdCookie) {
	    	resolve(sessionIdCookie.replace(/;(.*)$/, '').replace(/^Session_id=/, ''));
	    }
	});
	req.on('error', reject);
	req.write('login=' + login + '&passwd=' + passwd);
	req.end();
});