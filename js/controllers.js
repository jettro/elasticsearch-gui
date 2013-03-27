'use strict';

/* Controllers */
var host = 'http://localhost:9200';

function DashboardCtrl($scope, $http, elastic) {
    $http.get('/_cluster/health').success(function (data) {
        $scope.health = data;
    });
    $http.get('/_nodes').success(function (data) {
        $scope.nodes = data.nodes;
    });

    elastic.indexesDetails(function (data) {
        $scope.indices = data;
    });
}
DashboardCtrl.$inject = ['$scope', '$http', 'elastic']

function NodeInfoCtrl($scope, $http, $routeParams) {
    var nodeId = $routeParams.nodeId;
    $http.get('/_nodes/' + nodeId + '?all=true').success(function (data) {
        $scope.nodes = data.nodes[$routeParams.nodeId];
    });
}

function HomeCtrl($scope, $http, elastic, configuration, ejsResource) {
    $scope.isCollapsed = true;
    $scope.configure = configuration;
    $scope.fields = [];
    $scope.clusterName = "";
    $scope.search = {};
    $scope.results = [];

    var ejs = ejsResource('http://localhost:9200');

    $scope.init = function () {
        elastic.fields(function (data) {
            $scope.fields = data;
            if (!$scope.configure.title) {
                if ($scope.fields.indexOf("title") > -1) {
                    $scope.configure.title = "title";
                }
            }

            if (!$scope.configure.description & $scope.fields.indexOf("description") > -1) {
                $scope.configure.title = "description";
            }
        });
        elastic.clusterName(function (data) {
            $scope.clusterName = data;
        });
    };

    $scope.doSearch = function () {
        if (!($scope.configure.title)) {
            console.log("Hmm, you should configure more");
            return;
        }

        var request = ejs.Request();
        var queryFields = [];
        queryFields.push($scope.configure.title);
        queryFields.push($scope.configure.description);

        request.fields(queryFields);
        var matchQuery = ejs.MatchQuery("_all", $scope.search.simple);
        request.query(matchQuery);
        request.doSearch(function (results) {
            $scope.results = results.hits;
        });

    }
}
HomeCtrl.$inject = ['$scope', '$http', 'elastic', 'configuration', 'ejsResource'];

function StatsCtrl() {

}

function GraphCtrl($scope, $dialog, ejsResource, elastic) {
    $scope.indices = [];
    $scope.types = [];
    $scope.fields = [];
    $scope.results = [];

    var ejs = ejsResource(host);

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

    $scope.openDialog = function () {
        var opts = {
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            templateUrl: 'template/dialog/facet.html',
            controller: 'FacetDialogCtrl',
            resolve: {fields: angular.copy($scope.fields)}};
        var d = $dialog.dialog(opts);
        d.open().then(function (result) {
            if (result) {
                $scope.facet = result;
            }
        });
    };

    function getValue(data) {
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                return data[key];
            }
        }
    }

    $scope.executeQuery = function () {
        var request = createQuery();
        request.doSearch(function (results) {
            $scope.results = getValue(results.facets);
        });

    };

    function createQuery() {
        var request = ejs.Request();
        request.query(ejs.MatchAllQuery());
        request.size(0);

        var facet = $scope.facet;
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
        } else if (facet.facetType === 'histogram') {
            var histogramFacet = ejs.HistogramFacet(facet.field + 'Facet');
            histogramFacet.field(facet.field);
            histogramFacet.interval(facet.interval);
            request.facet(histogramFacet);
        }
        return request;
    }


    $scope.loadIndices();
    $scope.loadTypes();
    $scope.loadFields();
}
GraphCtrl.$inject = ['$scope', '$dialog', 'ejsResource', 'elastic']

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

    var ejs = ejsResource('http://localhost:9200');

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
        $scope.search.type = "or";
    };

    $scope.changeQuery = function () {
        $scope.createdQuery = createQuery().toString();
    };

    $scope.openDialog = function () {
        var opts = {
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            templateUrl: 'template/dialog/facet.html',
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
            var matchQuery = ejs.MatchQuery("_all", $scope.search.term);
            if ($scope.search.type === 'phrase') {
                matchQuery.type('phrase');
            } else {
                matchQuery.operator($scope.search.type);
            }
            request.query(matchQuery);
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
            } else if (facet.facetType === 'histogram') {
                var histogramFacet = ejs.HistogramFacet(facet.field + 'Facet');
                histogramFacet.field(facet.field);
                histogramFacet.interval(facet.interval);
                request.facet(histogramFacet);
            }
        }


        request.explain($scope.search.explain);
        if ($scope.search.highlight) {
            var highlight = ejs.Highlight();
            highlight.fields($scope.chosenFields);
            request.highlight(highlight);
        }
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
        {title: 'Home', link: 'home'},
        {title: 'Dashboard', link: 'dashboard'},
        {title: 'Queries', link: 'query'},
        {title: 'Graphs', link: 'graph'},
        {title: 'Statistics', link: 'stats'},
        {title: 'About', link: 'about'}
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
    $scope.facetTypes = ["Term", "Range", "Histogram", "DateHistogram"];
    $scope.ranges = [];
    $scope.intervals = ["year", "month", "week", "day", "hour", "minute"];
    $scope.interval = "";

    $scope.close = function (result) {
        var dialogResult = {};
        dialogResult.field = $scope.dialog.field;
        if ($scope.dialog.facettype === 'Term') {
            dialogResult.facetType = 'term';
        } else if ($scope.dialog.facettype === 'Range') {
            dialogResult.facetType = 'range';
            dialogResult.ranges = $scope.ranges;
        } else if ($scope.dialog.facettype === 'DateHistogram') {
            dialogResult.facetType = 'datehistogram';
            dialogResult.interval = $scope.interval;
        } else if ($scope.dialog.facettype === 'Histogram') {
            dialogResult.facetType = 'histogram';
            dialogResult.interval = $scope.interval;
        }
        dialog.close(dialogResult);
    };

    $scope.addRangeField = function () {
        $scope.ranges.push([$scope.dialog.range.from, $scope.dialog.range.to]);
    }
}