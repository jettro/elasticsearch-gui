'use strict';

/* Controllers */
function DashboardCtrl($scope, elastic) {
    $scope.health = {};
    $scope.nodes = [];
    $scope.plugins = [];

    $scope.removeIndex = function (index) {
        elastic.removeIndex(index, function () {
            indexDetails();
        });
    };

    $scope.openIndex = function (index) {
        elastic.openIndex(index, function () {
            indexDetails();
        });
    };

    $scope.closeIndex = function (index) {
        elastic.closeIndex(index, function () {
            indexDetails();
        });
    };

    function indexDetails() {
        elastic.indexesDetails(function (data) {
            $scope.indices = data;
        });
    }

    function refreshData() {
        elastic.clusterHealth(function (data) {
            $scope.health = data;
        });

        elastic.clusterNodes(function (data) {
            $scope.nodes = data;
        });

        elastic.plugins(function(data) {
            $scope.plugins = data;
        });
    }

    $scope.$on('$viewContentLoaded', function () {
        indexDetails();
        refreshData();
    });
}
DashboardCtrl.$inject = ['$scope', 'elastic'];

function NodeInfoCtrl($scope, elastic, $routeParams) {
    var nodeId = $routeParams.nodeId;
    elastic.nodeInfo(nodeId, function (data) {
        $scope.nodes = data;
    });
}
NodeInfoCtrl.$inject = ['$scope', 'elastic', '$routeParams'];

