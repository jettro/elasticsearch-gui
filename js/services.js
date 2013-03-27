'use strict';

/* Services */
var serviceModule = angular.module('myApp.services', []);
serviceModule.value('version', '0.1');

serviceModule.factory('elastic', ['$http', function (http) {
    function ElasticService(http) {

        this.clusterName = function (callback) {
            http.get('/_cluster/state').success(function (data) {
                callback(data.cluster_name);
            });
        };

        this.indexes = function (callback) {
            http.get('/_status').success(function (data) {
                var indices = [];
                for (var index in data.indices) {
                    indices.push(index);
                }
                callback(indices);
            });
        };

        this.indexesDetails = function (callback) {
            http.get('/_status').success(function (data) {
                callback(data.indices);
            });
        };

        this.types = function (callback) {
            http.get('/_mapping').success(function (data) {
                var myTypes = [];
                for (var index in data) {
                    for (var type in data[index]) {
                        if (myTypes.indexOf(type) == -1) {
                            myTypes.push(type);
                        }
                    }
                }
                callback(myTypes);
            });
        };

        this.fields = function (callback) {
            http.get('/_mapping').success(function (data) {
                var myTypes = [];
                var myFields = [];
                for (var index in data) {
                    for (var type in data[index]) {
                        if (myTypes.indexOf(type) == -1) {
                            myTypes.push(type);
                            var properties = data[index][type].properties;
                            for (var field in properties) {
                                if (myFields.indexOf(field) == -1) {
                                    myFields.push(field);
                                }
                            }
                        }
                    }
                }
                callback(myFields);
            });

        }
    }

    return new ElasticService(http);
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
        var LOCAL_STORAGE_ID = 'es-query';

        this.loadQuery = function (callback) {
            var query = localStorage[LOCAL_STORAGE_ID];
            callback(JSON.parse(query));
        };

        this.saveQuery = function (query) {
            localStorage[LOCAL_STORAGE_ID] = JSON.stringify(query);
        }
    }

    return new QueryStorage(localStorage);
}]);

serviceModule.factory('serverConfig', ['$location', function ($location) {
    function ServerConfig(location) {
        this.host = location.protocol() + "://" + location.host() + ":" + location.port();
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
        }
    }

    return new FacetBuilder();
});