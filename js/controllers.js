'use strict';

/* Controllers */
function DashboardCtrl($scope, elastic) {
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
}
DashboardCtrl.$inject = ['$scope', 'elastic'];

function NodeInfoCtrl($scope, elastic, $routeParams) {
    var nodeId = $routeParams.nodeId;
    elastic.nodeInfo(nodeId, function (data) {
        $scope.nodes = data;
    });
}
NodeInfoCtrl.$inject = ['$scope', 'elastic', '$routeParams'];

function SearchCtrl($scope, elastic, configuration, aggregateBuilder, $modal, queryStorage) {
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
        query.fields = $scope.configure.title + "," + $scope.configure.description

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
        elastic.documentTerms(index, type, id, $scope.fields, function (result) {
            $scope.tokensPerField = result;
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
}
SearchCtrl.$inject = ['$scope', 'elastic', 'configuration', 'aggregateBuilder', '$modal', 'queryStorage'];

function GraphCtrl($scope, $modal, elastic, aggregateBuilder) {
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
}
GraphCtrl.$inject = ['$scope', '$modal', 'elastic', 'aggregateBuilder'];

function QueryCtrl($scope, $modal, elastic, aggregateBuilder, queryStorage) {
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

    this.errorCallback = function (errors) {
        console.log(errors);
    };

    $scope.resetQuery();
}
QueryCtrl.$inject = ['$scope', '$modal', 'elastic', 'aggregateBuilder', 'queryStorage'];

function ToolCtrl($scope, elastic) {
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

    $scope.suggest = function () {
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
}
ToolCtrl.$inject = ['$scope', 'elastic'];

function WhereShardsCtrl($scope, $timeout, elastic) {
    $scope.shardsInfo = {};
    $scope.nodeInfo = {};
    $scope.init = function () {
        obtainShardsInfo();
    };

    function obtainShardsInfo() {
        elastic.obtainShards(function (nodeInfo,data) {
            var nodes = {};
            angular.forEach(data, function (shards, node) {
                var indices = {};
                angular.forEach(shards, function (shard) {
                    if (!indices[shard.index]) {
                        indices[shard.index] = [];
                    }
                    var desc;
                    if (shard.primary) {
                        desc = " (P)";
                    } else {
                        desc = " (R)";
                    }
                    indices[shard.index].push(shard.shard + desc)
                });
                nodes[node] = indices;
            });
            $scope.nodeInfo = nodeInfo;
            $scope.shardsInfo = nodes;
        });
        $timeout(function() {
            obtainShardsInfo();
        }, 5000);
    }
}
WhereShardsCtrl.$inject = ['$scope', '$timeout', 'elastic'];

function NavbarCtrl($scope, $timeout, $modal, elastic, configuration) {
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
NavbarCtrl.$inject = ['$scope', '$timeout', '$modal', 'elastic', 'configuration'];

function AggregateDialogCtrl($scope, $modalInstance, fields) {
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
}

function ConfigDialogCtrl($scope, $modalInstance, configuration) {
    $scope.configuration = configuration;

    $scope.close = function (result) {
        $modalInstance.close($scope.configuration);
    };

}

function NotificationCtrl($scope, $timeout) {
    $scope.alerts = {};

    $scope.$on('msg:notification', function (event, type, message) {
        var id = Math.random().toString(36).substring(2, 5);
        $scope.alerts[id] = {"type": type, "message": message};

        $timeout(function () {
            delete $scope.alerts[id];
        }, 5000);
    });
}