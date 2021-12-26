const request = require('request-promise');

const BASE_URL = 'https://cloud-api.yandex.net/v1/disk/resources';
const TOKEN = process.env.YANDEX_TOKEN;

module.exports = {
    save: function(path, content) {
        return callApi('upload', {
            path: 'app:/' + path,
            overwrite: true
        }).then(function(res) {
            return request({
                uri: res.href,
                method: 'PUT',
                body: content
            });
        });
    },

    upload: function(path, url) {
        return callApi('upload', {
            path: 'app:/' + path,
            url: url
        }, 'POST').then(function(data) {
            return data;
        }, function(err) {
            return {};
        });
    },

    mkdir: function(path) {
        return callApi('', {
            path: 'app:/' + path
        }, 'PUT').then(function(data) {
            return data;
        }, function(err) {
            return {};
        });
    },

    getData: function(path) {
        return callApi('', {
            path: 'app:/' + path
        }).then(function(data) {
            return data;
        }, function(err) {
            return {};
        });
    },

    read: function(path) {
        return callApi('download', {
            path: 'app:/' + path,
            sort: 'created'
        }).then(function(res) {
            return request({
                uri: res.href,
                method: res.method
            });
        });
    }
}

function callApi(apiMethod, query, httpMethod) {
    return request({
        method: httpMethod,
        uri: [BASE_URL, apiMethod].filter(Boolean).join('/'),
        headers: {
            'Authorization': 'OAuth ' + TOKEN
        },
        qs: query,
        json: true
    });
}
