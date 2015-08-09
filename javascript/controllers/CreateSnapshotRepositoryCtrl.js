controllerModule.controller('CreateSnapshotRepositoryCtrl',['$scope', '$modalInstance',
function CreateSnapshotRepositoryCtrl ($scope, $modalInstance) {
    $scope.dialog = {};

    $scope.close = function (result) {
        $modalInstance.close(result);
    };

}])
