/*! elasticsearch-gui - v2.0.0 - 2015-11-05
* https://github.com/jettro/elasticsearch-gui
* Copyright (c) 2015 ; Licensed  */
//'use strict';

// Declare app level module which depends on filters, and services
var myApp = angular.module('myApp', ['ngRoute','myApp.filters', 'myApp.services', 'myApp.directives', 'myApp.controllers','ui.bootstrap','elasticsearch','gridshore.c3js.chart']).
        config(['$routeProvider', function ($routeProvider) {
            $routeProvider.when('/dashboard', {templateUrl: 'partials/dashboard.html', controller: 'DashboardCtrl'});
            $routeProvider.when('/node/:nodeId', {templateUrl: 'partials/node.html', controller: 'NodeInfoCtrl'});
            $routeProvider.when('/search', {templateUrl: 'partials/search.html', controller: 'SearchCtrl'});
            $routeProvider.when('/query', {templateUrl: 'partials/query.html', controller: 'QueryCtrl'});
            $routeProvider.when('/inspect', {templateUrl: 'partials/inspect.html', controller: 'InspectCtrl'});
            $routeProvider.when('/inspect/:index/:id', {templateUrl: 'partials/inspect.html', controller: 'InspectCtrl'});
            $routeProvider.when('/graph', {templateUrl: 'partials/graph.html', controller: 'GraphCtrl'});
            $routeProvider.when('/tools/suggestions', {templateUrl: 'partials/suggestions.html', controller: 'SuggestionsCtrl'});
            $routeProvider.when('/tools/whereareshards', {templateUrl: 'partials/whereareshards.html', controller: 'WhereShardsCtrl'});
            $routeProvider.when('/tools/snapshots', {templateUrl: 'partials/snapshots.html', controller: 'SnapshotsCtrl'});
            $routeProvider.when('/about', {templateUrl: 'partials/about.html'});
            $routeProvider.otherwise({redirectTo: '/dashboard'});
        }]);

myApp.value('localStorage', window.localStorage);

myApp.factory('$exceptionHandler',['$injector', function($injector) {
    return function(exception, cause) {
        console.log(exception);
        var errorHandling = $injector.get('errorHandling');
        errorHandling.add(exception.message);
        throw exception;
    };
}]);

var serviceModule = angular.module('myApp.services', []);
serviceModule.value('version', '2.0.0');

// TODO jettro: Come up with better separation. Create some actual modules
var controllerModule = angular.module('myApp.controllers',[]);
controllerModule.controller('AggregateDialogCtrl',['$scope', '$modalInstance', 'fields',
function ($scope, $modalInstance, fields) {
    $scope.fields = fields;
    $scope.aggsTypes = ["Term", "Range", "Histogram", "DateHistogram"];
    $scope.ranges = [];
    $scope.intervals = ["year", "month", "week", "day", "hour", "minute"];

    $scope.close = function (result) {
        var dialogResult = {};
        dialogResult.field = result.field;
        dialogResult.name = result.name;
        if (result.aggstype === 'Term') {
            dialogResult.aggsType = 'term';
        } else if (result.aggstype === 'Range') {
            dialogResult.aggsType = 'range';
            dialogResult.ranges = $scope.ranges;
        } else if (result.aggstype === 'DateHistogram') {
            dialogResult.aggsType = 'datehistogram';
            dialogResult.interval = result.interval;
        } else if (result.aggstype === 'Histogram') {
            dialogResult.aggsType = 'histogram';
            dialogResult.interval = result.interval;
        }
        $modalInstance.close(dialogResult);
    };

    $scope.addRangeField = function (data) {
        $scope.ranges.push([data.range.from, data.range.to]);
    }
}]);
controllerModule.controller('ChangeNumReplicasCtrl',['$scope', '$modalInstance', 'indexService',
function ($scope, $modalInstance, indexService) {
    $scope.dialog = {
        "numReplicas": indexService.numReplicas,
        "name": indexService.name
    };

    $scope.close = function (result) {
        $modalInstance.close(result);
    };

}]);
controllerModule.controller('ConfigDialogCtrl',['$scope', '$modalInstance', 'configuration',
function ($scope, $modalInstance, configuration){
    $scope.configuration = configuration;

    $scope.close = function (result) {
        $modalInstance.close($scope.configuration);
    };

}]);
controllerModule.controller('CreateSnapshotCtrl',['$scope', '$modalInstance',
function ($scope, $modalInstance) {
    $scope.dialog = {"includeGlobalState":true,"ignoreUnavailable":false};

    $scope.close = function (result) {
        $modalInstance.close(result);
    };

}]);

controllerModule.controller('CreateSnapshotRepositoryCtrl',['$scope', '$modalInstance',
function CreateSnapshotRepositoryCtrl ($scope, $modalInstance) {
    $scope.dialog = {};

    $scope.close = function (result) {
        $modalInstance.close(result);
    };

}])

controllerModule.controller('DashboardCtrl',['$scope', 'elastic', '$modal', 'indexService',
function ($scope, elastic,$modal,indexService) {
    $scope.health = {};
    $scope.nodes = [];
    $scope.plugins = [];
    $scope.serverUrl = "";

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

    $scope.openChangeReplicas = function (index) {
        indexService.name = index.name;
        if (!isNaN(parseInt(index.numReplicas)) && isFinite(index.numReplicas)) {
            indexService.numReplicas = parseInt(index.numReplicas);
        }

        var opts = {
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            templateUrl: 'template/dialog/numreplicas.html',
            controller: 'ChangeNumReplicasCtrl',
            resolve: {fields: function () {
                return angular.copy(indexService);
            }}
        };
        var modalInstance = $modal.open(opts);
        modalInstance.result.then(function (result) {
            if (result) {
                elastic.changeReplicas(result.name,result.numReplicas, function() {
                    indexDetails();
                });
            }
        }, function () {
            // Nothing to do here
        });
    };

    function indexDetails() {
        elastic.indexesDetails(function (data) {
            $scope.indices = data;
        });
    }

    function refreshData() {
        $scope.serverUrl = elastic.obtainServerAddress();

        elastic.clusterHealth(function (data) {
            $scope.health = data;
        });

        elastic.clusterNodes(function (data) {
            $scope.nodes = data;
        });
    }

    $scope.$on('$viewContentLoaded', function () {
        indexDetails();
        refreshData();
    });
}]);

