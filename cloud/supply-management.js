var Moment = require('moment');


Parse.Cloud.define("getWasteStatistcsForProduct", function (request, response) {

    var startDate = Moment(new Date()).endOf('day').toDate()
    var endDate = Moment(new Date()).subtract(request.params.dayRange, 'day').startOf('day').toDate()
    var dates = enumerateDaysBetweenDates(endDate, startDate)

    var product = new Parse.Object('Product');
    product.id = request.params.product;
    var query = new Parse.Query('SupplyStatistics')
    query.equalTo('product', product);
    query.descending('createdAt');
    query.greaterThanOrEqualTo('createdAt', endDate);
    query.lessThanOrEqualTo('createdAt', startDate);
    query.find().then(supplyStatistics => {

        var labels = []
        var data = []
        dates.forEach(date => {
            var currDateMoment = Moment(date);
            var currentStatistics = supplyStatistics.filter(statistic => Moment(statistic.get('createdAt')).isSame(currDateMoment, 'day'))
            var day = currDateMoment.format('DD/MM')
            var wasteAmount = currentStatistics.length > 0 && currentStatistics[0].get('supplyWaste') ? currentStatistics[0].get('supplyWaste') : 0
            labels.push(day)
            data.push(wasteAmount);
        })
        data = [data]
        response.success({ labels, data });

    }).catch(err => {
        console.log(err);
        response.error(err)
    })

})

function enumerateDaysBetweenDates(startDate, endDate) {
    var dates = [];
    var currDate = Moment(startDate).startOf('day');
    var lastDate = Moment(endDate).startOf('day');
    while (currDate.add(1, 'days').diff(lastDate) <= 0) {
        dates.push(currDate.clone().toDate());
    }
    return dates;
};

Parse.Cloud.define("getCurrentSupplyStatistics", function (request, response) {

    var cooperative = new Parse.Object('Cooperative');
    cooperative.id = request.params.cooperativeId;
    getSupplyStatisticsForProduct(request.params.products, 0, cooperative, []).then(result => {
        response.success(result);
    }).catch(error => {
        console.log(error);
        response.error(error)
    });
})

function getSupplyStatisticsForProduct(productArray, index, cooperative, statisticsArray, promise) {

    if (!promise) {
        promise = new Parse.Promise();
    }

    var currentProduct = productArray[index];
    var product = new Parse.Object('Product');
    product.id = currentProduct;

    var query = new Parse.Query('SupplyStatistics')
    query.equalTo('cooperative', cooperative);
    query.equalTo('product', product);
    query.descending('createdAt');
    query.first().then(supplyStatistic => {
        statisticsArray.push({ statistic: supplyStatistic, product: product.id })
        if (index < productArray.length - 1) {
            var newIndex = index + 1;
            return getSupplyStatisticsForProduct(productArray, newIndex, cooperative, statisticsArray, promise)
        } else {
            promise.resolve(statisticsArray)
        }
    }).catch(err => {
        console.log(err);
        promise.reject(err);
    })
    return promise;

}

/*
@productId: string,
@cooperativeId: string,
@measuredSupply: number
*/
Parse.Cloud.define("updateMeasuredSupply", function (request, response) {
    updateSupplyStatistics(request.params.productId, request.params.cooperativeId, request.params.measuredSupply).then(result => {
        response.success(result)
    }).catch(err => {
        response.error(err)
    });
});

function updateSupplyStatistics(productId, cooperativeId, measuredSupply) {

    var promise = new Parse.Promise();

    var transactionDate = Moment(new Date());
    var startDate = Moment(transactionDate).startOf('day').toDate()
    var endDate = Moment(transactionDate).endOf('day').toDate()

    var product = new Parse.Object('Product');
    product.id = productId;
    var cooperative = new Parse.Object('Cooperative');
    cooperative.id = cooperativeId;
    var measuredSupply = measuredSupply ? parseFloat(measuredSupply) : undefined
    var query = new Parse.Query('SupplyStatistics')
    query.equalTo('product', product);
    query.equalTo('cooperative', cooperative);
    query.descending('createdAt');
    query.first().then(result => {
        var supplyStatistic = result;
        if (supplyStatistic && Moment(supplyStatistic.get('createdAt')).isSame(transactionDate, 'day')/*alreadyExistSupplyStatisticsToday*/) {
            if (measuredSupply) {
                supplyStatistic.set('measuredSupply', measuredSupply);
                var supplyWaste = supplyStatistic.get('measuredSupply') - supplyStatistic.get('estimatedSupply');
                supplyStatistic.set('supplyWaste', supplyWaste);
                supplyStatistic.save().then(result => {
                    promise.resolve(result);
                }).catch(err => {
                    promise.reject(err)
                })
            } else {
                getTransactionAmountByProduct("SalesTransaction", cooperative, product, startDate, endDate).then(salesAmount => {
                    supplyStatistic.set('totalSales', salesAmount)
                    return getTransactionAmountByProduct("PurchaseTransaction", cooperative, product, startDate, endDate)
                }).then(purchaseAmount => {
                    supplyStatistic.set('totalPurchase', purchaseAmount)
                    var salesPurchasesDifference = supplyStatistic.get('totalPurchase') - supplyStatistic.get('totalSales')
                    supplyStatistic.set('salesPurchasesDifference', salesPurchasesDifference)

                    if (supplyStatistic) {
                        var estimatedSupply = salesPurchasesDifference + supplyStatistic.get('measuredSupply'); //sales diff of today + measured of last day
                        supplyStatistic.set('estimatedSupply', estimatedSupply);
                    } else {
                        supplyStatistic.set('estimatedSupply', salesPurchasesDifference);
                    }
                    var supplyWaste = supplyStatistic.get('measuredSupply') - supplyStatistic.get('estimatedSupply');
                    supplyStatistic.set('supplyWaste', supplyWaste);
                    return supplyStatistic.save()
                }).then(result => {
                    promise.resolve(result);
                }).catch(err => {
                    promise.reject(err)
                })
            }

        } else {
            var newSupplyStatistics = new Parse.Object('SupplyStatistics');
            newSupplyStatistics.set('product', product);
            newSupplyStatistics.set('cooperative', cooperative);

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
                if (measuredSupply) {
                    newSupplyStatistics.set('measuredSupply', measuredSupply);
                } else {
                    newSupplyStatistics.set('measuredSupply', newSupplyStatistics.get('estimatedSupply'));
                }
                var supplyWaste = newSupplyStatistics.get('measuredSupply') - newSupplyStatistics.get('estimatedSupply');
                newSupplyStatistics.set('supplyWaste', supplyWaste);
                return newSupplyStatistics.save()
            }).then(result => {
                promise.resolve(result);
            }).catch(err => {
                promise.reject(err)
            })
        }
    }).catch(err => {
        promise.reject(err)
    })
    return promise;
}

function getTransactionAmountByProduct(transactionClass, cooperative, product, startDate, endDate) {
    var promise = new Parse.Promise();
    var query = new Parse.Query(transactionClass);
    query.equalTo("cooperative", cooperative);
    query.equalTo("product", product);
    query.include('product.scale');
    query.greaterThanOrEqualTo('transactionDate', startDate);
    query.lessThanOrEqualTo('transactionDate', endDate);
    query.find().then(function (transaction) {
        if (transaction && transaction.length > 0) {
            let transactionAmount = transaction.reduce((sumAmount, currentObject) => {
                let amount = currentObject.get("productAmount")
                let amountScale = currentObject.get('product').get("scale").get('scaleProportion')
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

exports.updateSupplyStatistics = updateSupplyStatistics