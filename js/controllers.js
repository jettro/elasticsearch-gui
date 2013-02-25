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

function QueryCtrl($scope, $dialog, ejsResource, elastic) {
    $scope.indices = [];
    $scope.types = [];
    $scope.fields = [];

    $scope.chosenIndices = [];
    $scope.chosenTypes = [];
    $scope.chosenFields = [];

    $scope.createdQuery = "";
    $scope.queryResults = [];
    $scope.search = {};
    $scope.queryFactory = {};
    $scope.facets = [];
    $scope.facetResults = [];

    var ejs = ejsResource();

    /* Functions to retrieve values used to created the query */
    $scope.loadIndices = function () {
        elastic.indexes(function (data) {
            $scope.indices = data;
        });
    };

    $scope.loadTypes = function () {
        elastic.types(function (data) {
            $scope.types = data;
        });
    };

    $scope.loadFields = function () {
        elastic.fields(function (data) {
            $scope.fields = data;
        });
    };

    /* Function to change the input for the query to be executed */
    $scope.chooseIndex = function (index) {
        toggleChoice($scope.chosenIndices, index);
        $scope.changeQuery();
    };

    $scope.chooseType = function (type) {
        toggleChoice($scope.chosenTypes, type);
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

    $scope.removeFacetField = function (data) {
        var found = -1;
        for (var i = 0; i < $scope.facets.length; i++) {
            var currentFacet = $scope.facets[i];
            if (currentFacet.field === data) {
                found = i;
                break;
            }
        }
        if (found > -1) {
            $scope.facets.splice(found, 1);
        }
        $scope.changeQuery();
    };

    /* Functions to create, reset and execute the query */
    $scope.executeQuery = function () {
        $scope.changeQuery();
        var request = createQuery();
        request.doSearch(function (results) {
            $scope.queryResults = results.hits;
            $scope.facetResults = results.facets;
        });

    };

    $scope.resetQuery = function () {
        $scope.loadIndices();
        $scope.loadTypes();
        $scope.loadFields();
        $scope.search.term = "";
        $scope.chosenIndices = [];
        $scope.chosenTypes = [];
        $scope.chosenFields = [];
        $scope.changeQuery();
    };

    $scope.changeQuery = function () {
        $scope.createdQuery = createQuery().toString();
    };

    $scope.openDialog = function () {
        var opts = {
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            templateUrl: 'templates/dialog/facet.html',
            controller: 'FacetDialogCtrl',
            resolve: {fields: angular.copy($scope.fields)}};
        var d = $dialog.dialog(opts);
        d.open().then(function (result) {
            if (result) {
                $scope.facets.push(result);
                $scope.changeQuery();
            }
        });
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

        for (var i = 0; i < $scope.facets.length; i++) {
            var facet = $scope.facets[i];
            if (facet.facetType === 'term') {
                var termsFacet = ejs.TermsFacet(facet.field);
                termsFacet.field(facet.field);
                request.facet(termsFacet);
            } else if (facet.facetType === 'range') {
                var rangeFacet = ejs.RangeFacet(facet.field);
                for (var j = 0; j < facet.ranges.length; j++) {
                    var range = facet.ranges[j];
                    if (range[0] == undefined) {
                        rangeFacet.addUnboundedTo(range[1]);
                    } else if (range[1] == undefined) {
                        rangeFacet.addUnboundedFrom(range[0]);
                    } else {
                        rangeFacet.addRange(range[0], range[1]);
                    }
                }
                rangeFacet.field(facet.field);
                request.facet(rangeFacet);
            } else if (facet.facetType === 'datehistogram') {
                var dateHistogramFacet = ejs.DateHistogramFacet(facet.field + 'Facet');
                dateHistogramFacet.field(facet.field);
                dateHistogramFacet.interval(facet.interval);
                request.facet(dateHistogramFacet);
            }
        }


        request.explain($scope.search.explain);
        return request;
    }

    function toggleChoice(theArray, theChoice) {
        var i = theArray.indexOf(theChoice);
        if (i > -1) {
            theArray.splice(i, 1);
        } else {
            theArray.push(theChoice);
        }
    };
    $scope.resetQuery();
}
QueryCtrl.$inject = ['$scope', '$dialog', 'ejsResource', 'elastic']

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

function FacetDialogCtrl($scope, dialog, fields) {
    $scope.fields = fields;
    $scope.facetTypes = ["Term", "Range", "DateHistogram"];
    $scope.ranges = [];
    $scope.intervals = ["year", "month", "week", "day", "hour", "minute"];
    $scope.interval = "";

    $scope.close = function (result) {
        var dialogResult = {};
        if ($scope.dialog.facettype === 'Term') {
            dialogResult.field = $scope.dialog.field;
            dialogResult.facetType = 'term';
        } else if ($scope.dialog.facettype === 'Range') {
            dialogResult.field = $scope.dialog.field;
            dialogResult.facetType = 'range';
            dialogResult.ranges = $scope.ranges;
        } else if ($scope.dialog.facettype === 'DateHistogram') {
            dialogResult.field = $scope.dialog.field;
            dialogResult.facetType = 'datehistogram';
            dialogResult.interval = $scope.interval;
        }
        dialog.close(dialogResult);
    };

    $scope.addRangeField = function () {
        $scope.ranges.push([$scope.dialog.range.from, $scope.dialog.range.to]);
    }
}