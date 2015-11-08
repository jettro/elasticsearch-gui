(function () {
    'use strict';

    angular
    .module('guiapp.services')
        .factory('configuration', LocalStorageService);

    LocalStorageService.$inject = ['$rootScope', 'localStorage', '$location'];

    function LocalStorageService($rootScope, localStorage, $location) {
        var LOCAL_STORAGE_ID = 'es-config';

        var service = {
            configuration:{},
            changeConfiguration: changeConfiguration
        };

        initConfiguration();

        return service;

        function initConfiguration() {
            var configurationString = localStorage[LOCAL_STORAGE_ID];
            if (configurationString) {
                changeConfiguration(JSON.parse(configurationString));
            } else {
                var host;
                if ($location.host() == 'www.gridshore.nl') {
                    host = "http://localhost:9200";
                } else {
                    host = $location.protocol() + "://" + $location.host() + ":" + $location.port();
                }

                changeConfiguration({
                    title: undefined,
                    description: undefined,
                    excludedIndexes: undefined,
                    serverUrl: host
                });
            }

            $rootScope.$watch(function () {
                return service.configuration;
            }, function () {
                localStorage[LOCAL_STORAGE_ID] = JSON.stringify(service.configuration);
            }, true);
        }

        function changeConfiguration(configuration) {
            service.configuration = configuration;
        }
    }
})();
