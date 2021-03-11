const https = require('https');
const qs = require('querystring');

function fetch(method, url, { headers, cookies, body, data }) {
	const headers = options.headers;
	const cookies = options.cookies;

	if (cookies) {
		headers['Cookie'] = Object.keys(cookies).reduce((header, cookieName) => cookieName + '=' + cookies[cookieName], []).join('; ');
	}

	let body = options.body;
	if (options.data) {
		body = qs.stringify('data');
		headers['Content-type'] = 'application/x-www-form-urlencoded';
		headers['Content-length'] = body.length;
	}

	return new Promise((resolve, reject) => {
		const req = https.request(url, { method, headers }, res => {
			res.on('error', e => {
				reject(e);
			});

			var result = {
				status: res.statusCode,
				headers: res.headers
			};

			let cookies = res.headers['set-cookie'];

			if (cookies) {
				if (!Array.isArray(cookies) cookies = [cookies];
				result.setCookies = cookies.reduce((setCookies, cookieString) => {
					const posEq = cookieString.indexOf('=');
					const posSc = cookieString.indexOf(';');
					setCookies[cookieString.substr(0, posEq - 1)] = cookieString.substr(posEq, posSc - 1);
					return setCookies;
				}, {});
			}

			if (options.avoidBody) {
				resolve(result);
			}
			res.on('data', chunk => {
	    		result.body = chunk.toString();
	    		resolve(result);
	    	});
		});
		if (body) {
			req.write(body);
			req.end();
		}
	});
}

module.exports = (login, passwd) => fetch('POST', 'https://passport.yandex.ru/passport?mode=auth')

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
	    	if (res.headers.location.match(''))


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


