const request = require('request');

module.exports = NestOAuth2 = function(clientId, secretId) {
    this.clientId = clientId;
    this.secretId = secretId;
    this.model = {
        code: null,
        token: null,
        tokenFrom: null
    };
}

NestOAuth2.prototype.hasValidToken = function() {
    if(!this.model.token) {
        return false;
    }
    var currentTimestamp = Math.floor(Date.now() / 1000);
    return (this.model.tokenFrom + this.model.token.expires_in) > currentTimestamp;
}

/**
*
* If the authorization flow is web based, after calling the returned URL the page will be redirected to the configured redirect_uri for your application, with 2 parameters (state and code).
* For example : https://myapplication.com/?state=STATE&code=456XXX123
* Extract the code and the state, and call the NestOAuth2.connect(extractedCode) to obtain an access_token
*
* If the authorization flow is PIN based, after calling the returned URL, the page will display a PIN code that you will need to copy an call the NestOAuth2.connect(pinCode) to otain an access_token
*
*/
NestOAuth2.prototype.getConnectionURL = function(state) {
    return 'https://home.nest.com/login/oauth2?client_id=' + this.clientId + '&state=' + (state || 'STATE');
};

NestOAuth2.prototype.connect = function(code) {
    var that = this;
    return new Promise(function(resolve, reject) {
        var accessTokenUrl = 'https://api.home.nest.com/oauth2/access_token';
        request(
            {
                method: 'POST',
                url: accessTokenUrl,
                form: {
                    client_id: that.clientId,
                    client_secret: that.secretId,
                    grant_type: 'authorization_code',
                    code: code
                },
                headers: {
                    accept: 'application/json'
                }
            }
            , function (error, response, body) {
               if (!error && response.statusCode == 200) {
                    that.model.tokenFrom = Date.now();
                    that.model.token = JSON.parse(body);
                    resolve(that.model.token); // once connected return the token
                }
                else {
                    console.error('Error while trying to get access_token from code');
                    console.error(response.statusCode);
                    console.error(body);
                    if(body) {
                        try {
                            reject(JSON.parse(body));
                        }
                        catch(e) {
                            reject();
                        }
                    }
                    else {
                        reject();
                    }
                }
            }
        );
    });
};

NestOAuth2.prototype.setOAuthAccessToken = function(token, obtainingTimestamp) {
    try {
        this.model.tokenFrom = parseInt(obtainingTimestamp);
        this.model.token = token;
    }
    catch(e) {
        console.error('Unable to set oauth access token.');
        console.error('Please check that first parameter (token) is an object like { access_token: \'xxxxxx\', expires_in: 315360000 }');
        console.error('Please also check that the second parameter (obtainingTimestamp) is a number containing the timestamp of when the given token was obtained, in milliseconds');
    }
};

NestOAuth2.prototype.getOAuthAccessToken = function() {
    if(this.model.token) {
        if(this.hasValidToken()) {
            return this.model.token;
        }
        else {
            console.error('Token expired. Please try to connect again.');
            return null;
        }
    }
    else {
        console.error('Not connected. Please try to connect first calling NestOAuth2.connect(\'code\') function. The PIN code must be given in parameter.\nTo obtain this PIN code, call the URL given by the function NestOAuth2.getConnectionURL() and authenticate.');
        return null;
    }
};

