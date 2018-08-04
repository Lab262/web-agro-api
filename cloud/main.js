let path = require('path');
const { AppCache } = require('parse-server/lib/cache');
const MailgunAdapter = AppCache.get(process.env.APP_ID || "myAppId").userController.adapter;

Parse.Cloud.afterSave("Cooperative", function (request) {
    let isFromApproval = request.original && !request.original.attributes.isActive && request.object.attributes.isActive;
    let isNew = request.object.attributes.updatedAt === request.object.attributes.createdAt;
    let isActive = request.object.attributes.isActive;
    let email = request.object.attributes.email;
    if (isActive && (isNew || isFromApproval)) { //Was created by the sysadmin 

        var loginAccepted = ""
        if (isFromApproval) {
            loginAccepted = "Parabéns o seu registro foi aprovado. \n"
        }
        var randomPassword = Math.random().toString(36).slice(-8);
        var isNewUser = false;
        var query = new Parse.Query(Parse.User);
        query.equalTo("email", email);
        query.first().then(user => {
            if (user === undefined) {
                isNewUser = true;
                var user = new Parse.User();
                user.set('email', email);
                user.set('username', email);
                user.set('password', randomPassword);
            }
            user.addUnique('cooperatives', {
                "cooperativeId": request.object.id,
                "userRole": "admin"
            })
            user.save(null, { useMasterKey: true })
        }).then((user) => {
            var senhaLabel = "";
            var password = "";
            if (isNewUser) {
                senhaLabel = "Senha: ";
                password = randomPassword;
            }
            MailgunAdapter.send({
                templateName: 'inviteNewUser',
                recipient: [email],
                variables: {
                    serverURL: "https://web-agro-control-system.herokuapp.com",
                    cooperativeName: request.object.attributes.name,
                    username: email,
                    password: password,
                    senhaLabel: senhaLabel,
                    loginAccepted: loginAccepted
                }
            })
        }).then(sent => {
            console.log(sent);
        }).catch(error => console.log(error));
    }
});

Parse.Cloud.afterSave("SalesTransaction", function (request, response) {
    var salesObject = request.object;
    salesObject.get("producer").fetch().then(function (producerResult) {
        producerResult.set("lastTransaction", salesObject.get("transactionDate"))
        producerResult.save()
    }, function (err) {
        response.error("ERROR" + err)
    });
});

Parse.Cloud.afterSave("Producer", function (request) {
    let isNew = request.object.attributes.updatedAt === request.object.attributes.createdAt;
    let email = request.object.attributes.email;
    if (isNew) { //Was created by the sysadmin 
        var randomPassword = Math.random().toString(36).slice(-8);
        var isNewUser = false;
        var query = new Parse.Query(Parse.User);
        query.equalTo("email", email);
        query.first().then(user => {
            if (user === undefined) {
                isNewUser = true;
                var user = new Parse.User();
                user.set('email', email);
                user.set('username', email);
                user.set('password', randomPassword);
            }
            user.addUnique('cooperatives', {
                "cooperativeId": request.object.id,
                "userRole": "admin"
            })
            user.save(null, { useMasterKey: true })
        }).then((user) => {
            var senhaLabel = "";
            var password = "";
            if (isNewUser) {
                senhaLabel = "Senha: ";
                password = randomPassword;
            }
            MailgunAdapter.send({
                templateName: 'inviteNewUser',
                recipient: [email],
                variables: {
                    serverURL: "https://web-agro-control-system.herokuapp.com",
                    cooperativeName: request.object.attributes.name,
                    username: email,
                    password: password,
                    senhaLabel: senhaLabel,
                }
            })
        }).then(sent => {
            console.log(sent);
        }).catch(error => console.log(error));
    }
});