function SearchCtrl($scope, elastic, configuration, facetBuilder, $modal, queryStorage) {
    $scope.isCollapsed = true;
    $scope.configure = configuration;
    $scope.fields = [];
    $scope.clusterName = "";
    $scope.search = {};
    $scope.search.advanced = {};
    $scope.search.advanced.searchFields = [];
    $scope.search.facets = [];
    $scope.search.selectedFacets = [];

    $scope.configError = "";

    $scope.results = [];
    $scope.facets = [];

    // initialize pagination
    $scope.currentPage = 1;
    $scope.maxSize = 5;
    $scope.numPages = 0;
    $scope.pageSize = 10;
    $scope.totalItems = 0;

    $scope.changePage = function (pageNo) {
        $scope.currentPage = pageNo;
        $scope.doSearch();
    };


    $scope.init = function () {
        elastic.fields([], [], function (data) {
            $scope.fields = data;
            if (!$scope.configure.title) {
                if ($scope.fields.title) {
                    $scope.configure.title = "title";
                }
            }

            if (!$scope.configure.description && $scope.fields.description) {
                $scope.configure.description = "description";
            }
        });
        elastic.clusterName(function (data) {
            $scope.clusterName = data;
        });
    };

    $scope.restartSearch = function() {
        $scope.currentPage = 1;
        $scope.numPages = 0;
        $scope.pageSize = 10;
        $scope.totalItems = 0;
        $scope.doSearch();        
    };

    $scope.doSearch = function () {
        if ((!($scope.configure.title)) || (!($scope.configure.description))) {
            $scope.configError = "Please configure the title and description in the configuration at the top of the page.";
        } else {
            $scope.configError = "";
        }

        var query = {};
        query.index = "";
        query.body = {};
        query.fields = $scope.configure.title + "," + $scope.configure.description

        query.size = $scope.pageSize;
        query.from = ($scope.currentPage - 1) * $scope.pageSize;
        
        query.body.facets = facetBuilder.build($scope.search.facets);
        var filter = filterChosenFacetPart();
        if (filter) {
            query.body.query = {"filtered":{"query":searchPart(),"filter":filter}};
        } else {
            query.body.query = searchPart();
        }
        
        $scope.metaResults = {};
        elastic.doSearch(query,function (results) {
            $scope.results = results.hits;
            $scope.facets = results.facets;
            $scope.numPages = Math.ceil(results.hits.total / $scope.pageSize);
            $scope.totalItems = results.hits.total;

            $scope.metaResults.totalShards = results._shards.total;
            if (results._shards.failed > 0) {
                $scope.metaResults.failedShards = results._shards.failed;
                $scope.metaResults.errors = [];
                angular.forEach(results._shards.failures, function(failure) {
                    $scope.metaResults.errors.push(failure.index + " - " + failure.reason);
                });
                
            }
        },function(errors) {
            $scope.metaResults.failedShards = 1;
            $scope.metaResults.errors = [];
            $scope.metaResults.errors.push(errors.error);
        });

    };

    $scope.addSearchField = function () {
        var searchField = {};
        searchField.field = $scope.search.advanced.newField;
        searchField.text = $scope.search.advanced.newText;
        $scope.search.advanced.searchFields.push(searchField);
    };

    $scope.removeSearchField = function (index) {
        $scope.search.advanced.searchFields.splice(index, 1);
    };

    $scope.openDialog = function () {
        var opts = {
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            templateUrl: 'template/dialog/facet.html',
            controller: 'FacetDialogCtrl',
            resolve: {fields: function () {
                return angular.copy($scope.fields)
            } }};
        var modalInstance = $modal.open(opts);
        modalInstance.result.then(function (result) {
            if (result) {
                $scope.search.facets.push(result);
            }
        }, function () {
            console.log('Modal dismissed at: ' + new Date());
        });
    };

    $scope.removeFacetField = function (index) {
        $scope.search.facets.splice(index, 1);
    };

    $scope.saveQuery = function () {
        queryStorage.saveSearch(angular.copy($scope.search));
    };

    $scope.loadQuery = function () {
        queryStorage.loadSearch(function (data) {
            $scope.search = angular.copy(data);
        });
    };

    $scope.addFilter = function (key, value) {
        if (!$scope.search.selectedFacets) {
            $scope.search.selectedFacets = [];
        }
        $scope.search.selectedFacets.push({"key": key, "value": value});
        $scope.doSearch();
    };

    $scope.checkSelectedFacet = function (key, value) {
        if (!$scope.search.selectedFacets) {
            return false;
        }
        for (var i = 0; i < $scope.search.selectedFacets.length; i++) {
            var selectedFacet = $scope.search.selectedFacets;
            if (selectedFacet[i].key === key && selectedFacet[i].value === value) {
                return true;
            }
        }
        return false;
    };

    $scope.removeFilter = function (key, value) {
        if (!$scope.search.selectedFacets) {
            return;
        }
        for (var i = 0; i < $scope.search.selectedFacets.length; i++) {
            var selectedFacet = $scope.search.selectedFacets;
            if (selectedFacet[i].key === key && selectedFacet[i].value === value) {
                $scope.search.selectedFacets.splice(i, 1);
            }
        }
        $scope.doSearch();
    };

    function searchPart() {
        var executedQuery;
        if ($scope.search.doAdvanced && $scope.search.advanced.searchFields.length > 0) {
            var tree = {};
            for (var i = 0; i < $scope.search.advanced.searchFields.length; i++) {
                var searchField = $scope.search.advanced.searchFields[i];
                var fieldForSearch = $scope.fields[searchField.field];
                recurseTree(tree, searchField.field, searchField.text);
                if (fieldForSearch.nestedPath) {
                    defineNestedPathInTree(tree, fieldForSearch.nestedPath, fieldForSearch.nestedPath);
                }
            }
            executedQuery = constructQuery(tree);

        } else if ($scope.search.simple && $scope.search.simple.length > 0) {
            var matchPart = {};
            matchPart.query = $scope.search.simple;

            executedQuery = {"match":{"_all":matchPart}};
        } else {
            executedQuery = {"matchAll": {}};
        }

        return executedQuery;
    }

    function constructQuery(tree) {
        var props = Object.getOwnPropertyNames(tree);
        var boolQuery = {};
        boolQuery.bool = {};
        boolQuery.bool.must = [];
        for (var i = 0; i < props.length; i++) {
            var prop = props[i];
            if (tree[prop] instanceof Object) {
                boolQuery.bool.must.push(constructQuery(tree[prop]));
            } else if (!(prop.substring(0, 1) === "_")) {
                var fieldName = prop;
                if (tree._nested) {
                    fieldName = tree._nested + "." + fieldName;
                }
                var matchQuery = {};
                matchQuery[fieldName] = tree[prop];
                boolQuery.bool.must.push({"match":matchQuery});
            }
        }

        var returnQuery;
        if (tree._nested) {
            var nestedQuery = {};
            nestedQuery.nested = {};
            nestedQuery.nested.path = tree._nested;
            nestedQuery.nested.query = boolQuery;
            returnQuery = nestedQuery;
        } else {
            returnQuery = boolQuery;
        }

        return returnQuery;
    }

    function defineNestedPathInTree(tree, path, nestedPath) {
        var pathItems = path.split(".");
        if (pathItems.length > 1) {
            defineNestedPathInTree(tree[pathItems[0]], pathItems.splice(1).join("."), nestedPath);
        } else {
            tree[path]._nested = nestedPath;
        }

    }

    function recurseTree(tree, newKey, value) {
        var newKeys = newKey.split(".");

        if (newKeys.length > 1) {
            if (!tree.hasOwnProperty(newKeys[0])) {
                tree[newKeys[0]] = {};
            }
            recurseTree(tree[newKeys[0]], newKeys.splice(1).join("."), value);
        } else {
            if (!tree.hasOwnProperty(newKey)) {
                tree[newKey] = value;
            }
        }
    }


    function filterChosenFacetPart() {

        if ($scope.search.selectedFacets && $scope.search.selectedFacets.length > 0) {
            var filterQuery = {};
            var selectedFacets = $scope.search.selectedFacets;
            var filters = [];
            for (var i = 0; i < selectedFacets.length; i++) {
                var facet = determineFacet(selectedFacets[i].key);
                var facetType = facet.facetType;
                if (facetType === "term") {
                    var termFilter = {"term":{}};
                    termFilter.term[selectedFacets[i].key] = selectedFacets[i].value;
                    filters.push(termFilter);
                } else if (facetType === "datehistogram") {
                    // TODO jettro, what are we going to do here ??
                } else if (facetType === "histogram") {
                    var rangeFilter = {"range":{}};
                    rangeFilter.range[selectedFacets[i].key] = {"from":selectedFacets[i].value,"to":selectedFacets[i].value + facet.interval};
                    filters.push(rangeFilter);
                }
            }
            filterQuery.and = filters;

            return filterQuery;
        }
        return null;
    }

    function determineFacet(key) {
        for (var i = 0; i < $scope.search.facets.length; i++) {
            var currentFacet = $scope.search.facets[i];
            if (currentFacet.field === key) {
                return currentFacet;
            }
        }
    }

    $scope.obtainFacetByKey = function (key) {
        for (var i = 0; i < $scope.search.facets.length; i++) {
            var currentFacet = $scope.search.facets[i];
            if (currentFacet.field === key) {
                return currentFacet;
            }
        }
        return null;
    }
}
SearchCtrl.$inject = ['$scope', 'elastic', 'configuration', 'facetBuilder', '$modal', 'queryStorage'];

