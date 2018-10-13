var SupplyManagment = require('./supply-management');
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
            user.addUnique('cooperativesRoles', {
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
    SupplyManagment.updateSupplyStatistics(salesObject.attributes.product.id, salesObject.attributes.cooperative.id)
});

Parse.Cloud.afterSave("PurchaseTransaction", function (request, response) {
    var salesObject = request.object;
    salesObject.get("producer").fetch().then(function (producerResult) {
        producerResult.set("lastTransaction", salesObject.get("transactionDate"))
        producerResult.save()
    }, function (err) {
        response.error("ERROR" + err)
    });
    SupplyManagment.updateSupplyStatistics(salesObject.attributes.product.id, salesObject.attributes.cooperative.id)
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
            user.addUnique('cooperativesRoles', {
                "cooperativeId": request.object.attributes.cooperative.id,
                "userRole": "producer",
                "producerId": request.object.id
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


function getPurchaseTransactionAmount(request, response) {
    fetchPurchaseTransaction(request.params.cooperative, request.params.producer).then(function (purchaseTransaction) {
        let amount = purchaseTransaction.get("productAmount")
        let amountScale = purchaseTransaction.get("amountScale")

        return amount * amountScale
    }, function (err) {
        response.error("ERROR: " + err)
    });
}

function getSalesTransactionAmount(request, response) {
    fetchSalesTransaction(request.params.cooperative, request.params.producer).then(function (salesTransaction) {
        let amount = salesTransaction.get("productAmount")
        let amountScale = salesTransaction.get("amountScale")

        return amount * amountScale
    }, function (err) {
        response.error("ERROR: " + err)
    });
}

var fetchSalesTransaction = function (cooperative, producer) {
    var query = new Parse.Query("SalesTransaction");
    query.equalTo("cooperative", cooperative);
    query.equalTo("producer", producer)
    return query.find();
};

var fetchPurchaseTransaction = function (cooperative, producer) {
    var query = new Parse.Query("PurchaseTransaction");
    query.equalTo("cooperative", cooperative);
    query.equalTo("producer", producer)
    return query.find();
};

Parse.Cloud.define("getPurchaseTransactionAmount", function (request, response) {
    let result = getPurchaseTransactionAmount(request, response)
    response.success(result)
});

Parse.Cloud.define("getSalesTransactionAmount", function (request, response) {
    let result = getSalesTransactionAmount(request, response)
    response.success(result)
});

Parse.Cloud.define("getStock", function (request, response) {
    let salesTransaction = getSalesTransactionAmount(request, response)
    let purchaseTransaction = getPurchaseTransactionAmount(request, response)
    let result = (salesTransaction - purchaseTransaction)

    response.success(result)
});

Parse.Cloud.afterDelete("Product", function (request) {
    var query = new Parse.Query("PurchaseTransaction");
    query.equalTo("product", request.object);
    query.find()
        .then(Parse.Object.destroyAll)
        .catch(function (error) {
            console.error("Error finding related comments " + error.code + ": " + error.message);
        });

    query = new Parse.Query("SalesTransaction");
    query.equalTo("product", request.object);
    query.find()
        .then(Parse.Object.destroyAll)
        .catch(function (error) {
            console.error("Error finding related comments " + error.code + ": " + error.message);
        });
});