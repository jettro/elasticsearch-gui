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
    $scope.query.advanced = {};
    $scope.query.advanced.searchFields = [];
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
            // Check query type, if and use must else use should
            var tree = {};
            for (var i = 0; i < $scope.query.advanced.searchFields.length; i++) {
                var searchField = $scope.query.advanced.searchFields[i];
                var fieldForSearch = $scope.fields[searchField.field];
                recurseTree(tree, searchField.field, searchField.text);
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
                    matchQuery[fieldName].operator = $scope.query.type;
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

    this.errorCallback = function (errors) {
        console.log(errors);
    };

    $scope.resetQuery();
}
QueryCtrl.$inject = ['$scope', '$modal', 'elastic', 'aggregateBuilder', 'queryStorage'];
