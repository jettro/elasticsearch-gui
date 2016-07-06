(function() {
    'use strict';
    angular
        .module('guiapp.services', ['elasticsearch'])
        .value('version', '2.0.1')
        .run(runBlock);

    runBlock.$inject = ['configuration','elastic'];
    function runBlock(configuration, elastic) {
        configuration.loadConfiguration();
        elastic.initialise();
    }
})();
