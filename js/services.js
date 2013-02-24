'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
var serviceModule = angular.module('myApp.services', []);
serviceModule.value('version', '0.1');
serviceModule.factory('elastic', ['$http', function (http) {
    function ElasticService(http) {
        this.indexes = function (callback) {
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
                for (var index in data) { // wateenjuweeltje
                    for (var type in data[index]) { // blog-item
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

