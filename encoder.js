module.exports = {
	encode: array => String.fromCharCode.apply(String, array
    	.map((v, i, a) => i < a.length - 1? Math.round((a[i + 1] - v) * 10) : v * 10)
    	.map(x => Math.abs(x) < 63 ? x + 63 : [128 + (x + 16374) % 128, Math.floor((x + 16374) / 128) ].join())
    	.join().split(',').map(Number)
	),

	decode: string => {
		let w = 0;

		return [].map.call(string, x => x.charCodeAt())
			.reduce((res, v) => {
				if(w) {
					res.push((v * 128 + w) - 16374);
					 w = 0;
				} else if (v < 128) {
					 res.push(v - 63);
				} else {
					 w = v - 128;
				}; return res;
			}, [])
	    	.reverse()
	    	.reduce((res, v, i) => i? [...res, res[res.length - 1] - v / 10] : [v / 10], [])
	    	.reverse()
	    	.map(x => Math.round(x * 10) / 10);
    }
};