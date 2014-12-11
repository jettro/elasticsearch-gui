function CreateSnapshotCtrl ($scope, $modalInstance) {
    $scope.dialog = {"includeGlobalState":true,"ignoreUnavailable":false};

    $scope.close = function (result) {
        $modalInstance.close(result);
    };

}
CreateSnapshotCtrl.$inject = ['$scope', '$modalInstance'];
