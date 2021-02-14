const request = require('request-promise');

const BASE_URL = 'https://cloud-api.yandex.net/v1/disk/resources';
const TOKEN = process.env.YANDEX_TOKEN;

module.exports = {
    save: function(path, content) {
        return callApi('upload', {
            path : 'app:/' + path,
            overwrite : true
        }).then(function(res) {
            return request({
                uri : res.href,
                method : 'PUT',
                body : content
            });
        });
    },

    getData: function(path) {
        return callApi('', {
            path : 'app:/' + path
        }).then(function(data) {
            return data;
        }, function(err) {
            return {};
        });
    },

    read: function(path) {
        return callApi('download', {
            path : 'app:/' + path,
            sort : 'created'
        }).then(function(res) {
            return request({
                uri : res.href,
                method : res.method
            });
        });
    }
}

function callApi(method, query) {
    return request({
        uri : [BASE_URL, method].filter(Boolean).join('/'),
        headers : {
            'Authorization' : 'OAuth ' + TOKEN
        },
        qs : query,
        json : true
    });
}