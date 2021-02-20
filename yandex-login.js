module.exports = (login, passwd) => new Promise((resolve, reject) => {
	const req = require('https').request('https://passport.yandex.ru/passport?mode=auth', { method: 'POST' }, res => {
		console.log('requesting yandex credentials...');

		if (res.statusCode !== 302) {
			console.log('rejecting yandex session, since status is: ', res.statusCode, ' instead of 302');
			reject({ message: res.statusCode + ' != 302' });
		}
	    var cookieHeader = res.headers['set-cookie'];
	    if (!cookieHeader) {
	    	console.log('rejecting since no cookies found');
	    	reject({ message: 'rejecting since no cookies found' });

	    }
	    var sessionIdCookie = cookieHeader.find(s => s.startsWith('Session_id='));
	    if (sessionIdCookie) {
	    	resolve(sessionIdCookie.replace(/;(.*)$/, '').replace(/^Session_id=/, ''));
	    } else {

	    	console.log('No Session_id cookie found');
	    	console.log(JSON.stringify(res.headers));

	    	res.on('data', chunk => {
	    		console.log('BODY:', chunk.toString());
	    	});

	    	reject({ message: 'No Session_id cookie found' });
	    }
	});
	req.on('error', error => {
		console.warn('error while requesting session', error)
		reject(error)
	});
	req.write('login=' + login + '&passwd=' + passwd);
	req.end();
});


