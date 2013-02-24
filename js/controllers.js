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

function QueryCtrl($scope, ejsResource, elastic) {
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
    $scope.facets = [];
    $scope.facetResults = [];

    var ejs = ejsResource();

    $scope.indices = function () {
        elastic.indexes(function (data) {
            $scope.indices = data;
        });
    };

    $scope.types = function () {
        elastic.types(function (data) {
            $scope.types = data;
        });
    };

    $scope.fields = function () {
        elastic.fields(function (data) {
            $scope.fields = data;
        });
    };

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

    $scope.addFacetField = function () {
        var i = $scope.facets.indexOf($scope.queryFactory.addFacet);
        if (i == -1) {
            $scope.facets.push($scope.queryFactory.addFacet);
        }
        $scope.changeQuery();
    };

    $scope.removeFacetField = function (data) {
        var i = $scope.facets.indexOf(data);
        if (i > -1) {
            $scope.facets.splice(i, 1);
        }
        $scope.changeQuery();
    };

    $scope.executeQuery = function () {
        $scope.changeQuery();
        var request = createQuery();
        request.doSearch(function (results) {
            $scope.queryResults = results.hits;
            $scope.facetResults = results.facets;
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

        for (var i = 0; i < $scope.facets.length; i++) {
            var termsFacet = ejs.TermsFacet($scope.facets[i]);
            termsFacet.field($scope.facets[i]);
            request.facet(termsFacet);
        }

        request.explain($scope.search.explain);
        return request;
    }

    $scope.resetQuery();
}
QueryCtrl.$inject = ['$scope', 'ejsResource', 'elastic']

function NavbarCtrl($scope) {
    var items = $scope.items = [
        {title: 'Home', link: 'dashboard'},
        {title: 'Queries', link: 'query'},
        {title: 'Statistics', link: 'stats'}
    ];

    this.select = $scope.select = function (item) {
        angular.forEach(items, function (item) {
            item.selected = false;
        });
        item.selected = true;
    };

    this.selectByUrl = function (url) {
        angular.forEach(items, function (item) {
            if ('/' + item.link === url) {
                $scope.select(item);
            }
        });
    };
}