controllerModule.controller('GraphCtrl',['$scope', '$modal', 'elastic', 'aggregateBuilder',
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

controllerModule.controller('InspectCtrl',['$scope', '$routeParams', '$location', 'elastic',
function ($scope, $routeParams, $location, elastic) {
    $scope.inspect = {};
    $scope.inspect.index = '';
    $scope.inspect.id = '';

    $scope.sourcedata = {};
    $scope.sourcedata.indices = [];

    if ($routeParams.id && $routeParams.index) {
        $scope.inspect.id = $routeParams.id;
        
        var query = {
            "index": $routeParams.index,
            "body": {
                "query": {
                    "match": {
                        "_id": $routeParams.id
                    }
                }
            },
            "size": 1
        };

        elastic.doSearch(query, function(result) {
            $scope.result = result.hits.hits[0];
        }, function(errors) {
            $scope.metaResults.failedShards = 1;
            $scope.metaResults.errors = [];
            $scope.metaResults.errors.push(errors.error);
        });
    }

    $scope.doInspect = function () {
        $location.path("/inspect/" + $scope.inspect.index.name + "/" + $scope.inspect.id);
    };

    $scope.loadIndices = function () {
        elastic.indexes(function (data) {
            if (data) {
                for (var i = 0; i < data.length; i++) {
                    $scope.sourcedata.indices[i] = {"name": data[i]};
                    if ($routeParams.index && $routeParams.index == data[i]) {
                        $scope.inspect.index = $scope.sourcedata.indices[i];
                    }
                }
            } else {
                $scope.sourcedata.indices = [];
            }
        });
    };

    $scope.loadIndices();
}]);

controllerModule.controller('NavbarCtrl',['$scope', '$timeout', '$modal', 'elastic', 'configuration',

function ($scope, $timeout, $modal, elastic, configuration) {
    $scope.statusCluster = {};
    $scope.serverUrl = elastic.obtainServerAddress();
    $scope.configureServerUrl = false;
    $scope.configure = configuration;

    var items = [];

    this.addItem = function (item) {
        items.push(item);
    };

    this.select = $scope.select = function (item) {
        angular.forEach(items, function (item) {
            item.selected = false;
        });
        item.selected = true;
    };

    this.selectByUrl = function (url) {
        angular.forEach(items, function (item) {
            if (item.link == url.split("/")[1]) {
                $scope.select(item);
            }
        });
    };

    $scope.changeServerUrl = function () {
        elastic.changeServerAddress($scope.serverUrl);
        configuration.excludedIndexes = $scope.configure.excludedIndexes;
    };

    $scope.openDialog = function () {
        var opts = {
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            templateUrl: 'template/dialog/config.html',
            controller: 'ConfigDialogCtrl',
            resolve: {fields: function () {
                return angular.copy(configuration);
            } }};
        var modalInstance = $modal.open(opts);
        modalInstance.result.then(function (result) {
            if (result) {
                elastic.changeServerAddress(result.serverUrl);
                configuration = angular.copy(result);
            }
        }, function () {
            // Nothing to do here
        });
    };

    $scope.initNavBar = function () {
        doCheckStatus();
    };

    function doCheckStatus() {
        elastic.clusterStatus(function (message, status) {
            $scope.statusCluster.message = message;
            $scope.statusCluster.state = status;
        });
        $timeout(function () {
            doCheckStatus();
        }, 5000); // wait 5 seconds before calling it again
    }

    doCheckStatus();
}
]);

controllerModule.controller('NodeInfoCtrl',['$scope', 'elastic', '$routeParams',
function NodeInfoCtrl($scope, elastic, $routeParams) {
    var nodeId = $routeParams.nodeId;
    elastic.nodeInfo(nodeId, function (data) {
        $scope.nodes = data;
    });
}]);

controllerModule.controller('NotificationCtrl',['$scope', '$timeout',
function ($scope, $timeout){
    $scope.alerts = {};

    $scope.$on('msg:notification', function (event, type, message) {
        var id = Math.random().toString(36).substring(2, 5);
        $scope.alerts[id] = {"type": type, "message": message};

        $timeout(function () {
            delete $scope.alerts[id];
        }, 10000);
    });
}]);

controllerModule.controller('QueryCtrl',['$scope', '$modal', '$location', 'elastic', 'aggregateBuilder', 'queryStorage',
function ($scope, $modal, $location, elastic, aggregateBuilder, queryStorage) {
    $scope.fields = [];
    $scope.createdQuery = "";

    $scope.queryResults = [];
    $scope.aggsResults = [];
    $scope.metaResults = {};
    $scope.queryFactory = {};
    $scope.query = {};

    $scope.query.chosenFields = [];
    $scope.query.aggs = {};
    $scope.query.indices = {};
    $scope.query.types = {};
    $scope.query.advanced = {};
    $scope.query.advanced.searchFields = [];
    $scope.query.advanced.newType = 'or';
    $scope.query.multiSearch=false;


    // initialize pagination
    $scope.currentPage = 1;
    $scope.maxSize = 5;
    $scope.numPages = 0;
    $scope.pageSize = 10;
    $scope.totalItems = 0;

    $scope.$watchCollection('query', function () {
        $scope.changeQuery();
    });

    $scope.changePage = function () {
        $scope.executeQuery();
    };

    $scope.restartSearch = function () {
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

    $scope.addAllQueryFields = function () {
        angular.forEach($scope.fields, function (value, key) {
            $scope.query.chosenFields.push(key);
        });
        $scope.changeQuery();
    };

    $scope.removeQueryField = function (index) {
        $scope.query.chosenFields.splice(index, 1);
        $scope.changeQuery();
    };

    $scope.addSearchField = function () {
        var searchField = {};
        searchField.field = $scope.query.advanced.newField;
        searchField.text = $scope.query.advanced.newText;
        searchField.type = $scope.query.advanced.newType;
        $scope.query.advanced.searchFields.push(searchField);
    };

    $scope.removeSearchField = function (index) {
        $scope.query.advanced.searchFields.splice(index, 1);
    };

    $scope.removeAggregateField = function (name) {
        delete $scope.query.aggs[name];
        $scope.changeQuery();
    };

    /* Functions to create, reset and execute the query */
    $scope.executeQuery = function () {
        $scope.changeQuery();
        var request = createQuery();
        $scope.metaResults = {};

        elastic.doSearch(request, function (results) {
            $scope.queryResults = results.hits;
            $scope.aggsResults = results.aggregations;
            $scope.numPages = Math.ceil(results.hits.total / $scope.pageSize);
            $scope.totalItems = results.hits.total;

            $scope.metaResults.totalShards = results._shards.total;
            if (results._shards.failed > 0) {
                $scope.metaResults.failedShards = results._shards.failed;
                $scope.metaResults.errors = [];
                angular.forEach(results._shards.failures, function (failure) {
                    $scope.metaResults.errors.push(failure.index + " - " + failure.reason);
                });

            }
        }, function (errors) {
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
        $scope.query.advanced = {};
        $scope.query.advanced.searchFields = [];
        $scope.query.advanced.newType = 'or';
        $scope.query.advanced.newText = null;
        $scope.query.advanced.newField = null;

        $scope.query.multiSearch=false;

        $scope.changeQuery();
        $scope.query.type = "or";
    };

    $scope.changeQuery = function () {
        $scope.createdQuery = JSON.stringify(createQuery().body, null, 2);
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
                $scope.query.aggs[result.name] = result;
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

    $scope.inspect = function(doc) {
        $location.path("/inspect/" + doc._index + "/" + doc._id);
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
        if ($scope.query.multiSearch && $scope.query.advanced.searchFields.length > 0) {
            var tree = {};
            for (var i = 0; i < $scope.query.advanced.searchFields.length; i++) {
                var searchField = $scope.query.advanced.searchFields[i];
                var fieldForSearch = $scope.fields[searchField.field];
                recurseTree(tree, searchField.field, searchField.text, searchField.type);
                if (fieldForSearch.nestedPath) {
                    defineNestedPathInTree(tree, fieldForSearch.nestedPath, fieldForSearch.nestedPath);
                }
            }
            query.body.query = constructQuery(tree);

        } else if ($scope.query.term.length > 0) {
            var matchPart = {};
            matchPart.query = $scope.query.term;
            if ($scope.query.type === 'phrase') {
                matchPart.type = "phrase";
            } else {
                matchPart.operator = $scope.query.type;
            }
            query.body.query.match = {"_all": matchPart};
        } else {
            query.body.query.matchAll = {};
        }

        query.body.aggs = aggregateBuilder.build($scope.query.aggs);

        query.body.explain = $scope.query.explain;
        if ($scope.query.highlight) {
            var highlight = {"fields": {}};
            angular.forEach($scope.query.chosenFields, function (value) {
                highlight.fields[value] = {};
            });
            query.body.highlight = highlight;
        }
        return query;
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
                matchQuery[fieldName] = {};
                matchQuery[fieldName].query = tree[prop];
                if ($scope.query.type === 'phrase') {
                    matchQuery[fieldName].type = "phrase";
                } else {
                    console.log(tree[prop] + '-' + tree['_type_'+prop]);
                    matchQuery[fieldName].operator = tree['_type_'+prop];
                }
                boolQuery.bool.must.push({"match": matchQuery});
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

    function recurseTree(tree, newKey, value, type) {
        var newKeys = newKey.split(".");

        if (newKeys.length > 1) {
            if (!tree.hasOwnProperty(newKeys[0])) {
                tree[newKeys[0]] = {};
            }
            recurseTree(tree[newKeys[0]], newKeys.splice(1).join("."), value, type);
        } else {
            if (!tree.hasOwnProperty(newKey)) {
                tree[newKey] = value;
                tree['_type_' + newKey] = type;
            }
        }
    }

    this.errorCallback = function (errors) {
        console.log(errors);
    };

    $scope.resetQuery();
}]);

controllerModule.controller('SearchCtrl',['$scope', 'elastic', 'configuration', 'aggregateBuilder', '$modal', 'queryStorage',
function ($scope, elastic, configuration, aggregateBuilder, $modal, queryStorage) {
    $scope.isCollapsed = true; // Configuration div
    $scope.configure = configuration;
    $scope.fields = [];
    $scope.search = {};
    $scope.search.advanced = {};
    $scope.search.advanced.searchFields = [];
    $scope.search.aggs = {};
    $scope.search.selectedAggs = [];

    $scope.configError = "";

    $scope.results = [];
    $scope.aggs = [];
    $scope.tokensPerField = [];

    // initialize pagination
    $scope.currentPage = 1;
    $scope.maxSize = 5;
    $scope.numPages = 0;
    $scope.pageSize = 10;
    $scope.totalItems = 0;

    $scope.changePage = function () {
        $scope.doSearch();
    };

    $scope.init = function () {
        // elastic.indexes(function (data) {
        //     // just to initialize the indices in the service
        //     // TODO would be better to move this to the service itself
        // });

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
    };

    $scope.restartSearch = function () {
        $scope.currentPage = 1;
        $scope.numPages = 0;
        $scope.pageSize = 10;
        $scope.totalItems = 0;
        $scope.tokensPerField = [];
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
        // query.fields = $scope.configure.title + "," + $scope.configure.description;

        query.size = $scope.pageSize;
        query.from = ($scope.currentPage - 1) * $scope.pageSize;

        query.body.aggs = aggregateBuilder.build($scope.search.aggs);
        var filter = filterChosenAggregatePart();
        if (filter) {
            query.body.query = {"filtered": {"query": searchPart(), "filter": filter}};
        } else {
            query.body.query = searchPart();
        }

        $scope.metaResults = {};
        elastic.doSearch(query, function (results) {
            $scope.results = results.hits;
            $scope.aggs = results.aggregations;
            $scope.numPages = Math.ceil(results.hits.total / $scope.pageSize);
            $scope.totalItems = results.hits.total;

            $scope.metaResults.totalShards = results._shards.total;
            if (results._shards.failed > 0) {
                $scope.metaResults.failedShards = results._shards.failed;
                $scope.metaResults.errors = [];
                angular.forEach(results._shards.failures, function (failure) {
                    $scope.metaResults.errors.push(failure.index + " - " + failure.reason);
                });

            }
        }, handleErrors);
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
            templateUrl: 'template/dialog/aggregate.html',
            controller: 'AggregateDialogCtrl',
            resolve: {fields: function () {
                return angular.copy($scope.fields)
            } }};
        var modalInstance = $modal.open(opts);
        modalInstance.result.then(function (result) {
            if (result) {
                $scope.search.aggs[result.name] = result;
            }
        }, function () {
            // Nothing to do here
        });
    };

    $scope.removeAggregateField = function (name) {
        delete $scope.search.aggs[name];
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
        if (!$scope.search.selectedAggs) {
            $scope.search.selectedAggs = [];
        }
        $scope.search.selectedAggs.push({"key": key, "value": value});
        $scope.doSearch();
    };

    $scope.addRangeFilter = function (key, from, to) {
        if (!$scope.search.selectedAggs) {
            $scope.search.selectedAggs = [];
        }
        $scope.search.selectedAggs.push({"key": key, "from": from, "to": to});
        $scope.doSearch();
    };

    $scope.checkSelectedAggregate = function (key, value) {
        if (!$scope.search.selectedAggs) {
            return false;
        }
        for (var i = 0; i < $scope.search.selectedAggs.length; i++) {
            var selectedAggregate = $scope.search.selectedAggs;
            if (selectedAggregate[i].key === key && selectedAggregate[i].value === value) {
                return true;
            }
        }
        return false;
    };

    $scope.checkSelectedRangeAggregate = function (key, from, to) {
        if (!$scope.search.selectedAggs) {
            return false;
        }
        for (var i = 0; i < $scope.search.selectedAggs.length; i++) {
            var selectedAggregate = $scope.search.selectedAggs;
            if (selectedAggregate[i].key === key && selectedAggregate[i].from === from && selectedAggregate[i].to === to) {
                return true;
            }
        }
        return false;
    };

    $scope.removeFilter = function (key, value) {
        if (!$scope.search.selectedAggs) {
            return;
        }
        for (var i = 0; i < $scope.search.selectedAggs.length; i++) {
            var selectedAggregate = $scope.search.selectedAggs;
            if (selectedAggregate[i].key === key && selectedAggregate[i].value === value) {
                $scope.search.selectedAggs.splice(i, 1);
            }
        }
        $scope.doSearch();
    };

    $scope.removeRangeFilter = function (key, from, to) {
        if (!$scope.search.selectedAggs) {
            return;
        }
        for (var i = 0; i < $scope.search.selectedAggs.length; i++) {
            var selectedAggregate = $scope.search.selectedAggs;
            if (selectedAggregate[i].key === key && selectedAggregate[i].from === from && selectedAggregate[i].to === to) {
                $scope.search.selectedAggs.splice(i, 1);
            }
        }
        $scope.doSearch();
    };

    $scope.obtainAggregateByKey = function (key) {
        for (var i = 0; i < $scope.search.aggs.length; i++) {
            var currentAggregate = $scope.search.aggs[i];
            if (currentAggregate.field === key) {
                return currentAggregate;
            }
        }
        return null;
    };

    $scope.showAnalysis = function (index, type, id) {
        $scope.tokensPerField = {"id": index+type+id};
        elastic.documentTerms(index, type, id, function (result) {
            $scope.tokensPerField.tokens = result;
        });
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
            executedQuery = {"simple_query_string": {"query": $scope.search.simple, "fields": ["_all"], "analyzer": "snowball"}};
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
                boolQuery.bool.must.push({"match": matchQuery});
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


    function filterChosenAggregatePart() {

        if ($scope.search.selectedAggs && $scope.search.selectedAggs.length > 0) {
            var filterQuery = {};
            var selectedAggs = $scope.search.selectedAggs;
            var filters = [];
            for (var i = 0; i < selectedAggs.length; i++) {
                var aggregate = $scope.search.aggs[selectedAggs[i].key];
                var aggregateType = aggregate.aggsType;
                if (aggregateType === "term") {
                    var termFilter = {"term": {}};
                    termFilter.term[$scope.search.aggs[selectedAggs[i].key].field] = selectedAggs[i].value;
                    filters.push(termFilter);
                } else if (aggregateType === "datehistogram") {
                    var fromDate = new Date(selectedAggs[i].value);
                    if (aggregate.interval === 'year') {
                        fromDate.setFullYear(fromDate.getFullYear() + 1);
                    } else if (aggregate.interval === 'month') {
                        fromDate.setMonth(fromDate.getMonth() + 1);
                    } else if (aggregate.interval === 'week') {
                        fromDate.setDate(fromDate.getDate() + 7);
                    } else if (aggregate.interval === 'day') {
                        fromDate.setDate(fromDate.getDate() + 1);
                    } else if (aggregate.interval === 'hour') {
                        fromDate.setHours(fromDate.getHours() + 1);
                    } else if (aggregate.interval === 'minute') {
                        fromDate.setMinutes(fromDate.getMinutes() + 1);
                    }
                    var rangeFilter = {"range": {}};
                    rangeFilter.range[$scope.search.aggs[selectedAggs[i].key].field] = {"from": selectedAggs[i].value, "to": fromDate.getTime()};
                    filters.push(rangeFilter);
                } else if (aggregateType === "histogram") {
                    var rangeFilter = {"range": {}};
                    var currentAgg = $scope.search.aggs[selectedAggs[i].key];
                    rangeFilter.range[currentAgg.field] = {"from": selectedAggs[i].value, "to": selectedAggs[i].value + currentAgg.interval - 1};
                    filters.push(rangeFilter);
                } else if (aggregateType === "range") {
                    var rangeFilter = {"range": {}};
                    var currentAgg = $scope.search.aggs[selectedAggs[i].key];
                    rangeFilter.range[currentAgg.field] = {"from": selectedAggs[i].from, "to": selectedAggs[i].to};
                    filters.push(rangeFilter);
                }
            }
            filterQuery.and = filters;

            return filterQuery;
        }
        return null;
    }

    function handleErrors(errors) {
        $scope.metaResults.failedShards = 1;
        $scope.metaResults.errors = [];
        if (errors.message && typeof errors.message === "object") {
            if (errors.message.hasOwnProperty('message')) {
                $scope.metaResults.errors.push(errors.message.message);
            }
        } else {
            $scope.metaResults.errors.push(errors.message);
        }
    }
}]);

controllerModule.controller('SnapshotsCtrl',['$scope', 'elastic', '$modal',
function ($scope, elastic, $modal) {
    $scope.repositories = [];
    $scope.selectedRepository = "";
    $scope.snapshots = [];
    $scope.snapshotsStatus = false;

    $scope.$watch('selectedRepository', function () {
        $scope.listSnapshots();
    });

    $scope.listRepositories = function() {
        elastic.snapshotRepositories(function(data) {
            $scope.repositories = data;
        });
    };

    $scope.selectRepository = function(name) {
        $scope.selectedRepository = name;
    };

    $scope.deleteRepository = function(name) {
        elastic.deleteRepository(name, function(data) {
            if ($scope.selectedRepository === name) {
                $scope.selectedRepository = "";
            }
            $scope.listRepositories();
        });
    };

    $scope.listSnapshots = function() {
        if ($scope.selectedRepository !== "") {
            elastic.obtainSnapshotStatus(function (snapshots) {
                if (snapshots.length > 0) {
                    $scope.snapshotsStatus = true;
                    $scope.snapshots = snapshots;

                } else {
                    elastic.obtainSnapshots($scope.selectedRepository, function (snapshots) {
                        $scope.snapshotsStatus = false;
                        $scope.snapshots = snapshots;
                    });
                }
            });
        }
    };

    $scope.removeSnapshot = function(snapshot) {
        elastic.removeSnapshot($scope.selectedRepository, snapshot, function() {
            $scope.listSnapshots();
        });
    };

    $scope.removeSnapshotFromRepository = function(repository,snapshot) {
        elastic.removeSnapshot(repository, snapshot, function() {
            $scope.listSnapshots();
        });
    };

    $scope.restoreSnapshot = function(snapshot) {
        elastic.restoreSnapshot($scope.selectedRepository, snapshot, function() {
            $scope.listSnapshots();
        });
    };

    $scope.openCreateSnapshot = function () {
        var opts = {
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            templateUrl: 'template/dialog/createsnapshot.html',
            controller: 'CreateSnapshotCtrl'
        };
        var modalInstance = $modal.open(opts);
        modalInstance.result.then(function (result) {
            if (result) {
                var newSnapshot = {};
                newSnapshot.repository = $scope.selectedRepository;
                if (result.name) {
                    newSnapshot.snapshot = result.name;
                } else {
                    var now = moment().format("YYYYMMDDHHmmss");
                    newSnapshot.snapshot = result.prefix + "-" + now;
                }
                newSnapshot.indices = result.indices;
                newSnapshot.ignoreUnavailable = result.ignoreUnavailable;
                newSnapshot.includeGlobalState = result.includeGlobalState;
                elastic.createSnapshot(newSnapshot, function() {
                    $scope.listSnapshots();
                });
            }
        }, function () {
            // Nothing to do here
        });
    };

    $scope.openCreateSnapshotRepository = function () {
        var opts = {
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            templateUrl: 'template/dialog/createsnapshotrepository.html',
            controller: 'CreateSnapshotRepositoryCtrl'
        };
        var modalInstance = $modal.open(opts);
        modalInstance.result.then(function (result) {
            if (result) {
                elastic.createRepository(result, function() {
                    $scope.listRepositories();
                    $scope.selectedRepository = "";
                });
            }
        }, function () {
            // Nothing to do here
        });
    };

    $scope.$on('$viewContentLoaded', function () {
        $scope.listRepositories();
    });
}]);

controllerModule.controller('SuggestionsCtrl',['$scope', 'elastic',
function ($scope, elastic) {
    $scope.suggest = {};
    $scope.suggest.index = '';
    $scope.suggest.field = '';
    $scope.suggest.query = '';
    $scope.suggest.min_word_length = 3;
    $scope.suggest.prefix_length = 1;

    $scope.sourcedata = {};
    $scope.sourcedata.indices = [];
    $scope.sourcedata.fields = [];

    $scope.results = {};

    $scope.unbind = {};
    $scope.unbind.indicesScope = function () {
    };

    $scope.doSuggest = function () {
        var request = {};
        request.index = $scope.suggest.index.name;
        request.field = $scope.suggest.field;
        request.query = $scope.suggest.query;
        request.min_word_length = $scope.suggest.min_word_length;
        request.prefix_length = $scope.suggest.prefix_length;

        elastic.suggest(request, function (result) {
            $scope.results = result;
        });
    };

    $scope.loadIndices = function () {
        $scope.unbind.indicesScope();
        elastic.indexes(function (data) {
            if (data) {
                for (var i = 0; i < data.length; i++) {
                    $scope.sourcedata.indices[i] = {"name": data[i]};
                }
                $scope.unbind.indicesScope = $scope.$watch('suggest.index', $scope.loadFields, true);
            } else {
                $scope.sourcedata.indices = [];
                $scope.sourcedata.fields = [];
            }
        });
    };

    $scope.loadFields = function () {
        var selectedIndices = [];
        if ($scope.suggest.index) {
            selectedIndices.push($scope.suggest.index.name);
        }

        var selectedTypes = [];

        elastic.fields(selectedIndices, selectedTypes, function (data) {
            $scope.sourcedata.fields = data;
        });
    };

    $scope.loadIndices();
}]);

controllerModule.controller('WhereShardsCtrl',['$scope', '$timeout', 'elastic',
function WhereShardsCtrl($scope, $timeout, elastic) {
    $scope.shardsInfo = {};
    $scope.nodeInfo = {};
    $scope.init = function () {
        obtainShardsInfo();
    };

    function obtainShardsInfo() {
        elastic.obtainShards(function (nodeInfo,data) {
            var nodes = {};
            angular.forEach(data, function (shards, indexName) {
                angular.forEach(shards.shards, function (shardArray,shardKey) {
                    angular.forEach(shardArray, function(shard) {
                        var desc;
                        if (shard.primary) {
                            desc = " (P)";
                        } else {
                            desc = " (R)";
                        }
                        if (!nodes[shard.node]) {
                            nodes[shard.node]={};
                        }
                        if (!nodes[shard.node][indexName]) {
                            nodes[shard.node][indexName]=[];
                        }
                        nodes[shard.node][indexName].push(shard.shard + desc)
                    });
                });
            });
            $scope.nodeInfo = nodeInfo;
            $scope.shardsInfo = nodes;
        });
        $timeout(function() {
            obtainShardsInfo();
        }, 5000);
    }
}]);

'use strict';

/* Directives */


angular.module('myApp.directives', ['myApp.controllers']).
        directive('appVersion', ['version', function (version) {
            return function (scope, elm, attrs) {
                elm.text(version);
            };
        }]).
        directive('navbar', ['$location', function ($location) {
            return {
                restrict: 'E',
                transclude: true,
                scope: {heading: '@'},
                controller: 'NavbarCtrl',
                templateUrl: 'template/navbar/navbar.html',
                replace: true,
                link: function ($scope, $element, $attrs, navbarCtrl) {
                    $scope.$location = $location;
                    $scope.$watch('$location.path()', function (locationPath) {
                        navbarCtrl.selectByUrl(locationPath)
                    });
                }
            }
        }]).
        directive('navbaritem', [function () {
            return {
                require:'^navbar',
                restrict: 'E',
                templateUrl: 'template/navbar/navbaritem.html',
                replace: true,
                scope:{"theLink":"@link","theTitle":"@title"},
                link: function ($scope, $element, $attrs, navbarCtrl) {
                    $scope.item={"title": $attrs['title'], "link": $attrs['link'], "selected": false};
                    navbarCtrl.addItem($scope.item);
                }
            }
        }]).
        directive('navbardropdownitem', [function () {
            return {
                require:'^navbar',
                restrict: 'E',
                scope:{"theLink":"@link","theTitle":"@title"},
                templateUrl: 'template/navbar/navbardropdownitem.html',
                replace: true,
                link: function ($scope, $element, $attrs, navbarCtrl) {
//                    $scope.item={"title": $attrs['title'], "link": $attrs['link'], "selected": false};
//                    navbarCtrl.addItem($scope.item);
                }
            }
        }]).
        directive('navbardropdown', [function () {
            return {
                require:'^navbar',
                restrict: 'E',
                transclude: true,
                scope:{"theTitle":"@title","theLink":"@link"},
                templateUrl: 'template/navbar/navbardropdown.html',
                replace: true,
                link: function ($scope, $element, $attrs, navbarCtrl) {
                    $scope.item={"title": $scope.theTitle, "link": $scope.theLink, "selected": false};
                    navbarCtrl.addItem($scope.item);
                }
            }
        }]).
        directive('ngConfirmClick', [
            function () {
                return {
                    link: function (scope, element, attr) {
                        var msg = attr.ngConfirmClick || "Are you sure?";
                        var clickAction = attr.confirmedClick;
                        element.bind('click', function (event) {
                            if (window.confirm(msg)) {
                                scope.$eval(clickAction)
                            }
                        });
                    }
                }
            }
        ]);


'use strict';

/* Filters */

angular.module('myApp.filters', []).
  filter('interpolate', ['version', function(version) {
    return function(text) {
      return String(text).replace(/\%VERSION\%/mg, version);
    }
  }]);

serviceModule.factory('aggregateBuilder', function () {
    function AggregateBuilder() {
        this.build = function (aggs) {
            var queryaggs = {};

            angular.forEach(aggs, function (aggregation, key) {
                if (aggregation.aggsType === 'term') {
                    queryaggs[aggregation.name] = {"terms": {"field": aggregation.field}};
                } else if (aggregation.aggsType === 'range') {
                    var ranges = [];
                    for (var j = 0; j < aggregation.ranges.length; j++) {
                        var range = aggregation.ranges[j];
                        if (range[0] == undefined) {
                            ranges.push({"to": range[1]})
                        } else if (range[1] == undefined) {
                            ranges.push({"from": range[0]})
                        } else {
                            ranges.push({"from": range[0], "to": range[1]});
                        }
                    }
                    queryaggs[aggregation.name] = {"range": {"field": aggregation.field, "ranges": ranges}};
                } else if (aggregation.aggsType === 'datehistogram') {
                    queryaggs[aggregation.name] = {"date_histogram": {"field": aggregation.field, "interval": aggregation.interval}};
                } else if (aggregation.aggsType === 'histogram') {
                    queryaggs[aggregation.name] = {"histogram": {"field": aggregation.field, "interval": aggregation.interval}};
                }
            });
            return queryaggs;
        }
    }

    return new AggregateBuilder();
});

serviceModule.factory('configuration', ['$rootScope', 'localStorage', '$location', function ($rootScope, localStorage, $location) {
    function LocalStorageService(localStorage) {
        var LOCAL_STORAGE_ID = 'es-config',
            configurationString = localStorage[LOCAL_STORAGE_ID];

        var configuration;
        if (configurationString) {
            configuration = JSON.parse(configurationString);
        } else {
            var host;
            if ($location.host() == 'www.gridshore.nl') {
                host = "http://localhost:9200";
            } else {
                host = $location.protocol() + "://" + $location.host() + ":" + $location.port();
            }

            configuration = {
                title: undefined,
                description: undefined,
                exludedIndexes: undefined,
                serverUrl: host
            };
        }

        $rootScope.$watch(function () {
            return configuration;
        }, function () {
            localStorage[LOCAL_STORAGE_ID] = JSON.stringify(configuration);
        }, true);

        return configuration;
    }

    return new LocalStorageService(localStorage);
}]);

serviceModule.factory('elastic', ['esFactory', 'configuration', '$q', '$rootScope', function (esFactory, configuration, $q, $rootScope) {
    function ElasticService(esFactory, configuration, $q, $rootScope) {
        var serverUrl = configuration.serverUrl;
        var statussus = {"green": "success", "yellow": "warning", "red": "error"};
        var es = createEsFactory();
        var activeIndexes = [];

        this.changeServerAddress = function (serverAddress) {
            serverUrl = serverAddress;
            es = createEsFactory();
            this.indexes();
        };

        this.obtainServerAddress = function () {
            return serverUrl;
        };

        this.clusterStatus = function (callback) {
            es.cluster.health({}).then(function (data) {
                var numClients = data.number_of_nodes - data.number_of_data_nodes;
                var msg = data.cluster_name + " [nodes: " + data.number_of_nodes + ", clients: " + numClients + "]";
                callback(msg, statussus[data.status]);
            }, function (reason) {
                callback("No connection", "error");
            });
        };

        this.clusterHealth = function (callback) {
            es.cluster.health().then(function (data) {
                callback(data);
            });
        };

        this.clusterNodes = function (callback) {
            es.nodes.info().then(function (data) {
                callback(data.nodes);
            });
        };

        this.obtainShards = function (callback) {
            es.cluster.state({"metric": ["routing_table", "nodes"]}).then(function (data) {
                callback(data.nodes, data.routing_table.indices);
            });
        };

        this.nodeInfo = function (nodeId, callback) {
            es.nodes.info({"nodeId": nodeId, "human": true}).then(function (data) {
                callback(data.nodes[nodeId]);
            });
        };

        this.indexes = function (callback) {
            es.cluster.state({"ignoreUnavailable": true}).then(function (data) {
                var indices = [];
                for (var index in data.metadata.indices) {
                    var ignored = indexIsNotIgnored(index);
                    if (indexIsNotIgnored(index)) {
                        indices.push(index);
                    }
                }
                activeIndexes = indices;
                if (callback) {
                    callback(indices);
                }
            });
        };

        this.removeIndex = function (index, callback) {
            es.indices.delete({"index": index}).then(function (data) {
                callback();
            });
        };

        this.openIndex = function (index, callback) {
            es.indices.open({"index": index}).then(function (data) {
                callback();
            });
        };

        this.closeIndex = function (index, callback) {
            es.indices.close({"index": index}).then(function (data) {
                callback();
            });
        };

        this.indexesDetails = function (callback) {
            es.indices.stats({"human": true, "recovery": false}).then(function (statusData) {
                var indexesStatus = statusData.indices;
                es.cluster.state({"metric": "metadata"}).then(function (stateData) {
                    var indexesState = stateData.metadata.indices;
                    var indices = [];
                    angular.forEach(indexesState, function (value, key) {
                        var newIndex = {};
                        newIndex.name = key;
                        if (value.state === 'open') {
                            if (indexesStatus[key]) {
                                newIndex.size = indexesStatus[key].total.store.size;
                                newIndex.numDocs = indexesStatus[key].total.docs.count;
                            } else {
                                newIndex.size = "unknown";
                                newIndex.numDocs = "unknown";
                            }
                            newIndex.state = true;
                            newIndex.numShards = value.settings.index.number_of_shards;
                            newIndex.numReplicas = value.settings.index.number_of_replicas
                        } else {
                            newIndex.state = false;
                        }
                        indices.push(newIndex);
                    });
                    callback(indices);
                });
            });
        };

        this.types = function (selectedIndex, callback) {
            var mappingFilter = {};
            if (selectedIndex.length > 0) {
                mappingFilter.index = selectedIndex.toString();
            }
            es.indices.getMapping(mappingFilter).then(function (data) {
                var myTypes = [];
                for (var index in data) {
                    if (indexIsNotIgnored(index)) {
                        for (var type in data[index].mappings) {
                            if (myTypes.indexOf(type) == -1 && type != "_default_") {
                                myTypes.push(type);
                            }
                        }
                    }
                }
                callback(myTypes);
            });
        };

        this.documentTerms = function (index, type, id, callback) {
            es.termvectors(
                {
                    "index": index,
                    "type": type,
                    "id": id,
                    "routing":id,
                    "body": {
                        "fields": ["*"],
                        "field_statistics": false,
                        "term_statistics": true
                    }
                })
                .then(function (result) {
                    var fieldTerms = {};
                    if (result.term_vectors) {
                        angular.forEach(result.term_vectors, function (value, key) {
                            var terms = [];
                            angular.forEach(value.terms, function (term, termKey) {
                                terms.push(termKey);
                            });
                            fieldTerms[key] = terms;
                        });
                        callback(fieldTerms);
                    }
                });
        };

        this.fields = function (selectedIndex, selectedType, callback) {
            var mappingFilter = {};
            if (selectedIndex.length > 0) {
                mappingFilter.index = selectedIndex.toString();
            }
            if (selectedType.length > 0) {
                mappingFilter.type = selectedType.toString();
            }
            es.indices.getMapping(mappingFilter).then(function (data) {
                var myTypes = [];
                var myFields = {};
                for (var index in data) {
                    if (indexIsNotIgnored(index)) {
                        for (var type in data[index].mappings) {
                            if (myTypes.indexOf(type) == -1 && type != "_default_") {
                                myTypes.push(type);
                                var properties = data[index].mappings[type].properties;
                                for (var field in properties) {
                                    handleSubfields(properties[field], field, myFields, undefined);
                                }
                            }
                        }
                    }
                }
                callback(myFields);
            });
        };

        this.changeReplicas = function (index, numReplicas, callback) {
            var changeSettings = {
                "index": index,
                "body": {
                    "index": {
                        "number_of_replicas": numReplicas
                    }
                }
            };
            es.indices.putSettings(changeSettings).then(function (data) {
                callback(data);
            }, logErrors);
        };

        this.snapshotRepositories = function (callback) {
            es.snapshot.getRepository().then(function (data) {
                callback(data);
            }, logErrors);
        };

        this.createRepository = function (newRepository, callback) {
            var createrepo = {
                "repository": newRepository.repository,
                "body": {
                    "type": "fs",
                    "settings": {
                        "location": newRepository.location
                    }
                }
            };
            es.snapshot.createRepository(createrepo).then(function (data) {
                callback();
            }, broadcastError);
        };

        this.deleteRepository = function (repository, callback) {
            es.snapshot.deleteRepository({"repository": repository}).then(function (data) {
                callback();
            }, broadcastError)
        };

        this.obtainSnapshots = function (repository, callback) {
            es.snapshot.get({"repository": repository, "snapshot": "_all"}).then(function (data) {
                callback(data.snapshots);
            }, logErrors);
        };

        this.obtainSnapshotStatus = function (callback) {
            es.snapshot.status().then(function (data) {
                callback(data.snapshots);
            }, logErrors);
        };

        this.removeSnapshot = function (repository, snapshot, callback) {
            es.snapshot.delete({"repository": repository, "snapshot": snapshot}).then(function (data) {
                callback();
            }, logErrors);
        };

        this.restoreSnapshot = function (repository, snapshot, callback) {
            es.snapshot.restore({"repository": repository, "snapshot": snapshot}).then(function (data) {
                callback();
            }, broadcastError);
        };

        this.createSnapshot = function (newSnapshot, callback) {
            var aSnapshot = {
                "repository": newSnapshot.repository,
                "snapshot": newSnapshot.snapshot,
                "body": {
                    "indices": newSnapshot.indices,
                    "ignore_unavailable": newSnapshot.ignoreUnavailable,
                    "include_global_state": newSnapshot.includeGlobalState
                }
            };
            es.snapshot.create(aSnapshot).then(function (data) {
                callback();
            }, logErrors);
        };

        function handleSubfields(field, fieldName, myFields, nestedPath) {
            if (field.hasOwnProperty("properties")) {
                var nested = (field.type == "nested" | field.type == "object");
                if (nested) {
                    nestedPath = fieldName;
                }
                for (var subField in field.properties) {
                    var newField = fieldName + "." + subField;
                    handleSubfields(field.properties[subField], newField, myFields, nestedPath);
                }
            } else {
                if (field.hasOwnProperty("fields")) {
                    for (var multiField in field.fields) {
                        var multiFieldName = fieldName + "." + multiField;
                        // TODO jettro : fix the nested documents with multi_fields
                        if (!myFields[multiFieldName] && fieldName !== multiField) {
                            myFields[multiFieldName] = field.fields[multiField];
                            myFields[multiFieldName].nestedPath = nestedPath;
                            myFields[multiFieldName].forPrint = multiFieldName + " (" + field.type + ")";
                        }
                    }
                }
                if (!myFields[fieldName]) {
                    myFields[fieldName] = field;
                    myFields[fieldName].nestedPath = nestedPath;
                    myFields[fieldName].type = field.type;
                    myFields[fieldName].forPrint = fieldName + " (" + field.type + ")";
                }
            }
        }

        this.doSearch = function (query, resultCallback, errorCallback) {
            if (query.index === "") {
                query.index = activeIndexes;
            }
            es.search(query).then(function (results) {
                resultCallback(results)
            }, function (errors) {
                errorCallback(errors)
            });
        };

        this.suggest = function (suggestRequest, resultCallback) {
            var suggest = {};
            suggest.index = suggestRequest.index;
            suggest.body = {};
            suggest.body.mysuggester = {};
            suggest.body.mysuggester.text = suggestRequest.query;
            suggest.body.mysuggester.term = {};
            suggest.body.mysuggester.term.field = suggestRequest.field;
            suggest.body.mysuggester.term.min_word_length = suggestRequest.min_word_length;
            suggest.body.mysuggester.term.prefix_length = suggestRequest.prefix_length;

            es.suggest(suggest).then(function (results) {
                var suggested = {};
                if (results.mysuggester) {
                    for (var i = 0; i < results.mysuggester.length; i++) {
                        var item = results.mysuggester[i];
                        suggested[item.text] = [];
                        for (var j = 0; j < item.options.length; j++) {
                            suggested[item.text].push(item.options[j].text);
                        }

                    }
                }

                resultCallback(suggested);
            }, logErrors);
        };

        function createEsFactory() {
            return esFactory({"host": serverUrl, "apiVersion": "2.0"});
        }

        function indexIsNotIgnored(index) {
            var ignore = false;
            if (configuration.includedIndexes && configuration.includedIndexes.length > 0) {
                ignore = true;
                var includedIndexes = (configuration.includedIndexes) ? configuration.includedIndexes.split(",") : [];
                angular.forEach(includedIndexes, function (includedIndex) {
                    var indexToCheck = includedIndex.trim();
                    if (index.substring(0, indexToCheck.length) === indexToCheck) {
                        ignore = false;
                    }
                });
            } else {
                var excludedIndexes = (configuration.excludedIndexes) ? configuration.excludedIndexes.split(",") : [];
                angular.forEach(excludedIndexes, function (excludedIndex) {
                    var indexToCheck = excludedIndex.trim();
                    if (index.substring(0, indexToCheck.length) === indexToCheck) {
                        ignore = true;
                    }
                });
            }

            return !ignore;
        }

        var logErrors = function (errors) {
            console.log(errors);
        };

        var broadcastError = function (error) {
            $rootScope.$broadcast('msg:notification', 'error', error.message);
        };

        // just to initialize the indices
        this.indexes();
    }

    return new ElasticService(esFactory, configuration, $q, $rootScope);
}]);

serviceModule.factory('errorHandling', ['$rootScope', function ($rootScope) {
    function ErrorHandling(rootScope) {
        this.add = function (message) {
            var errorMessage;
            if (message && typeof message === "object") {
                if (message.hasOwnProperty('message')) {
                    errorMessage = message.message;
                }
            } else {
                errorMessage = message;
            }
            rootScope.$broadcast('msg:notification', 'error', errorMessage);
        };
    }

    return new ErrorHandling($rootScope);
}]);

serviceModule.factory('indexService', [function () {
    function IndexService() {
        this.name = "unknown";
        this.numReplicas = 0;
    }

    return new IndexService();
}]);

serviceModule.factory('queryStorage', ['localStorage', function (localStorage) {
    function QueryStorage(localStorage) {
        var LOCAL_STORAGE_ID_QUERY = 'es-query';
        var LOCAL_STORAGE_ID_SEARCH = 'es-search';

        this.loadQuery = function (callback) {
            var query = localStorage[LOCAL_STORAGE_ID_QUERY];
            callback(JSON.parse(query));
        };

        this.saveQuery = function (query) {
            localStorage[LOCAL_STORAGE_ID_QUERY] = JSON.stringify(query);
        };

        this.loadSearch = function (callback) {
            var search = localStorage[LOCAL_STORAGE_ID_SEARCH];
            callback(JSON.parse(search));
        };

        this.saveSearch = function (search) {
            localStorage[LOCAL_STORAGE_ID_SEARCH] = JSON.stringify(search);
        };
    }

    return new QueryStorage(localStorage);
}]);

serviceModule.factory('serverConfig', ['$location', function ($location) {
    function ServerConfig(location) {
        if (location.host() == 'www.gridshore.nl') {
            this.host = "http://localhost:9200";
        } else {
            this.host = location.protocol() + "://" + location.host() + ":" + location.port();
        }
    }

    return new ServerConfig($location);
}]);
