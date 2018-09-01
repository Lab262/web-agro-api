var Moment = require('moment');

Parse.Cloud.afterSave("SalesTransaction", function (request, response) {
    var salesObject = request.object;
    //1. criar sales transaction - supply nao existe no dia
    //2. criar sales transaction supply ja  existe no dia
    //3. criar sales transaction nenhum supply no sistema 
    salesObject.get("producer").fetch().then(function (producerResult) {
        producerResult.set("lastTransaction", salesObject.get("transactionDate"))
        producerResult.save()
    }, function (err) {
        response.error("ERROR" + err)
    });
});

Parse.Cloud.afterSave("PurchaseTransaction", function (request, response) {
    var salesObject = request.object;
    //1. criar sales transaction - supply nao existe no dia
    //2. criar sales transaction supply ja existe no dia
    //3. criar sales transaction nenhum supply no sistema 
    salesObject.get("producer").fetch().then(function (producerResult) {
        producerResult.set("lastTransaction", salesObject.get("transactionDate"))
        producerResult.save()
    }, function (err) {
        response.error("ERROR" + err)
    });
});



/*
@productId: string,
@cooperativeId: string,
@measuredSupply: number
*/
Parse.Cloud.define("updateMeasuredSupply", function (request, response) {

    var transactionDate = Moment(new Date()).add(1, 'day');
    var startDate = Moment(transactionDate).startOf('day').toDate()
    var endDate = Moment(transactionDate).endOf('day').toDate()

    var product = new Parse.Object('Product');
    product.id = request.params.productId;
    var cooperative = new Parse.Object('Cooperative');
    cooperative.id = request.params.cooperativeId;
    var measuredSupply = parseFloat(request.params.measuredSupply)
    var query = new Parse.Query('SupplyStatistics')
    query.equalTo('product', product);
    query.equalTo('cooperative', cooperative);
    query.descending('createdAt');
    query.first().then(result => {
        var supplyStatistic = result;
        if (supplyStatistic && Moment(supplyStatistic.get('createdAt')).isSame(transactionDate, 'day')/*alreadyExistSupplyStatisticsToday*/) {
            supplyStatistic.set('measuredSupply', measuredSupply);
            var supplyWaste = supplyStatistic.get('measuredSupply') - supplyStatistic.get('estimatedSupply');
            supplyStatistic.set('supplyWaste', supplyWaste);
            supplyStatistic.save().then(result => {
                response.success(result);
            }).catch(err => {
                response.error(err)
            })
        } else {
            var newSupplyStatistics = new Parse.Object('SupplyStatistics');
            newSupplyStatistics.set('product', product);
            newSupplyStatistics.set('cooperative', cooperative);
            newSupplyStatistics.set('measuredSupply', measuredSupply);
            getTransactionAmountByProduct("SalesTransaction", cooperative, product, startDate, endDate).then(salesAmount => {
                newSupplyStatistics.set('totalSales', salesAmount)
                return getTransactionAmountByProduct("PurchaseTransaction", cooperative, product, startDate, endDate)
            }).then(purchaseAmount => {
                newSupplyStatistics.set('totalPurchase', purchaseAmount)
                var salesPurchasesDifference = newSupplyStatistics.get('totalPurchase') - newSupplyStatistics.get('totalSales')
                newSupplyStatistics.set('salesPurchasesDifference', salesPurchasesDifference)

                if (supplyStatistic) {
                    var estimatedSupply = salesPurchasesDifference + supplyStatistic.get('measuredSupply'); //sales diff of today + measured of last day
                    newSupplyStatistics.set('estimatedSupply', estimatedSupply);
                } else {
                    newSupplyStatistics.set('estimatedSupply', salesPurchasesDifference);
                }
                var supplyWaste = newSupplyStatistics.get('measuredSupply') - newSupplyStatistics.get('estimatedSupply');
                newSupplyStatistics.set('supplyWaste', supplyWaste);
                return newSupplyStatistics.save()
            }).then(result => {
                response.success(result);
            }).catch(err => {
                response.error(err)
            })
        }
    }).catch(err => {
        response.error(err)
    })
});

function getTransactionAmountByProduct(transactionClass, cooperative, product, startDate, endDate) {
    var promise = new Parse.Promise();
    var query = new Parse.Query(transactionClass);
    query.equalTo("cooperative", cooperative);
    query.equalTo("product", product);
    query.include('product.amountScale');
    query.greaterThanOrEqualTo('transactionDate', startDate);
    query.lessThanOrEqualTo('transactionDate', endDate);
    query.find().then(function (transaction) {
        if (transaction && transaction.length > 0) {
            let transactionAmount = transaction.reduce((sumAmount, currentObject) => {
                let amount = currentObject.get("productAmount")
                let amountScale = currentObject.get('product').get("amountScale")
                let transactionAmount = parseFloat(amount) * parseFloat(amountScale);
                return sumAmount + transactionAmount
            }, 0)
            promise.resolve(transactionAmount)
        } else {
            promise.resolve(0);
        }
    }, function (err) {
        promise.reject(err)
    });
    return promise;
}

