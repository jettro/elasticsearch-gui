(function () {
    'use strict';

    angular
        .module('guiapp.services')
        .factory('configuration', LocalStorageService);

    LocalStorageService.$inject = ['localStorage', '$location'];

    function LocalStorageService(localStorage, $location) {
        var LOCAL_STORAGE_ID = 'es-config';

        var configuration = {};

        var service = {
            configuration: configuration,
            loadConfiguration: loadConfiguration,
            changeConfiguration: changeConfiguration,
            changeSearchConfiguration: changeSearchConfiguration
        };

        return service;

        function loadConfiguration() {
            var configurationString = localStorage[LOCAL_STORAGE_ID];
            if (configurationString) {
                var loadedConfiguration = JSON.parse(configurationString);
                doChangeConfiguration(loadedConfiguration);
                doChangeSearchConfiguration(loadedConfiguration);
            } else {
                var host;
                if ($location.host() == 'www.gridshore.nl') {
                    host = "http://localhost:9200";
                } else {
                    host = $location.protocol() + "://" + $location.host() + ":" + $location.port();
                }

                var emptyConfiguration = {
                    title: undefined,
                    description: undefined,
                    excludedIndexes: undefined,
                    includedIndexes: undefined,
                    serverUrl: host,
                    apiVersion: "2.0"
                };
                doChangeSearchConfiguration(emptyConfiguration);
                changeConfiguration(emptyConfiguration);
            }
        }

        function changeSearchConfiguration(configuration) {
            doChangeSearchConfiguration(configuration);
            localStorage[LOCAL_STORAGE_ID] = JSON.stringify(service.configuration);
        }
        
        function doChangeSearchConfiguration(configuration) {
            if (configuration.title && configuration.title.length > 0) {
                service.configuration.title = configuration.title;
            }
            if (configuration.description && configuration.description.length > 0) {
                service.configuration.description = configuration.description;
            }
        }

        function changeConfiguration(configuration) {
            doChangeConfiguration(configuration);
            localStorage[LOCAL_STORAGE_ID] = JSON.stringify(service.configuration);
        }
        
        function doChangeConfiguration(configuration) {
            service.configuration.excludedIndexes = configuration.excludedIndexes;
            service.configuration.includedIndexes = configuration.includedIndexes;
            service.configuration.serverUrl = configuration.serverUrl;
            service.configuration.apiVersion = configuration.apiVersion;
        }
    }
})();
