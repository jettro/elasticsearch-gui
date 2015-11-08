angular.module('guiapp').controller('CreateSnapshotCtrl',['$scope', '$modalInstance',
function ($scope, $modalInstance) {
    $scope.dialog = {"includeGlobalState":true,"ignoreUnavailable":false};

    $scope.close = function (result) {
        $modalInstance.close(result);
    };

}]);
