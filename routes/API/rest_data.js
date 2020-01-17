const rp = require('request-promise');

const fetchEntities = endpoint => {
    return getToken(endpoint).then(token_data => {
        const {access_token} = token_data;
        const opts = {
            uri: endpoint.entities_url,
            method: 'GET',
            qs: {
                access_token: access_token,
            },
            json: true
        };
        //console.log(opts);

        return rp(opts).then( entities => entities);
    });
};

const fetchData = (endpoint, options) => {
    return getToken(endpoint).then(token_data => {
        const {access_token} = token_data;

        let opts = {
            uri: endpoint.url,
            method: 'POST',
            qs: {
                access_token: access_token
            },
            body: options,
            json: true
        };

        //console.log(opts);

        return rp(opts).then( data => data);
    });
};


const getToken = endpoint => {
    const opts = {
        uri: endpoint.token_url,
        method: 'POST',
        contentType: 'x-www-form-urlencoded',
        form: {
            grant_type: 'password',
            username: endpoint.username,
            password: endpoint.password,
            client_id: endpoint.client_id,
            client_secret: endpoint.client_secret
        },
        json: true
    };

    return rp(opts);
};

module.exports = {
    fetchData,
    fetchEntities
};