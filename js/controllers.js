'use strict';

/* Controllers */

function DashboardCtrl($scope, $http) {
    $http.get('/_cluster/health').success(function (data) {
        $scope.health = data;
    });
    $http.get('/_nodes').success(function (data) {
        $scope.nodes = data.nodes;
    });
}

function NodeInfoCtrl($scope, $http, $routeParams) {
    var nodeId = $routeParams.nodeId;
    $http.get('/_nodes/' + nodeId + '?all=true').success(function (data) {
        $scope.nodes = data.nodes[$routeParams.nodeId];
    });
}

function StatsCtrl() {

}

function QueryCtrl($scope, $http, ejsResource) {
    $scope.indices = [];
    $scope.types = [];
    $scope.chosenIndices = [];
    $scope.chosenTypes = [];
    $scope.chosenFields = [];
    $scope.createdQuery = "";
    $scope.queryResults = [];
    $scope.fields = [];
    $scope.search = {};
    $scope.queryFactory = {};

    var ejs = ejsResource();

    $scope.indices = function () {
        $http.get('/_status').success(function (data) {
            $scope.indices = data.indices;
        });
    };

    $scope.types = function () {
        $http.get('/_mapping').success(function (data) {
            var myTypes = [];
            for (var index in data) {
                for (var type in data[index]) {
                    if (myTypes.indexOf(type) == -1) {
                        myTypes.push(type);
                    }
                }
            }
            $scope.types = myTypes;
        });
    };

    $scope.fields = function () {
        $http.get('/_mapping').success(function (data) {
            var myTypes = [];
            var myFields = [];
            for (var index in data) { // wateenjuweeltje
                for (var type in data[index]) { // blog-item
                    if (myTypes.indexOf(type) == -1) {
                        myTypes.push(type);
                        var properties = data[index][type].properties;
                        for (var field in properties) {
                            myFields.push(field);
                        }
                    }
                }
            }
            $scope.fields = myFields;
        });
    }

    $scope.chooseIndex = function (index) {
        var i = $scope.chosenIndices.indexOf(index);
        if (i > -1) {
            $scope.chosenIndices.splice(i, 1);
        } else {
            $scope.chosenIndices.push(index);
        }
        $scope.changeQuery();
    };

    $scope.chooseType = function (type) {
        var i = $scope.chosenTypes.indexOf(type);
        if (i > -1) {
            $scope.chosenTypes.splice(i, 1);
        } else {
            $scope.chosenTypes.push(type);
        }
        $scope.changeQuery();
    };

    $scope.addQueryField = function () {
        var i = $scope.chosenFields.indexOf($scope.queryFactory.addField);
        if (i == -1) {
            $scope.chosenFields.push($scope.queryFactory.addField);
        }
        $scope.changeQuery();
    };

    $scope.removeQueryField = function (data) {
        var i = $scope.chosenFields.indexOf(data);
        if (i > -1) {
            $scope.chosenFields.splice(i, 1);
        }
        $scope.changeQuery();
    };

    $scope.executeQuery = function () {
        $scope.changeQuery();
        var request = createQuery();
        request.doSearch(function (results) {
            $scope.queryResults = results.hits;
        });

    };

    $scope.resetQuery = function () {
        $scope.indices();
        $scope.types();
        $scope.fields();
        $scope.search.term = "";
    };

    $scope.changeQuery = function () {
        $scope.createdQuery = createQuery().toString();
    };

    function createQuery() {
        var request = ejs.Request();
        request.indices($scope.chosenIndices);
        request.types($scope.chosenTypes);
        if ($scope.chosenFields.length > 0) {
            request.fields($scope.chosenFields);
        }
        if ($scope.search.term.length > 0) {
            request.query(ejs.TermQuery("_all", $scope.search.term));
        } else {
            request.query(ejs.MatchAllQuery());
        }

        // This is a date histogram facet
//        var dateHistogramFacet = ejs.DateHistogramFacet("Created");
//        dateHistogramFacet.field("createdOn_date");
//        dateHistogramFacet.interval("month");
//        request.facet(dateHistogramFacet);

        // This is a term facet
//        var termsFacet = ejs.TermsFacet("Category");
//        termsFacet.field("keywords");
//        request.facet(termsFacet);

        request.explain($scope.search.explain);
        return request;
    };

    $scope.resetQuery();
}