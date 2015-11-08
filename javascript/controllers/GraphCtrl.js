angular.module('guiapp').controller('GraphCtrl',['$scope', '$modal', 'elastic', 'aggregateBuilder',
function ($scope, $modal, elastic, aggregateBuilder) {
    $scope.indices = [];
    $scope.types = [];
    $scope.fields = [];
    $scope.results = [];
    $scope.columns = [];

    /* Functions to retrieve values used to created the query */
    $scope.loadIndices = function () {
        elastic.indexes(function (data) {
            $scope.indices = data;
        });
    };

    $scope.loadTypes = function () {
        elastic.types([], function (data) {
            $scope.types = data;
        });
    };

    $scope.loadFields = function () {
        elastic.fields([], [], function (data) {
            $scope.fields = data;
        });
    };

    $scope.openDialog = function () {
        var opts = {
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            templateUrl: 'template/dialog/aggregate.html',
            controller: 'AggregateDialogCtrl',
            resolve: {fields: function () {
                return angular.copy($scope.fields)
            } }};
        var d = $modal.open(opts);
        d.result.then(function (result) {
            if (result) {
                $scope.aggregate = result;
                $scope.executeQuery();
            }
        });
    };

    $scope.executeQuery = function () {
        var query = createQuery();

        elastic.doSearch(query, function (results) {
            if ($scope.aggregate.aggsType === "term") {
                $scope.columns = [];
                var result = {};
                angular.forEach(results.aggregations[$scope.aggregate.name].buckets, function (bucket) {
                    $scope.columns.push({"id": bucket.key, "type": "pie", "name": bucket.key + "[" + bucket.doc_count + "]"});
                    result[bucket.key] = bucket.doc_count;
                });
                $scope.results = [result];
            } else if ($scope.aggregate.aggsType === "datehistogram") {
                $scope.columns = [
                    {"id": "doc_count", "type": "line", "name": "documents"}
                ];
                $scope.xaxis = {"id": "key"};
                $scope.results = results.aggregations[$scope.aggregate.name].buckets;
            } else {
                $scope.columns = [
                    {"id": "doc_count", "type": "bar", "name": "documents"}
                ];
                $scope.xaxis = {"id": "key"};
                $scope.results = results.aggregations[$scope.aggregate.name].buckets;
            }
        }, function (errors) {
            console.log(errors);
        });


    };

    function createQuery() {
        var query = {};
        query.index = "";
        query.body = {};
        query.size = 0;
        query.body.query = {"matchAll": {}};
        var aggregations = [];
        aggregations.push($scope.aggregate);
        query.body.aggs = aggregateBuilder.build(aggregations);

        return query;
    }

    $scope.loadIndices();
    $scope.loadTypes();
    $scope.loadFields();
}]);
