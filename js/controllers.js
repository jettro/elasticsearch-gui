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
    $scope.createdQuery = "";
    $scope.queryResults = [];
    $scope.fields = [];
    $scope.search = {};

    var ejs = ejsResource();

    $scope.indices = function () {
        $http.get('/_status').success(function (data) {
            $scope.indices = data.indices;
        });
    };

    $scope.types = function () {
        $http.get('/_mapping').success(function (data) {
            var myTypes = [];
            for (var key in data) {
                for (var type in data[key]) {
                    if (myTypes.indexOf(type) == -1) {
                        myTypes.push(type);
                    }
                }
            }
            $scope.types = myTypes;
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

    $scope.executeQuery = function () {
        var request = createQuery();
        request.doSearch(function (results) {
            $scope.queryResults = results.hits.hits;
        });

    };

    $scope.resetQuery = function () {
        $scope.indices();
        $scope.types();
        $scope.search.term = "";
    };

    $scope.changeQuery = function () {
        $scope.createdQuery = createQuery().toString();
    }

    function createQuery() {
        var request = ejs.Request();
        request.indices($scope.chosenIndices);
        request.types($scope.chosenTypes);

        request.query(ejs.TermQuery("_all", $scope.search.term));
        request.explain(true);
        return request;
    }

    $scope.resetQuery();
}