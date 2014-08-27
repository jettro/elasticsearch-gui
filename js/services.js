'use strict';

/* Services */
var serviceModule = angular.module('myApp.services', []);
serviceModule.value('version', '1.1');

serviceModule.factory('elastic', ['esFactory', 'configuration', '$q', function (esFactory, configuration, $q) {
    function ElasticService(esFactory, configuration, $q) {
        var serverUrl = configuration.serverUrl;
        var statussus = {"green": "success", "yellow": "warning", "red": "error"};
        var es = createEsFactory();
        var activeIndexes = [];

        this.changeServerAddress = function (serverAddress) {
            serverUrl = serverAddress;
            es = createEsFactory();
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
                console.log(reason);
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

        this.obtainShards = function(callback) {
            es.cluster.state({"metric":["routing_table","nodes"]}).then(function(data) {
               callback(data.nodes,data.routing_nodes.nodes);
            });
        };

        this.nodeInfo = function (nodeId, callback) {
            es.nodes.info({"nodeId": nodeId, "human": true}).then(function (data) {
                callback(data.nodes[nodeId]);
            });
        };

        this.indexes = function (callback) {
            es.indices.status({"ignoreUnavailable": true}).then(function (data) {
                var indices = [];
                for (var index in data.indices) {
                    var ignored = indexIsNotIgnored(index);
                    if (indexIsNotIgnored(index)) {
                        indices.push(index);
                    }
                }
                activeIndexes = indices;
                callback(indices);
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
            es.indices.status({"human": true, "recovery": false}).then(function (statusData) {
                var indexesStatus = statusData.indices;

                es.indices.getSettings().then(function (settings) {
                    es.cluster.state({"metric": "metadata"}).then(function (stateData) {
                        var indexesState = stateData.metadata.indices;
                        var indices = [];
                        angular.forEach(indexesState, function (value, key) {
                            var newIndex = {};
                            newIndex.name = key;
                            if (value.state === 'open') {
                                newIndex.size = indexesStatus[key].index.size;
                                newIndex.numDocs = indexesStatus[key].docs.num_docs;
                                newIndex.state = true;
                                newIndex.numShards = settings[key].settings.index.number_of_shards;
                                newIndex.numReplicas = settings[key].settings.index.number_of_replicas
                            } else {
                                newIndex.state = false;
                            }
                            indices.push(newIndex);
                        });
                        callback(indices);
                    });
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

        this.documentTerms = function (index, type, id, fields, callback) {
            es.get({"index": index, "type": type, "id": id}).then(function (result) {
                var actions = [];
                var analyzedFields = [];
                for (var field in fields) {
                    if (fields[field].type === "string") {
                        var sourceField = field;
                        if (field.indexOf(".") > -1) {
                            sourceField = field.substr(0, field.indexOf("."));
                        }
                        var text = result._source[sourceField];
                        if (text) {
                            analyzedFields.push({"field": field, "value": text});
                            actions.push(es.indices.analyze({"field": field, "text": text, "index": index, "format": "text"}));
                        }
                    }
                }

                $q.all(actions).then(function (results) {
                    var i = 0;
                    while (i < analyzedFields.length) {
                        analyzedFields[i].tokens = results[i].tokens;
                        i++;
                    }
                    callback(analyzedFields);
                }, function (error) {
                    console.log(error);
                }, function (notify) {
                });
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
            }, function (errors) {
                console.log(errors);
            });
        };

        function createEsFactory() {
//            return esFactory({"host": serverUrl, "apiVersion":"1.0","sniffOnStart": false,"sniffInterval": 60000});
            return esFactory({"host": serverUrl, "apiVersion": "1.1"});
        }

        function indexIsNotIgnored(index) {
            var excludedIndexes = (configuration.excludedIndexes) ? configuration.excludedIndexes.split(",") : [];
            var ignore = false;
            angular.forEach(excludedIndexes, function (excludedIndex) {
                var indexToCheck = excludedIndex.trim();
                if (index.substring(0, indexToCheck.length) === indexToCheck) {
                    ignore = true;
                }
            });

            return !ignore;
        }
    }

    return new ElasticService(esFactory, configuration, $q);
}]);

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
