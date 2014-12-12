function CreateSnapshotRepositoryCtrl ($scope, $modalInstance) {
    $scope.dialog = {};

    $scope.close = function (result) {
        $modalInstance.close(result);
    };

}
CreateSnapshotRepositoryCtrl.$inject = ['$scope', '$modalInstance'];
