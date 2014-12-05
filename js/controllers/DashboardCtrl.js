/* Controllers */
function DashboardCtrl($scope, elastic) {
    $scope.health = {};
    $scope.nodes = [];
    $scope.plugins = [];
    $scope.serverUrl = "";

    $scope.removeIndex = function (index) {
        elastic.removeIndex(index, function () {
            indexDetails();
        });
    };

    $scope.openIndex = function (index) {
        elastic.openIndex(index, function () {
            indexDetails();
        });
    };

    $scope.closeIndex = function (index) {
        elastic.closeIndex(index, function () {
            indexDetails();
        });
    };

    function indexDetails() {
        elastic.indexesDetails(function (data) {
            $scope.indices = data;
        });
    }

    function refreshData() {
        $scope.serverUrl = elastic.obtainServerAddress();

        elastic.clusterHealth(function (data) {
            $scope.health = data;
        });

        elastic.clusterNodes(function (data) {
            $scope.nodes = data;
        });
    }

    $scope.$on('$viewContentLoaded', function () {
        indexDetails();
        refreshData();
    });
}
DashboardCtrl.$inject = ['$scope', 'elastic'];
