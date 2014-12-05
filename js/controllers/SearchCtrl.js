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
        query.fields = $scope.configure.title + "," + $scope.configure.description;

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