function GraphCtrl($scope, $modal, elastic, facetBuilder) {
    $scope.indices = [];
    $scope.types = [];
    $scope.fields = [];
    $scope.results = [];

    /* Functions to retrieve values used to created the query */
    $scope.loadIndices = function () {
        elastic.indexes(function (data) {
            $scope.indices = data;
        });
    };

    $scope.loadTypes = function () {
        elastic.types([],function (data) {
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
            templateUrl: 'template/dialog/facet.html',
            controller: 'FacetDialogCtrl',
            resolve: {fields: function () {
                return angular.copy($scope.fields)
            } }};
        var d = $modal.open(opts);
        d.result.then(function (result) {
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
        var query = createQuery();

        elastic.doSearch(query,function (results) {
            $scope.results = getValue(results.facets);
        },function(errors) {
            console.log(errors);
        });

        // elastic.doSearch(request,function (results) {
        //     $scope.results = getValue(results.facets);
        // });

    };

    function createQuery() {
        var query = {};
        query.index = "";
        query.body = {};
        query.size = 0;
        query.body.query = {"matchAll":{}};
        var facets = [];
        facets.push($scope.facet);
        query.body.facets = facetBuilder.build(facets);

        return query;
    }

    $scope.loadIndices();
    $scope.loadTypes();
    $scope.loadFields();
}
GraphCtrl.$inject = ['$scope', '$modal', 'elastic', 'facetBuilder'];

function QueryCtrl($scope, $modal, elastic, facetBuilder, queryStorage) {
    $scope.fields = [];
    $scope.createdQuery = "";

    $scope.queryResults = [];
    $scope.facetResults = [];
    $scope.metaResults = {};
    $scope.queryFactory = {};
    $scope.query = {};

    $scope.query.chosenFields = [];
    $scope.query.facets = [];
    $scope.query.indices = {};
    $scope.query.types = {};

    // initialize pagination
    $scope.currentPage = 1;
    $scope.maxSize = 5;
    $scope.numPages = 0;
    $scope.pageSize = 10;
    $scope.totalItems = 0;

    $scope.changePage = function (pageNo) {
        $scope.currentPage = pageNo;
        $scope.executeQuery();
    };

    $scope.restartSearch = function() {
        $scope.currentPage = 1;
        $scope.numPages = 0;
        $scope.pageSize = 10;
        $scope.totalItems = 0;
        $scope.executeQuery();        
    };

    $scope.unbind = {};
    $scope.unbind.indicesScope = function () {
    };
    $scope.unbind.typesScope = function () {
    };

    /* Functions to retrieve values used to created the query */
    $scope.loadIndices = function () {
        $scope.unbind.indicesScope();
        elastic.indexes(function (data) {
            if (data) {
                for (var i = 0; i < data.length; i++) {
                    $scope.query.indices[data[i]] = {"name": data[i], "state": false};
                }
                $scope.unbind.indicesScope = $scope.$watch('query.indices', $scope.loadTypes, true);
            } else {
                $scope.query.indices = {};
            }
        });
    };

    $scope.loadTypes = function () {
        $scope.query.types = {};
        var selectedIndices = [];
        angular.forEach($scope.query.indices, function (index) {
            if (index.state) {
                selectedIndices.push(index.name);
            }
        });
        $scope.unbind.typesScope();
        elastic.types(selectedIndices, function (data) {
            if (data) {
                for (var i = 0; i < data.length; i++) {
                    $scope.query.types[data[i]] = {"name": data[i], "state": false};
                }
                $scope.unbind.typesScope = $scope.$watch('query.types', $scope.loadFields, true);
            } else {
                $scope.query.types = {};
            }
        });
    };

    $scope.loadFields = function () {
        var selectedIndices = [];
        angular.forEach($scope.query.indices, function (index) {
            if (index.state) {
                selectedIndices.push(index.name);
            }
        });

        var selectedTypes = [];
        angular.forEach($scope.query.types, function (type) {
            if (type.state) {
                selectedTypes.push(type.name);
            }
        });
        elastic.fields(selectedIndices, selectedTypes, function (data) {
            $scope.fields = data;
        });
    };

    /* Function to change the input for the query to be executed */
    $scope.addQueryField = function () {
        var i = $scope.query.chosenFields.indexOf($scope.queryFactory.addField);
        if (i == -1) {
            $scope.query.chosenFields.push($scope.queryFactory.addField);
        }
        $scope.changeQuery();
    };

    $scope.removeQueryField = function (index) {
        $scope.query.chosenFields.splice(index, 1);
        $scope.changeQuery();
    };

    $scope.removeFacetField = function (index) {
        $scope.query.facets.splice(index, 1);
        $scope.changeQuery();
    };

    /* Functions to create, reset and execute the query */
    $scope.executeQuery = function () {
        $scope.changeQuery();
        var request = createQuery();
        $scope.metaResults = {};

        elastic.doSearch(request,function (results) {
            $scope.queryResults = results.hits;
            $scope.facetResults = results.facets;
            $scope.numPages = Math.ceil(results.hits.total / $scope.pageSize);
            $scope.totalItems = results.hits.total;

            $scope.metaResults.totalShards = results._shards.total;
            if (results._shards.failed > 0) {
                $scope.metaResults.failedShards = results._shards.failed;
                $scope.metaResults.errors = [];
                angular.forEach(results._shards.failures, function(failure) {
                    $scope.metaResults.errors.push(failure.index + " - " + failure.reason);
                });
                
            }
        },function(errors) {
            $scope.metaResults.failedShards = 1;
            $scope.metaResults.errors = [];
            $scope.metaResults.errors.push(errors.error);
        });
    };

    $scope.resetQuery = function () {
        $scope.loadIndices();
        $scope.query.term = "";
        $scope.query.chosenIndices = [];
        $scope.query.chosenTypes = [];
        $scope.query.chosenFields = [];
        $scope.changeQuery();
        $scope.query.type = "or";
    };

    $scope.changeQuery = function () {
        $scope.createdQuery = JSON.stringify(createQuery().body,null,2);
    };

    $scope.openDialog = function () {
        var opts = {
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            templateUrl: 'template/dialog/facet.html',
            controller: 'FacetDialogCtrl',
            resolve: {fields: function () {
                return angular.copy($scope.fields)
            } }};
        var d = $modal.open(opts);
        d.result.then(function (result) {
            if (result) {
                $scope.query.facets.push(result);
                $scope.changeQuery();
            }
        });
    };

    $scope.saveQuery = function () {
        queryStorage.saveQuery(angular.copy($scope.query));
    };

    $scope.loadQuery = function () {
        queryStorage.loadQuery(function (data) {
            $scope.query = angular.copy(data);
            $scope.changeQuery();
        });
    };


    function createQuery() {
        var query = {};
        query.index = "";
        query.body = {};
        query.body.query = {};
        
        query.size = $scope.pageSize;
        query.from = ($scope.currentPage - 1) * $scope.pageSize;
        
        var chosenIndices = [];
        angular.forEach($scope.query.indices, function (value) {
            if (value.state) {
                chosenIndices.push(value.name);
            }
        });
        query.index = chosenIndices.toString();

        var chosenTypes = [];
        angular.forEach($scope.query.types, function (value) {
            if (value.state) {
                chosenTypes.push(value.name);
            }
        });
        query.type = chosenTypes.toString();

        if ($scope.query.chosenFields.length > 0) {
            query.fields = $scope.query.chosenFields.toString();
        }

        if ($scope.query.term.length > 0) {
            var matchPart = {};
            matchPart.query = $scope.query.term;
            if ($scope.query.type === 'phrase') {
                matchPart.type = "phrase";
            } else {
                matchPart.operator = $scope.query.type;
            }
            query.body.query.match = {"_all":matchPart};
        } else {
            query.body.query.matchAll = {};
        }

        query.body.facets = facetBuilder.build($scope.query.facets);

        query.body.explain = $scope.query.explain;
        if ($scope.query.highlight) {
            var highlight = {"fields":{}};
            angular.forEach($scope.query.chosenFields, function (value) {
                highlight.fields[value] = {};    
            });
            query.body.highlight = highlight;
        }
        return query;
    }
    this.errorCallback = function(errors) {
        console.log(errors);
    };

    $scope.resetQuery();
}
QueryCtrl.$inject = ['$scope', '$modal', 'elastic', 'facetBuilder', 'queryStorage'];

function NavbarCtrl($scope, $timeout, elastic) {
    $scope.statusCluster = {};
    $scope.serverUrl = elastic.obtainServerAddress();
    $scope.configureServerUrl = false;

    var items = $scope.items = [
        {title: 'Dashboard', link: 'dashboard'},
        {title: 'Search', link: 'search'},
        {title: 'Queries', link: 'query'},
        {title: 'Graphs', link: 'graph'},
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

    $scope.changeServerUrl = function () {
        elastic.changeServerAddress($scope.serverUrl);
    };

    $scope.initNavBar = function () {
        doCheckStatus();
    };

    function doCheckStatus() {
        elastic.clusterStatus(function (message, status) {
            $scope.statusCluster.message = message;
            $scope.statusCluster.state = status;
        });        
        $timeout(function() {
            doCheckStatus();
        }, 5000); // wait 5 seconds before calling it again
    }

    doCheckStatus();
}
NavbarCtrl.$inject = ['$scope', '$timeout', 'elastic'];

function FacetDialogCtrl($scope, $modalInstance, fields) {
    $scope.fields = fields;
    $scope.facetTypes = ["Term", "Range", "Histogram", "DateHistogram"];
    $scope.ranges = [];
    $scope.intervals = ["year", "month", "week", "day", "hour", "minute"];

    $scope.close = function (result) {
        var dialogResult = {};
        dialogResult.field = result.field;
        if (result.facettype === 'Term') {
            dialogResult.facetType = 'term';
        } else if (result.facettype === 'Range') {
            dialogResult.facetType = 'range';
            dialogResult.ranges = $scope.ranges;
        } else if (result.facettype === 'DateHistogram') {
            dialogResult.facetType = 'datehistogram';
            dialogResult.interval = result.interval;
        } else if (result.facettype === 'Histogram') {
            dialogResult.facetType = 'histogram';
            dialogResult.interval = result.interval;
        }
        $modalInstance.close(dialogResult);
    };

    $scope.addRangeField = function (data) {
        $scope.ranges.push([data.range.from, data.range.to]);
    }
}