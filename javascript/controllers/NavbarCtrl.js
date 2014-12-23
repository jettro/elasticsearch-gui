function NavbarCtrl($scope, $timeout, $modal, elastic, configuration) {
    $scope.statusCluster = {};
    $scope.serverUrl = elastic.obtainServerAddress();
    $scope.configureServerUrl = false;
    $scope.configure = configuration;

    var items = [];

    this.addItem = function (item) {
        items.push(item);
    };

    this.select = $scope.select = function (item) {
        angular.forEach(items, function (item) {
            item.selected = false;
        });
        item.selected = true;
    };

    this.selectByUrl = function (url) {
        angular.forEach(items, function (item) {
            if (item.link == url.split("/")[1]) {
                $scope.select(item);
            }
        });
    };

    $scope.changeServerUrl = function () {
        elastic.changeServerAddress($scope.serverUrl);
        configuration.excludedIndexes = $scope.configure.excludedIndexes;
    };

    $scope.openDialog = function () {
        var opts = {
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            templateUrl: 'template/dialog/config.html',
            controller: 'ConfigDialogCtrl',
            resolve: {fields: function () {
                return angular.copy(configuration);
            } }};
        var modalInstance = $modal.open(opts);
        modalInstance.result.then(function (result) {
            if (result) {
                elastic.changeServerAddress(result.serverUrl);
                configuration = angular.copy(result);
            }
        }, function () {
            // Nothing to do here
        });
    };

    $scope.initNavBar = function () {
        doCheckStatus();
    };

    function doCheckStatus() {
        elastic.clusterStatus(function (message, status) {
            $scope.statusCluster.message = message;
            $scope.statusCluster.state = status;
        });
        $timeout(function () {
            doCheckStatus();
        }, 5000); // wait 5 seconds before calling it again
    }

    doCheckStatus();
}
NavbarCtrl.$inject = ['$scope', '$timeout', '$modal', 'elastic', 'configuration'];
