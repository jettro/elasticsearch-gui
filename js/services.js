'use strict';

/* Services */
var serviceModule = angular.module('myApp.services', []);
serviceModule.value('version', '0.4');

serviceModule.factory('elastic', ['$http', 'serverConfig', 'ejsResource', function (http, serverConfig, ejsResource) {
    function ElasticService(http, serverConfig, ejsResource) {
        var serverUrl = serverConfig.host;
        var statussus = {"green": "success", "yellow": "warning", "red": "error"};
        var resource = ejsResource(serverUrl);

        this.changeServerAddress = function (serverAddress) {
            serverUrl = serverAddress;
            resource = ejsResource(serverUrl);
        };

        this.obtainServerAddress = function () {
            return serverUrl;
        };

        this.obtainEjsResource = function () {
            return resource;
        };

        this.clusterStatus = function (callback) {
            http({method: 'GET', url: serverUrl + '/_cluster/health'}).success(function (data) {
                var numClients = data.number_of_nodes - data.number_of_data_nodes;
                var msg = data.cluster_name + " [nodes: " + data.number_of_nodes + ", clients: " + numClients + "]";
                callback(msg, statussus[data.status]);
            }).error(function (data) {
                        callback("No connection", "error");
                    });
        };

        this.clusterName = function (callback) {
            http.get(serverUrl + '/_cluster/health').success(function (data) {
                callback(data.cluster_name);
            });
        };

        this.clusterHealth = function (callback) {
            http.get(serverUrl + '/_cluster/health').success(function (data) {
                callback(data);
            });
        };

        this.clusterNodes = function (callback) {
            http.get(serverUrl + '/_nodes').success(function (data) {
                callback(data.nodes);
            });
        };

        this.plugins = function (callback) {
            http.get(serverUrl + '/_nodes?plugin=true').success(function(data) {
                var nodes = [];
                angular.forEach(data.nodes, function (node,node_id) {
                    var siteNode = {};
                    siteNode.name = node.name;
                    siteNode.plugins = [];
                    var httpAddress = node.http_address.substring(6,node.http_address.length-1);
                    angular.forEach(node.plugins, function(plugin) {
                        if (plugin.site) {
                            var sitePlugin = {};
                            sitePlugin.url = 'http://'+ httpAddress + plugin.url;
                            sitePlugin.name = plugin.name;
                            siteNode.plugins.push(sitePlugin);
                        }
                    })
                    nodes.push(siteNode);
                });
                callback(nodes);
            });
        };

        this.nodeInfo = function (nodeId, callback) {
            http.get(serverUrl + '/_nodes/' + nodeId + '?all=true').success(function (data) {
                callback(data.nodes[nodeId]);
            });
        };

        this.indexes = function (callback) {
            http.get(serverUrl + '/_status').success(function (data) {
                var indices = [];
                for (var index in data.indices) {
                    indices.push(index);
                }
                callback(indices);
            });
        };

        this.removeIndex = function (index, callback) {
            http.delete(serverUrl + "/" + index).success(function (data) {
                callback();
            });
        };

        this.openIndex = function (index, callback) {
            http.post(serverUrl + "/" + index + "/_open").success(function (data) {
                callback();
            });
        };

        this.closeIndex = function (index, callback) {
            http.post(serverUrl + "/" + index + "/_close").success(function (data) {
                callback();
            });
        };

        this.indexesDetails = function (callback) {
            http.get(serverUrl + '/_status').success(function (statusData) {
                var indexesStatus = statusData.indices;
                http.get(serverUrl + '/_cluster/state?filter_routing_table=true&filter_nodes=true&filter_blocks=true').success(function(stateData) {
                    var indexesState = stateData.metadata.indices;
                    var indices = [];
                    angular.forEach(indexesState, function(value,key) {
                        var newIndex = {};
                        newIndex.name = key;
                        newIndex.numShards = value.settings['index.number_of_shards'];
                        if (value.state === 'open') {
                            newIndex.size = indexesStatus[key].index.size;
                            newIndex.numDocs = indexesStatus[key].docs.num_docs;
                            newIndex.state = true;
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
            var url = serverUrl;
            if (selectedIndex.length > 0) {
                url += "/" + selectedIndex.toString();
            }
            http.get(url + '/_mapping').success(function (data) {
                var myTypes = [];
                for (var index in data) {
                    for (var type in data[index]) {
                        if (myTypes.indexOf(type) == -1 && type != "_default_") {
                            myTypes.push(type);
                        }
                    }
                }
                callback(myTypes);
            });
        };

        this.fields = function (selectedIndex, selectedType, callback) {
            var url = serverUrl;
            if (selectedIndex.length > 0) {
                url += "/" + selectedIndex.toString();
            }
            if (selectedType.length > 0) {
                if (!selectedIndex.length > 0) {
                    url += "/*";
                }
                url += "/" + selectedType.toString();
            }
            http.get(url + '/_mapping').success(function (data) {
                var myTypes = [];
                var myFields = {};
                for (var index in data) {
                    /*
                     * Structure of result with one index is different from the other results. usually you first
                     * get the index, in this special case you immediately get the type.
                     */
                    if (index == selectedType) {
                        myTypes.push(index);
                        var properties = data[index].properties;
                        for (var field in properties) {
                            handleSubfields(properties[field], field, myFields, undefined);
                        }
                    } else {
                        for (var type in data[index]) {
                            if (myTypes.indexOf(type) == -1 && type != "_default_") {
                                myTypes.push(type);
                                var properties = data[index][type].properties;
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
                if (field.type === "multi_field") {
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
                    myFields[fieldName].forPrint = fieldName + " (" + field.type + ")";
                }
            }
        }
    }

    return new ElasticService(http, serverConfig, ejsResource);
}]);

serviceModule.factory('configuration', ['$rootScope', 'localStorage', function ($rootScope, localStorage) {
    function LocalStorageService(localStorage) {
        var LOCAL_STORAGE_ID = 'es-config',
                configurationString = localStorage[LOCAL_STORAGE_ID];

        var configuration = configurationString ? JSON.parse(configurationString) : {
            title: undefined,
            description: undefined
        };

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

serviceModule.factory('facetBuilder', function () {
    function FacetBuilder() {
        this.build = function (facets, ejs, request) {
            for (var i = 0; i < facets.length; i++) {
                var facet = facets[i];
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
                    var dateHistogramFacet = ejs.DateHistogramFacet(facet.field);
                    dateHistogramFacet.field(facet.field);
                    dateHistogramFacet.interval(facet.interval);
                    request.facet(dateHistogramFacet);
                } else if (facet.facetType === 'histogram') {
                    var histogramFacet = ejs.HistogramFacet(facet.field);
                    histogramFacet.field(facet.field);
                    histogramFacet.interval(facet.interval);
                    request.facet(histogramFacet);
                }
            }
        }
    }

    return new FacetBuilder();
});