(function () {
    'use strict';

    angular
        .module('guiapp.navbar')
        .controller('ConfigDialogCtrl', ConfigDialogCtrl);

    ConfigDialogCtrl.$inject = ['$modalInstance', 'configuration'];

    function ConfigDialogCtrl($modalInstance, configuration) {
        var confVm = this;
        confVm.configuration = configuration;
        confVm.close = close;

        function close (result) {
            $modalInstance.close(confVm.configuration);
        }
    }
})();