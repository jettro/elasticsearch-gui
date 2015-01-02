serviceModule.factory('elastic', ['esFactory', 'configuration', '$q', '$rootScope', function (esFactory, configuration, $q, $rootScope) {
    function ElasticService(esFactory, configuration, $q, $rootScope) {
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
                }, logErrors, function (notify) {
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
        
        this.changeReplicas = function(index,numReplicas,callback) {
            var changeSettings = {
                "index":index,
                "body": {
                    "index": {
                        "number_of_replicas":numReplicas
                    }
                }
            };
            es.indices.putSettings(changeSettings).then(function(data){
                callback(data);
            }, logErrors);
        };

        this.snapshotRepositories = function(callback) {
            es.snapshot.getRepository().then(function(data) {
                callback(data);
            }, logErrors);
        };

        this.createRepository = function(newRepository,callback) {
            var createrepo = {
                "repository":newRepository.repository,
                "body": {
                    "type":"fs",
                    "settings": {
                        "location":newRepository.location
                    }
                }
            };
            es.snapshot.createRepository(createrepo).then(function(data) {
                callback();
            }, broadcastError);
        };

        this.deleteRepository = function(repository, callback) {
            es.snapshot.deleteRepository({"repository":repository}).then(function(data) {
                callback();
            }, broadcastError)
        };

        this.obtainSnapshots = function(repository,callback) {
            es.snapshot.get({"repository":repository,"snapshot":"_all"}).then(function(data){
                callback(data.snapshots);
            }, logErrors);
        };

        this.obtainSnapshotStatus = function(callback) {
            es.snapshot.status().then(function(data){
                callback(data.snapshots);
            }, logErrors);
        };

        this.removeSnapshot = function(repository,snapshot,callback) {
            es.snapshot.delete({"repository":repository,"snapshot":snapshot}).then(function(data) {
                callback();
            }, logErrors);
        };

        this.restoreSnapshot = function(repository,snapshot,callback) {
            es.snapshot.restore({"repository":repository,"snapshot":snapshot}).then(function(data) {
                callback();
            }, broadcastError);
        };

        this.createSnapshot = function(newSnapshot,callback) {
            var aSnapshot = {
                "repository":newSnapshot.repository,
                "snapshot":newSnapshot.snapshot,
                "body": {
                    "indices":newSnapshot.indices,
                    "ignore_unavailable":newSnapshot.ignoreUnavailable,
                    "include_global_state":newSnapshot.includeGlobalState
                }
            };
            es.snapshot.create(aSnapshot).then(function(data) {
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
            return esFactory({"host": serverUrl, "apiVersion": "1.4"});
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

        var logErrors = function(errors) {
            console.log(errors);
        };

        var broadcastError = function(error) {
            $rootScope.$broadcast('msg:notification', 'error', error.message);
        };
    }

    return new ElasticService(esFactory, configuration, $q, $rootScope);
}]);
